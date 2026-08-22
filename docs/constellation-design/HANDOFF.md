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
  - **将来日（LOCKED）もスワイプ遷移で辿れる**（全体像は出さない／開封は AVAILABLE のみ）

## 直近で入れたこと（2026-08-23）

### 本体組み込み〜API 同期

- `EventMainPage` で旧 `AdventCalendar` の代わりに `ConstellationCalendar` を使用
- `calendarBridge.ts` で DayState マッピング（OPENED→opened / AVAILABLE→openable / 他→locked）
- 星の数を `visibleDayCount` に合わせて可変
- 開封済みカードを `GET .../days/{id}` で再取得
- 協力デイの鎖リング数を `memberTotal` 可変に

### 将来日の画面遷移

- 以前: `maxAccessibleDay` が opened + openable まで → 将来日へスワイプ不可／locked は非描画
- いま: ナビ上限を全日数に変更。locked はフォーカス周辺の **スタブ** として描画
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
| 設計書 | `docs/superpowers/specs/2026-08-22-constellation-calendar-design.md` |
| デザイン正 | `docs/constellation-design/ConstellationCalendar.dc.html` / `gen.mjs` |
| 実装メモ | `docs/constellation-design/IMPLEMENTATION_NOTES.md` |

## 動かし方

- 本体: イベントを開く → 星座 UI（API 接続）
- 検証: https://localhost:5173/constellation-proto/ （Debug パネル）

## 確定している設計判断

1. 期間中は星座の全体像を DOM に出さない（描画窓は focus 周辺のみ）
2. スワイプは線方向へ射影。**locked（将来日）も画面遷移で辿れる**（スタブ表示・開封は AVAILABLE のみ）
3. 開封バーストは Canvas 2D
4. ライトテーマ廃止（`--star` のみ）
5. 協力デイは明示解放（「鎖を解放する」）
6. 本番フォントは Mamelon（検証のみ Zen Maru）
7. **開封可否はサーバーの AVAILABLE のみ**（当日）。見た目の openable もそれに合わせる

## 次にやること

### 優先: 将来日（locked）UI の仕上げ

ナビと最低限のスタブはあるが、**将来日まわりの UI はまだ未完成**。デザイン正（`ConstellationCalendar.dc.html` / `gen.mjs` の locked 表現）と揃えて磨く。

やることの目安:

- [ ] locked スタブの見た目をデザイン正に寄せる（点線リング・コアサイズ・ゴール星の扱いなど）
- [ ] フォーカス時／隣接点のスケール・不透明度・ラベル位置の調整
- [ ] 「まだ開けません」文言・ヒントのトーン／表示条件（タップ時フィードバックの有無含む）
- [ ] 未来方向のフォグ・点線パスとのバランス（ネタバレしすぎないこと）
- [ ] EXPIRED（未開封の過去日）を将来 locked と同じスタブでよいか、専用見た目にするか判断
- [ ] 実機で「当日 → 将来へ数日スワイプ → 戻る」の通し確認

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
5. 将来日をスワイプ遷移可能に（locked スタブ）。**見た目の仕上げは未着手／次タスク**
