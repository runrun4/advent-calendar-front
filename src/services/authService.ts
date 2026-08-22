import type { Session, User as SupabaseUser } from '@supabase/supabase-js'
import type { User } from '../types/user'
import { supabase } from './supabase'

function mapUser(supabaseUser: SupabaseUser): User {
  const meta = supabaseUser.user_metadata ?? {}

  return {
    id: supabaseUser.id,
    displayName:
      typeof meta.display_name === 'string' ? meta.display_name : '',
    iconUrl: typeof meta.icon_url === 'string' ? meta.icon_url : null,
    email: supabaseUser.email ?? null,
    isSetupComplete: meta.is_setup_complete === true,
  }
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export async function getAccessToken(): Promise<string | null> {
  const session = await getSession()
  return session?.access_token ?? null
}

export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) throw error
  if (!user) return null
  return mapUser(user)
}

export async function loginWithEmailPassword(
  email: string,
  password: string,
): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })
  if (error) throw error
  if (!data.user) throw new Error('ログインに失敗しました')
  return mapUser(data.user)
}

export async function registerWithEmailPassword(
  email: string,
  password: string,
): Promise<User> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  })
  if (error) throw error

  if (!data.session || !data.user) {
    throw new Error(
      'アカウントは作成されましたが、メール確認が有効なためまだログインできていません。Supabase Dashboard で Confirm email をオフにしてから再度お試しください。',
    )
  }

  return mapUser(data.user)
}

export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/** 個人情報（初回セットアップ）完了をユーザーメタデータに保存 */
export async function completeInitialSetup(
  displayName: string,
  iconUrl?: string | null,
): Promise<User> {
  const { data, error } = await supabase.auth.updateUser({
    data: {
      display_name: displayName,
      is_setup_complete: true,
      ...(iconUrl !== undefined ? { icon_url: iconUrl } : {}),
    },
  })
  if (error) throw error
  if (!data.user) throw new Error('セットアップの保存に失敗しました')
  return mapUser(data.user)
}

export { mapUser }
