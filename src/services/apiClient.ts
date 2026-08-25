import type { z } from 'zod'
import { getApiBaseUrl } from '../config/env'
import { apiErrorResponseSchema } from '../schemas/common'
import { getAccessToken } from './authService'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly traceId: string | null

  constructor(
    message: string,
    options: { status: number; code: string; traceId?: string | null },
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = options.status
    this.code = options.code
    this.traceId = options.traceId ?? null
  }
}

type ApiErrorBody = {
  code?: string
  message?: string
  traceId?: string
}

async function parseError(response: Response): Promise<ApiError> {
  let body: unknown
  try {
    body = await response.json()
  } catch {
    body = null
  }

  const parsed = apiErrorResponseSchema.safeParse(body)
  if (parsed.success) {
    return new ApiError(parsed.data.message, {
      status: response.status,
      code: parsed.data.code,
      traceId: parsed.data.traceId,
    })
  }

  // 契約どおりでないエラー本文（プロキシの HTML など）でも握り潰さず、
  // 取れるものだけ拾って ApiError にする。
  const fallback = (body ?? null) as ApiErrorBody | null
  return new ApiError(fallback?.message ?? `API error (${response.status})`, {
    status: response.status,
    code: fallback?.code ?? 'UNKNOWN',
    traceId: fallback?.traceId ?? null,
  })
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  auth?: boolean
  signal?: AbortSignal
}

export type ApiResponse<T> = {
  data: T
  /** HTTPステータス。200/201の違いで分岐する API があるため保持する。 */
  status: number
}

export async function apiRequestWithStatus<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, auth = true, signal } = options
  const headers = new Headers()

  if (body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  if (auth) {
    const token = await getAccessToken()
    if (!token) {
      throw new ApiError('ログインが必要です。', {
        status: 401,
        code: 'UNAUTHENTICATED',
      })
    }
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    throw await parseError(response)
  }

  if (response.status === 204) {
    return { data: undefined as T, status: response.status }
  }

  let data: unknown
  try {
    data = await response.json()
  } catch {
    throw new ApiError('サーバーから不正な応答を受信しました。', {
      status: response.status,
      code: 'UNKNOWN',
    })
  }
  return { data: data as T, status: response.status }
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { data } = await apiRequestWithStatus<T>(path, options)
  return data
}

/**
 * apiRequestWithStatus に「レスポンスの実行時検証」を足したもの。
 *
 * `as T` のキャストは型が合っている前提でしか正しくないので、契約と違う応答が
 * 来たときは画面の奥で undefined を触って落ちる。ここで境界を守り、形が違えば
 * その場で ApiError にする。
 *
 * 移行していないサービスは apiRequest / apiRequestWithStatus を使い続けてよい。
 */
export async function apiRequestValidatedWithStatus<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const { data, status } = await apiRequestWithStatus<unknown>(path, options)
  const parsed = schema.safeParse(data)

  if (!parsed.success) {
    console.error('APIレスポンスが契約と一致しません', {
      path,
      status,
      issues: parsed.error.issues,
    })
    throw new ApiError('サーバーから不正な応答を受信しました。', {
      status,
      code: 'UNKNOWN',
    })
  }

  return { data: parsed.data, status }
}

export async function apiRequestValidated<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestOptions = {},
): Promise<T> {
  const { data } = await apiRequestValidatedWithStatus(path, schema, options)
  return data
}
