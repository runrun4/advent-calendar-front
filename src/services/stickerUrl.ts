/** Storage stickers バケット上の相対パスを公開URLにする。 */
export function resolveStickerImageUrl(imageUrlOrPath: string): string {
  const value = imageUrlOrPath.trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value

  const base = import.meta.env.VITE_SUPABASE_URL
  if (!base) return value

  const path = value.replace(/^\/+/, '')
  return `${String(base).replace(/\/$/, '')}/storage/v1/object/public/stickers/${path}`
}
