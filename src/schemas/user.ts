import { z } from 'zod'
import { userSchema } from './common'

/** GET /v1/me・PATCH /v1/me のレスポンス（openapi.yaml の User）。 */
export const meResponseSchema = userSchema

export type MeResponse = z.infer<typeof meResponseSchema>
