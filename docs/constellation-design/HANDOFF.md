# 星座アドベントカレンダー 引き継ぎメモ

最終更新: 2026-08-23

## いまの状態

- **PR**: [#50 add: 星座アドベントカレンダーの検証用プロトタイプを追加](https://github.com/runrun4/advent-calendar-front/pull/50)（`feature/constellation-proto` → `develop`、未マージ）
  - マージ時は **squash 推奨**（初回コミットに誤って 2.3MB の生成ファイルが入っており、履歴に残るため）
- **プレビュー**: https://feature-constellation-proto.advent-calendar-front.pages.dev/constellation-proto/
- **マージ後の本番 URL**: https://advent-calendar-front.pages.dev/constellation-proto/
- 本体のイベント画面（`src/pages/event/AdventCalendar.tsx` の 5×6 グリッド）は **まだ差し替えていない**。検証ページとして同居しているだけ

## どこに何があるか

| もの | 場所 |
|------|------|
| 検証ページのコード | `src/pages/constellation-lab/`（components / hooks / data / themes / types / utils） |
| HTML エントリ | `constellation-proto/index.html`（`vite.config.ts` の `build.rollupOptions.input` に登録。`/constellation-proto/` で配信） |
| 設計書（改訂履歴つき） | `docs/superpowers/specs/2026-08-22-constellation-calendar-design.md` |
| デザインの正 | `docs/constellation-design/ConstellationCalendar.dc.html`（Claude Design 改善版の動くリファレンス実装） |
| 実装メモ（バグ修正・演出・協力デイの仕様） | `docs/constellation-design/IMPLEMENTATION_NOTES.md` |
| デザインカンバスの作業ファイル | `docs/constellation-design/gen.mjs` + `*.dc.html` + `canvas.json`（`node gen.mjs` で再生成） |
| Claude Design プロジェクト | 「星座アドベントカレンダ改善」 https://claude.ai/design/p/b19cfdf1-4d5f-4bfa-8a11-4bfda5c64e0e |

## 動かし方・検証のコツ

- 本体の dev サーバーを起動し https://localhost:5173/constellation-proto/ を開く（専用サーバーは不要）
- 画面下の **Debug パネル**: 開封日数スライダー（0〜30）/ 協力デイ直前 / 協力デイへ / 29日開封済み / フィナーレ再生 / リセット / 協力デイの他メンバー人数（0〜5）
- **自動化ブラウザで検証するとき**: 非表示タブでは `requestAnimationFrame` が止まり演出が進まない。`window.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 16)` をページに注入して検証した（アプリ側には `visibilitychange` と保険タイムアウトがあるので実機では問題ない）
- 合成 PointerEvent でタップを再現する場合は `setPointerCapture` / `releasePointerCapture` を一時的に無効化する必要がある（未登録 pointerId で例外になるため）

## 確定している設計判断

1. 期間中は星座の**全体像を絶対に見せない**。描画窓は `focus-2 〜 max(focus+1, target)` で、それ以外の星・線は DOM に出さない（CSS 非表示ではない）
2. スワイプは**星をつなぐ線の方向ベクトルに射影**する（横方向固定ではない）。移動中はドリー 3.8→6.4→3.8
3. 開封バーストは **Canvas 2D**（WebGL は廃止。フォールバック分岐が不要になるため）
4. **ライトテーマは廃止**（Claude Design 側の判断）。CSS 変数は `--star` の1本のみ
5. 協力デイ（10日目）は全員そろっても**自動では開かない**。最後の1人が「鎖を解放する」を明示的に押す
6. フォントは本番の Mamelon に差し替え前提（いまは Zen Maru Gothic を Google Fonts から読込）

## 次にやること（未着手）

本番イベント画面への組み込み（別 PR）。着手前に決める必要があるもの:

- **テーマ**: この画面だけ夜空にするか（推奨）、アプリ全体の白×緑に寄せるか
- **`app-shell__main` のページスワイプとの競合**: 星座画面は `touch-action: none` で縦横のドラッグを掴むため、表示中は `PageSlider` の横スワイプを止める必要がある
- **データ接続**: `openedCount`（現行は `unlockedDays = 8` のハードコード）、協力デイの参加者（現行は `data/coop.ts` の6人モック）をバックエンドとどう結ぶか
- 組み込み時に外すもの: `DebugPanel`、Google Fonts の link（Mamelon を継承）、`constellation-proto/index.html` エントリと PWA の denylist（検証ページを残すなら維持）

## 既知の課題（レビューで見送ったもの）

- バースト再生中（1.15s）に画面回転すると発光中心がズレ得る
- 長押しタイマー（`useCamera`）と `useTimers` の一括 clear が2系統に分かれている（リークはない）
- フィナーレ画面で Debug パネルが下部の星 1〜9 を隠す（パネルは折りたためる）
- 本体の `npm run lint` に既存エラー 24 件（`EventSettingsModal.tsx` など。本件とは無関係）

## 経緯（要約）

1. 現行グリッドの代替として「星座をたどる」UI を発案 → Claude Design のカンバス（全体マップ案 → 一星ずつ案）でルックを確定
2. 独立 Vite プロトを実装 → Sonnet レビューで Critical 1 / Should fix 3 を修正
3. Claude Design 側で改善版（バグ修正10件・演出強化・協力デイ）が作られ、それを移植 → レビューで協力デイの Critical 1 / Should fix 1 を修正
4. フロントリポジトリへ移動して PR #50。自動デプロイに乗せるため本体の第2エントリに統合し、lint/build を本体と共通化
