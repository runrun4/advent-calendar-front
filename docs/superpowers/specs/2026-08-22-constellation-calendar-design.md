# 星座アドベントカレンダー プロトタイプ 設計書

日付: 2026-08-22
対象: `advent-calendar-front/constellation-proto/`（検証用の独立 Vite プロトタイプ。フロントリポジトリ内に同居）
デザイン正: Claude Design カンバス「星座アドベントカレンダー」
（作業ファイル: `constellation-proto/design/` — `gen.mjs` に星座座標と配色トークンの正がある）

## 目的

イベントカレンダーの 5×6 マスグリッド UI を「星座をたどる」UI に置き換える案の
動きの検証。静的ルックはデザインカンバスで確定済み。ここでは
**スワイプのカメラ移動・開封演出・最終日のズームアウト**を動かして検証する。

## コアコンセプト（確定事項）

1. **その日の星だけを画面いっぱいに表示する**（1日1星のズームビュー）
2. **横スワイプ**で開封済みの星を線に沿って行き来できる
3. **期間中は星座の全体像を絶対に見せない**
   - 描画するのはフォーカス星とその前後の星・線分だけ
   - 未来方向はフォグで隠す。未開封の星は描画しない（次の星の予告スタブのみ可）
4. **30日目を開封すると**ズームアウトのアニメーションで初めて全体像が現れる
5. 開封タップの光の弾け（バースト）**だけ** WebGL。それ以外は SVG + CSS

## 技術方針

- Vite + React + TypeScript。フロントリポジトリ内の `constellation-proto/` に独立配置（本体ビルドとは無関係）
- 既存フロント `advent-calendar-front/` の流儀に合わせる（移植を容易にするため）:
  - コンポーネントごとの素の CSS ファイル + BEM 風クラス名（`star-view__hint--locked` 等）
  - named export、Props 型はコンポーネント先頭で `type Xxx = {...}`
  - 日本語コメント、セクション区切りコメント
  - 外部 UI ライブラリなし。アイコンは lucide-react（既存フロントと同じ）
- テーマは **CSS カスタムプロパティに全色を集約**。`themes/themes.css` に
  夜空（既定）とライト（現行トーン: #9ef581 / #b7e8a7 / #d9d9d9 / 白背景）の
  2 プリセット。`data-theme` 属性で切替
- フォント: Zen Maru Gothic（Google Fonts。本番は Mamelon 差し替え前提）

## ディレクトリ構成

```
constellation-proto/
  index.html / package.json / vite.config.ts / tsconfig*
  design/                     # 既存。デザインカンバスの作業ファイル（触らない）
  src/
    main.tsx / App.tsx
    types/constellation.ts    # AdventDay 互換 + DayState
    data/constellationLayout.ts  # 30星の座標・結び順（design/gen.mjs の STARS を正とする）
    data/mockDays.ts          # ダミー開封データ・各日のメッセージ/アイテム
    themes/themes.css
    hooks/useCamera.ts        # カメラ状態（中心座標・ズーム係数）とパン/ドリー遷移
    components/
      ConstellationCalendar.tsx/.css  # 画面本体（ヘッダー・進捗・ボタン類含む）
      StarField.tsx           # SVG 描画層（背景星・線・星・フォグ）
      DayContentCard.tsx      # 開封済みの内容カード
      ThemeSwitcher.tsx       # プロト用テーマ切替
      DebugPanel.tsx          # プロト用: 開封日数の変更・30日目ジャンプ・リセット
    effects/
      burst.ts                # WebGL パーティクルバースト（依存ゼロ・素の WebGL）
      burstFallback.ts        # WebGL 不可時の CSS フラッシュ
```

## データモデル

```ts
export type DayState = 'locked' | 'openable' | 'opened'

export type ConstellationDay = {
  day: number            // 1..30
  state: DayState
  content: { message: string; itemName: string } | null  // opened のみ
}
```

- 既存 `AdventDay`（day / isOpened / content）から一方向に変換できる形を保つ
- 開封は日付順。`openable` は常に「最小の未開封日」1つだけ
- プロトでは「今日」= openable 日として扱う（日付判定はモック）

## カメラモデル（動きの仕様）

SVG は星座座標系（390×520）をスクリーンへ射影する:
`screen = center + (star - camera) * k`

| 状態 | カメラ | k |
|------|--------|---|
| 日常ビュー（その日の星） | フォーカス星 | 3.8 |
| スワイプ移動中 | 線分上を補間 | 7.5 へドリーイン → 着地で 3.8 へ戻す |
| 最終日リビール | 星座の重心へ | 全体が収まる値（≈1.0）までズームアウト |

- スワイプ: Pointer Events で横ドラッグ量を線分上の進行度にマップ。
  離した時点で慣性つきで隣の星へスナップ（戻り側 or 進み側）。
  移動可能範囲は「開封済みの星 + openable の星」のみ
- 移動中は k を 3.8→7.5→3.8 とイージング（ドリー演出）。
  こうすると1画面に両方の星がちゃんと写る瞬間がなく、全体像が漏れない
