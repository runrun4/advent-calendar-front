import { supabase } from './supabase'

const AVATARS_BUCKET = 'avatars'

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

/** Supabase Storage `avatars` にアップロードし、API 用の avatarPath を返す */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const path = `${userId}/avatar.${extensionForFile(file)}`

  const { error } = await supabase.storage.from(AVATARS_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || 'image/jpeg',
    cacheControl: '3600',
  })

  if (error) {
    throw new Error(
      error.message ||
        'アイコン画像のアップロードに失敗しました。Storage の avatars バケット設定を確認してください。',
    )
  }

  return path
}
