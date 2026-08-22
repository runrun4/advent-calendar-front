import type { User } from '../types/user'
import { apiRequest } from './apiClient'

export type MeResponse = {
  id: string
  displayName: string
  avatarUrl: string | null
}

export async function getMe(): Promise<MeResponse> {
  return apiRequest<MeResponse>('/v1/me')
}

export async function updateMe(body: {
  displayName?: string
  avatarPath?: string | null
}): Promise<MeResponse> {
  return apiRequest<MeResponse>('/v1/me', {
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
