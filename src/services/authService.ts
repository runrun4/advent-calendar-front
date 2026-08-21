import type { Session, User as SupabaseUser } from '@supabase/supabase-js'
import type { User } from '../types/user'
import { supabase } from './supabase'

export type RegisterResult = {
  user: User
  /** パスキー登録に成功したか（失敗しても登録自体は完了） */
  passkeyRegistered: boolean
}

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

/** メール＋パスワードでログイン */
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

/** パスキーでログイン（任意・あると楽） */
export async function loginWithPasskey(): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPasskey()
  if (error) throw error
  if (!data.user) throw new Error('パスキーログインに失敗しました')
  return mapUser(data.user)
}

/**
 * メール＋パスワードで新規登録する。
 * セッションがあればパスキー登録も試すが、失敗しても登録完了とする。
 */
export async function registerWithEmailPassword(
  email: string,
  password: string,
): Promise<RegisterResult> {
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

  const user = mapUser(data.user)
  const { error: passkeyError } = await supabase.auth.registerPasskey()

  return {
    user,
    passkeyRegistered: !passkeyError,
  }
}

/** ログイン済みユーザーが後からパスキーを追加する用 */
export async function registerPasskeyForCurrentUser(): Promise<void> {
  const { error } = await supabase.auth.registerPasskey()
  if (error) throw error
}

export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export { mapUser }