- 描画対象: フォーカス星の前後 ±1 の星と、その間の線分のみ。
  それ以外の星・線は DOM に出さない（CSS 非表示ではなく描画しない。ネタバレ防止）
- フォグ: 進行方向（未来側）の画面端にグラデーションを常時オーバーレイ

## 開封フロー

1. openable の星（破線リング + 日数 + 「タップでひらく」）をタップ
2. `effects/burst.ts` を動的 import し `playOpenBurst({ x, y, color, onComplete })`
   - color は `getComputedStyle` で CSS 変数 `--star-color` から取得（テーマ二重管理禁止）
   - 全画面透明 canvas / pointer-events: none / 再生中のみ rAF ループ
   - 加算合成のポイントスプライト ~120粒 + 中心グロー。0.9s 程度
   - WebGL 非対応・コンテキスト喪失時は `burstFallback.ts`（CSS フラッシュ）
3. バーストと並行して SVG 側: 前の星からの線を stroke-dashoffset で伸ばし、
   星をシルエット→点灯（sparkle path + ハロー）へトランジション
4. 開封完了で内容カード（メッセージ + アイテム）がせり上がる
5. **30日目の場合**: カード表示のあと「全体公開」ボタン（または自動 1.5s 後）で
   フィナーレへ: 全星・全線を描画対象に追加し、カメラを重心へズームアウト、
   線は 1→30 の順に dashoffset で連鎖描画、最後に「星座が完成」バナー

## 画面レイアウト（デザインカンバス準拠）

- ヘッダー: 左上戻る / 右上設定・チャット（ダミー）、日付 `8/30`、タイトル
- 進捗: 右下寄せ `n / 30 opened`
- 右下フローティング: ギフトボタン（ダミー）
- 開封前の星: 破線軌道リング r64 + sparkle シルエット + 大きな日数
- 開封後の星: sparkle 塗り + 光条 + ハロー + `DAY n` 見出し
- 隣の星: 中サイズ + 日数ラベル。夜空の配色は design/gen.mjs の nightTheme が正

## やらないこと（YAGNI）

- 実データ接続・ルーティング・認証（すべてモック）
- 星座形状のエディタ、複数星座、週区切り
- 開封済み星の再演出（2回目タップは即カード表示）
- 本番 `advent-calendar-front` への組み込み（検証で合格してから別途）

## 受け入れ基準

1. 起動時: 9日目（openable）がズームビューで中央に表示され、全体像は見えない
2. 左スワイプ（戻る）で 8→7→…→1 と星をたどれる。移動中はドリーインで
   両端の星が同時に全景として見えない。1日目でそれ以上戻れない
3. openable の星をタップするとバースト → 線が伸びる → 点灯 → カード表示
4. DebugPanel で開封日数を 29 にして 30日目を開封するとズームアウトの
   フィナーレが再生され、全体像 + 「星座が完成」が表示される
5. テーマ切替で夜空 ⇔ ライトが即時切り替わる（WebGL バーストの色も追従）
6. `npm run build` が型エラーなしで通る

## 2026-08-23 改訂（Claude Design 改善版の反映）

`design/IMPLEMENTATION_NOTES.md` と `design/ConstellationCalendar.dc.html`（Claude Design 改善版のリファレンス実装）を
`constellation-proto/src` の React + TS 実装へ移植した。要点:

- **バグ修正**: スワイプを経路ベクトル射影に変更（`useCamera.onPointerMove` が (x, y) の2引数に）、
  星の描画を bigness 連続補間に統一して開封中/移動中/静止中の見た目の飛びを解消、
  フィナーレの連鎖進行度を `finaleT`（経過ms）単一ソースに統一、30日目の点灯漏れを修正、
  「星空にもどる」導線・ポインタ解放・タイマー一括clear・多重タップガードを追加
- **演出強化**: 3層パララックス背景 + シード固定またたき + 星雲3枚 + 流れ星3本、
  開封前の星の呼吸/拡散リング/回転軌道、開封済み星の光条回転、ドリー 3.8→6.4→3.8 の
  モーションブラー付きカメラワーク、フィナーレを4段構成（ズームアウト→連鎖描画→ブルーム→バナー）に拡張
- **バースト演出を WebGL → Canvas 2D へ置き換え**: `effects/burst.ts`/`burstFallback.ts` を削除し、
  `hooks/useBurstCanvas.ts` に一本化（白い閃光・衝撃波リング・光条・トレイル付き粒子の4レイヤー、1150ms）
- **ライトテーマを削除**: `ThemeSwitcher` を削除し、`themes.css` は夜空の hex 値を直接埋め込み。
  CSS変数はアクセントカラー `--star` の1本のみ残す
- **新機能「協力デイ」**: day 10 を鎖で縛り、参加者6人（モック）全員の書き込みで解放する
  フローを追加（`hooks/useCoopDay.ts`、`components/CoopDay.tsx`）。タップ/長押しでの内訳確認、
  確認カード、解放演出（弾ける→吸い込まれる鎖の破片）まで実装
- 星座の座標データ・数値定数は変更していない。SVG の `<text>` は React 実装ではそのまま使用（HTMLオーバーレイ化は不要）
