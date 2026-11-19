/**
 * Supabase Auth のエラーを利用者向けの日本語に言い換える。
 * 生のメッセージ(英語)は画面に出さない。未知のエラーは fallback を返す。
 */

type AuthErrorLike = {
  message?: unknown
  code?: unknown
  status?: unknown
}

const CODE_MESSAGES: Record<string, string> = {
  over_email_send_rate_limit:
    'メールの送信回数が上限に達しました。しばらく待ってからもう一度お試しください。',
  over_request_rate_limit:
    '操作が多すぎます。しばらく待ってからもう一度お試しください。',
  weak_password:
    'パスワードが推測されやすいため使えません。別のパスワードをお試しください。',
  same_password: '現在と同じパスワードは使えません。別のパスワードにしてください。',
  user_already_exists: 'このメールアドレスは登録できません。ログインをお試しください。',
  email_exists: 'このメールアドレスは登録できません。ログインをお試しください。',
  email_address_invalid: '有効なメールアドレスを入力してください。',
  email_not_confirmed:
    'メールアドレスの確認が済んでいません。届いたメールのリンクを開いてください。',
  invalid_credentials: 'メールアドレスまたはパスワードが正しくありません。',
  otp_expired:
    'リンクの有効期限が切れています。もう一度メールを送信してください。',
  session_not_found:
    'ログインの有効期限が切れています。もう一度メールのリンクを開いてください。',
  signup_disabled: '現在、新規登録を受け付けていません。',
}

export function toAuthErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback
  const { message, code, status } = error as AuthErrorLike

  if (typeof code === 'string' && CODE_MESSAGES[code]) {
    return CODE_MESSAGES[code]
  }
  if (status === 429) return CODE_MESSAGES.over_request_rate_limit

  if (typeof message === 'string') {
    const m = message.toLowerCase()
    if (m.includes('rate limit') || m.includes('too many')) {
      return CODE_MESSAGES.over_request_rate_limit
    }
    if (m.includes('invalid login credentials')) {
      return CODE_MESSAGES.invalid_credentials
    }
    if (m.includes('weak') || m.includes('password should be')) {
      return CODE_MESSAGES.weak_password
    }
    if (m.includes('should be different from the old password')) {
      return CODE_MESSAGES.same_password
    }
    if (m.includes('already registered')) return CODE_MESSAGES.user_already_exists
    if (m.includes('email not confirmed')) return CODE_MESSAGES.email_not_confirmed
    if (m.includes('failed to fetch') || m.includes('network')) {
      return '通信に失敗しました。接続を確認してもう一度お試しください。'
    }
    // 既に日本語に整えられたメッセージ(自前で投げた Error)はそのまま使う
    if (/[぀-ヿ一-鿿]/.test(message)) return message
  }
  return fallback
}
