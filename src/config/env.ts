import { z } from 'zod'

/**
 * ビルド時に埋め込まれる環境変数の検証。
 *
 * 値が壊れていてもアプリ自体は起動させたいので、検証に失敗したらログを出して
 * 安全な既定値へ倒す（Supabase の URL / 匿名キーは無いと何もできないため、
 * 従来どおり services/supabase.ts が起動時に throw する）。
 */
const envSchema = z.object({
  // 未設定なら同一オリジンへの相対パスで叩く。
  VITE_API_BASE_URL: z.string().default(''),
})

export type Env = z.infer<typeof envSchema>

const FALLBACK_ENV: Env = { VITE_API_BASE_URL: '' }

// 環境変数はビルド時に埋め込まれるので実行中に変わらない。fetch のたびに
// safeParse を回す意味は無いため、初回の評価結果を持ち回す（遅延初期化）。
let cachedEnv: Env | null = null
let cachedApiBaseUrl: string | null = null

export function getEnv(): Env {
  if (cachedEnv !== null) {
    return cachedEnv
  }

  const parsed = envSchema.safeParse(import.meta.env)
  if (!parsed.success) {
    console.error('環境変数の検証に失敗しました', parsed.error.issues)
    cachedEnv = FALLBACK_ENV
    return cachedEnv
  }

  cachedEnv = parsed.data
  return cachedEnv
}

/** API のベースURL。末尾のスラッシュは落とす。 */
export function getApiBaseUrl(): string {
  if (cachedApiBaseUrl === null) {
    cachedApiBaseUrl = getEnv().VITE_API_BASE_URL.replace(/\/$/, '')
  }
  return cachedApiBaseUrl
}

/**
 * キャッシュを捨てる。テスト専用。
 *
 * 本番では import.meta.env が動かないので呼ぶ必要は無いが、テストは
 * `vi.stubEnv` で環境変数を差し替えるため、その前後で明示的にリセットする。
 */
export function resetEnvCache(): void {
  cachedEnv = null
  cachedApiBaseUrl = null
}
