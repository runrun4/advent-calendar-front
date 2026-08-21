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

/** パスキーでログイン（メール入力不要・discoverable credential） */
export async function loginWithPasskey(): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPasskey()
  if (error) throw error
  if (!data.user) throw new Error('パスキーログインに失敗しました')
  return mapUser(data.user)
}

/** 新規登録 Step1: メールに OTP を送る（セッション作成の前段） */
export async function sendRegisterOtp(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: {
      shouldCreateUser: true,
    },
  })
  if (error) throw error
}

/** 新規登録 Step2: OTP 検証でセッションを確立 */
export async function verifyRegisterOtp(
  email: string,
  token: string,
): Promise<User> {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: 'email',
  })
  if (error) throw error
  if (!data.user) throw new Error('認証コードの確認に失敗しました')
  return mapUser(data.user)
}

/**
 * 新規登録 Step3: 既存セッションがある状態でパスキーを登録
 * （ガイドどおり registerPasskey はログイン済み必須）
 */
export async function registerPasskeyForCurrentUser(): Promise<void> {
  const { error } = await supabase.auth.registerPasskey()
  if (error) throw error
}

export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export { mapUser }
