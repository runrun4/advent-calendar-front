import type { BestShot } from '../../services/eventApi'

/** imageUrl から保存パスを切り出すための Supabase Storage の公開URLの目印。 */
const PUBLIC_URL_MARKER = '/storage/v1/object/public/best-shots/'

/**
 * ボードへ貼るときに必要な Storage の保存パスを求める。
 *
 * サーバーが返す imagePath を正とし、無いときだけ imageUrl から逆算する。
 * 逆算はバックエンド未デプロイの間だけのフォールバックなので、
 * 全環境が imagePath を返すようになったら削除する。
 */
export function resolveBestShotImagePath(shot: BestShot): string {
  if (shot.imagePath) return shot.imagePath
  const index = shot.imageUrl.indexOf(PUBLIC_URL_MARKER)
  if (index < 0) return ''
  try {
    return decodeURIComponent(shot.imageUrl.slice(index + PUBLIC_URL_MARKER.length))
  } catch {
    return shot.imageUrl.slice(index + PUBLIC_URL_MARKER.length)
  }
}
