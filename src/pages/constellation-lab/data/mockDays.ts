// ==========================================
// プロト用ダミー開封データ
// ==========================================
import type { DayContent } from '../types/constellation'
import { MAX_DAYS } from './constellationLayout'

// 星のようす・アイテム名はメッセージのバリエーション用の材料
const STAR_MOODS = [
  'ちょっとまぶしいね',
  'しずかにまたたいている',
  'いつもよりあかるい',
  'すこしオレンジ色',
  'ふるえるくらい輝いてる',
  '遠くでちいさく光ってる',
]

const ITEM_NAMES = [
  'こんぺいとう', 'クッキー', 'キャンドル', 'リボン', 'オルゴール',
  'まつぼっくり', 'ガラス玉', 'どんぐり', 'ふうせん', 'ほしのかけら',
]

/** 各日のダミーメッセージ・アイテム名 (day1..MAX_DAYS) */
export const MOCK_CONTENTS: readonly DayContent[] = Array.from(
  { length: MAX_DAYS },
  (_, i) => {
    const day = i + 1
    const remain = MAX_DAYS - day
    const remainText =
      remain > 0 ? `たんじょうびまであと${remain}日。` : 'たんじょうび、おめでとう。'

    return {
      message: `${remainText}きょうの星は${STAR_MOODS[i % STAR_MOODS.length]}。`,
      itemName: `${ITEM_NAMES[i % ITEM_NAMES.length]}の星`,
    }
  }
)

/** プロト初期状態: ここまで開封済み (design/gen.mjs の OPENED に合わせる) */
export const INITIAL_OPENED_COUNT = 8
