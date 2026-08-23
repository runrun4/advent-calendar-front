import { supabase } from './supabase'

const BEST_SHOTS_BUCKET = 'best-shots'

function extensionForFile(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName && /^[a-z0-9]+$/.test(fromName) && fromName.length <= 8) {
    return fromName
  }

  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  if (file.type === 'image/gif') return 'gif'
  return 'jpg'
}

/** eventId/userId/file の3階層。Storage RLSは2階層目の本人IDを検証する。 */
export async function uploadBestShot(
  eventId: string,
  userId: string,
  file: File,
): Promise<string> {
  const path = `${eventId}/${userId}/shot.${extensionForFile(file)}`
  const { error } = await supabase.storage
    .from(BEST_SHOTS_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type || 'image/jpeg',
      cacheControl: '3600',
    })

  if (error) {
    throw new Error(
      error.message || 'ベストショットのアップロードに失敗しました',
    )
  }

  return path
}
