# 星座アドベントカレンダー 引き継ぎメモ

最終更新: 2026-08-23

## いまの状態

- **PR**: [#50](https://github.com/runrun4/advent-calendar-front/pull/50)（`feature/constellation-proto` → `develop`、未マージ）
  - マージ時は **squash 推奨**
- **検証 URL**: `/constellation-proto/`（Debug あり）
- **本体イベント画面**: `ConstellationCalendar` 組み込み済み
  - テーマ: **この画面だけ夜空**
  - `isEventDetailOpen` で PageSwipe 無効
  - 開封状態は **バックエンドの DayState**（OPENED / AVAILABLE / LOCKED）に同期（連続開封の仮モデルは Debug／検証ページのみ）
  - 日数は `visibleDayCount` / calendar.days.length（最大30）
  - 開封・協力の「書く」は `POST .../open`、再表示は `GET .../days/{id}`
  - 鎖リング数は `memberTotal` 可変
  - 本体では Debug 非表示・Mamelon 継承。検証ページは維持
  - **将来日（LOCKED）へはスワイプで進めない**（opened / openable の最大日まで。2026-08-23 にプロダクトオーナー判断で方針1に確定）

## 直近で入れたこと（2026-08-23）

### 本体組み込み〜API 同期

- `EventMainPage` で旧 `AdventCalendar` の代わりに `ConstellationCalendar` を使用
- `calendarBridge.ts` で DayState マッピング（OPENED→opened / AVAILABLE→openable / 他→locked）
- 星の数を `visibleDayCount` に合わせて可変
- 開封済みカードを `GET .../days/{id}` で再取得
- 協力デイの鎖リング数を `memberTotal` 可変に

### イベントごとに固有の星座の形（2026-08-23）

- `data/constellationLayout.ts` に `ConstellationLayout` 型を導入。星の座標と派生値
  （重心 / フィナーレのズーム係数 `finaleK` / 累積長）を1つのオブジェクトにまとめた
- `data/constellationGenerator.ts` を追加。イベント ID をシードにした決定的 PRNG
  （FNV-1a + mulberry32）でランダムウォークし、任意の日数 N に対して固有の形を生成する
  - 星座座標系 390×520・余白40px、ステップ 36〜56、折れ角 ±75°（境界補正込みで最大 ±110°）、
    最小間隔 30px。候補が尽きたら間隔22px・ステップ72pxまで緩めて採用する
  - **星座らしさ（美的な形）の追求は今回なし**（プロダクトオーナー判断）。破綻しないことが条件
- `eventId` があれば生成、無ければ検証ページの Debug シード、それも空なら手作り30点
  （= デザインの正）を使う
- 検証ページの Debug に「星座シード」入力と「日数」スライダー（1〜30）を追加

### 殻 (app-shell) を夜空と地続きに（2026-08-23）

- 星座画面は `app-shell__main` の中に描かれるため、上部バー `app-shell__top`（緑 + safe-area）と
  theme-color（白）が夜空の外側に見えていた。`ConstellationCalendar` のマウント中だけ `<html>` に
  `is-night-sky` を付け、`src/index.css` で殻の背景を `--night-top`（#070b1e）にし、
  `<meta name="theme-color">` も同色へ切替（unmount で復元）。`useLayoutEffect` でペイント前に切替
- `isEventDetailOpen` は使わない（ステッカーボード等の白画面でも true になるため）

### 将来日の画面遷移（2026-08-23 に方針確定）

- 一時的に全日数まで辿れるようにしたが、1日ずつ送ると星座の形を再構成できてしまい
  「期間中は全体像を見せない」「30日目のズームアウトで初めて全体が現れる」が崩れるため、
  **ナビ上限を opened / openable の最大日に戻した**（`maxAccessibleDayOf`）
- 窓内に残る locked は EXPIRED（開封期限切れの過去日）だけ。スタブ＋「ひらけなかった日」で表示
- 関連ファイル:
  - `data/calendarBridge.ts` … `maxAccessibleDayOf`（全日数）／`focusDayFromStates`
  - `components/starFieldScene.ts` … `LockedVisual` / `lockeds`、nextHint・フォグ調整
  - `components/StarField.tsx` … locked スタブ描画（「まだ開けません」）
  - `hooks/useCamera.ts` … ナビコメント更新

## どこに何があるか

| もの | 場所 |
|------|------|
| 検証／本体共通 UI | `src/pages/constellation-lab/` |
| HTML エントリ | `constellation-proto/index.html` |
| 本体組み込み | `src/pages/event/EventMainPage.tsx` |
| API 橋渡し | `src/pages/constellation-lab/data/calendarBridge.ts` + `eventApi.ts` |
| 星座の生成器 | `src/pages/constellation-lab/data/constellationGenerator.ts` |
| 設計書 | `docs/superpowers/specs/2026-08-22-constellation-calendar-design.md` |
| デザイン正 | `docs/constellation-design/ConstellationCalendar.dc.html` / `gen.mjs` |
| 実装メモ | `docs/constellation-design/IMPLEMENTATION_NOTES.md` |

## 動かし方

- 本体: イベントを開く → 星座 UI（API 接続）
- 検証: https://localhost:5173/constellation-proto/ （Debug パネル）

## 確定している設計判断

1. 期間中は星座の全体像を DOM に出さない（描画窓は focus 周辺のみ）
2. スワイプは線方向へ射影。**将来日へは進めない**（上限は opened / openable の最大日）。開封は AVAILABLE のみ
3. 開封バーストは Canvas 2D
4. ライトテーマ廃止（`--star` のみ）
5. 協力デイは明示解放（「鎖を解放する」）
6. 本番フォントは Mamelon（検証のみ Zen Maru）
7. **開封可否はサーバーの AVAILABLE のみ**（当日）。見た目の openable もそれに合わせる

## 次にやること

### 星座の形の磨き込み（後日）

生成器は「破綻しない形」までしか担保していない。線の交差や、上へ伸びていく流れの
自然さ（手作り30点のような見え方）は今後の課題。

### EXPIRED の見た目

- [ ] 「ひらけなかった日」スタブの見た目を確定（現状は locked 用の点線リングを流用）

### その他

- 協力達成（ACHIEVED）後に再入場したときのカード／演出の磨き込み
- 検証ページを残すか・PWA denylist の最終判断
- 旧 `AdventCalendar.tsx` の削除判断
- 実機での通し確認（開封・協力・フィナーレ）

## 既知の課題（レビューで見送ったもの）

- バースト中の画面回転で発光中心がズレ得る
- 長押しタイマーと `useTimers` が2系統
- 本体 lint 既存エラー 24 件（本件外）

## 経緯（要約）

1. 星座 UI 発案 → Claude Design でルック確定
2. 独立プロト → レビュー修正
3. 改善版移植 → PR #50 で第2エントリ同梱
4. 本体イベント画面へ組み込み＋ DayState / visibleDayCount / open API 同期
5. 将来日をスワイプ遷移可能にしたが、ネタバレ防止のため方針1（進めない）に戻した。locked スタブは EXPIRED 表示に流用
