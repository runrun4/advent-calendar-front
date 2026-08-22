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

function getBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL
  if (raw == null || raw === '') return ''
  return raw.replace(/\/$/, '')
}

async function parseError(response: Response): Promise<ApiError> {
  let body: ApiErrorBody | null = null
  try {
    body = (await response.json()) as ApiErrorBody
  } catch {
    body = null
  }

  return new ApiError(body?.message ?? `API error (${response.status})`, {
    status: response.status,
    code: body?.code ?? 'UNKNOWN',
    traceId: body?.traceId ?? null,
  })
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  auth?: boolean
  signal?: AbortSignal
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
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

  const response = await fetch(`${getBaseUrl()}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    throw await parseError(response)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
