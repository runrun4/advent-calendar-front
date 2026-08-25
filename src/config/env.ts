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

export function getEnv(): Env {
  const parsed = envSchema.safeParse(import.meta.env)
  if (!parsed.success) {
    console.error('環境変数の検証に失敗しました', parsed.error.issues)
    return FALLBACK_ENV
  }

  return parsed.data
}

/** API のベースURL。末尾のスラッシュは落とす。 */
export function getApiBaseUrl(): string {
  return getEnv().VITE_API_BASE_URL.replace(/\/$/, '')
}
