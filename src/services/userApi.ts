import type { User } from '../types/user'
import {
  completeInitialSetup,
  getCurrentUser,
  mapUser,
} from './authService'
import { apiRequestValidated } from './apiClient'
import { uploadAvatar } from './avatarStorage'
import { supabase } from './supabase'
import { meResponseSchema, type MeResponse } from '../schemas/user'

export type { MeResponse }

export async function getMe(): Promise<MeResponse> {
  return apiRequestValidated('/v1/me', meResponseSchema)
}

export async function updateMe(body: {
  displayName?: string
  avatarPath?: string | null
}): Promise<MeResponse> {
  return apiRequestValidated('/v1/me', meResponseSchema, {
    method: 'PATCH',
    body,
  })
}

/** Supabase ユーザー情報にバックエンドのプロフィールを反映する */
export function mergeMeIntoUser(user: User, me: MeResponse): User {
  return {
    ...user,
    id: me.id || user.id,
    displayName: me.displayName || user.displayName,
    iconUrl: me.avatarUrl ?? user.iconUrl,
  }
}

/** 初回セットアップ: ニックネーム + 任意のアイコンを backend / Auth に保存 */
export async function saveInitialProfile(input: {
  displayName: string
  avatarFile?: File | null
}): Promise<User> {
  const displayName = input.displayName.trim()
  if (!displayName || displayName.length > 40) {
    throw new Error('ニックネームは1〜40文字で入力してください')
  }

  const current = await getCurrentUser()
  if (!current) {
    throw new Error('ログインが必要です。')
  }

  let avatarPath: string | undefined
  if (input.avatarFile) {
    avatarPath = await uploadAvatar(current.id, input.avatarFile)
  }

  const me = await updateMe({
    displayName,
    ...(avatarPath !== undefined ? { avatarPath } : {}),
  })

  const authUser = await completeInitialSetup(displayName, me.avatarUrl)
  return {
    ...mergeMeIntoUser(authUser, me),
    isSetupComplete: true,
  }
}

/** プロフィール編集: ニックネーム + 任意のアイコン更新 */
export async function updateProfile(input: {
  displayName: string
  avatarFile?: File | null
}): Promise<User> {
  const displayName = input.displayName.trim()
  if (!displayName || displayName.length > 40) {
    throw new Error('ニックネームは1〜40文字で入力してください')
  }

  const current = await getCurrentUser()
  if (!current) {
    throw new Error('ログインが必要です。')
  }

  let avatarPath: string | undefined
  if (input.avatarFile) {
    avatarPath = await uploadAvatar(current.id, input.avatarFile)
  }

  const me = await updateMe({
    displayName,
    ...(avatarPath !== undefined ? { avatarPath } : {}),
  })

  const { data, error } = await supabase.auth.updateUser({
    data: {
      display_name: me.displayName,
      ...(me.avatarUrl != null ? { icon_url: me.avatarUrl } : {}),
    },
  })
  if (error) throw error

  const authUser = data.user ? mapUser(data.user) : current
  return {
    ...mergeMeIntoUser(authUser, me),
    email: current.email ?? authUser.email,
    isSetupComplete: current.isSetupComplete || authUser.isSetupComplete,
  }
}
