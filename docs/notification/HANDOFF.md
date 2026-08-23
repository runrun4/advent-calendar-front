# 通知機能 引き継ぎメモ

最終更新: 2026-08-23

## 目的

アドベントカレンダーに関する次の Web Push 通知を実現する。

1. 当日のステッカーを未開封なら **JST 12:00**
2. アドベントカレンダーの **開始1日前** と **初日**
3. チームで開ける協力デイの **JST 9:00**
4. 最終日の **JST 9:00**

## 現在実装されている範囲

### フロントエンド

- `src/components/layout/Header.tsx`
  - イベント一覧ヘッダーのプロフィールアイコン左にベルを追加済み
  - ベルから既存 Web Push の購読 ON/OFF ができる
  - 購読中は緑のドットを表示
  - Push 非対応、iOS 非 PWA、通知拒否状態の案内あり
- `src/index.css`
  - ベルボタンと通知設定パネルのスタイル
- `src/services/pushNotificationService.ts`
  - VAPID 公開鍵取得、通知許可、購読登録・解除、再同期、テスト送信
- `src/sw.ts`
  - Push の表示、通知タップ時のアプリ起動／フォーカス

ベルは通知スケジュールの設定ではなく、**端末を Push の受信対象にするための購読 UI**。

### バックエンド

`runrun-backend` には次の基盤が既にある。

- `internal/push/reminder.go`
  - 当日分が未開封のユーザーを抽出する日次リマインダー
  - 1分間隔でポーリング
  - `PUSH_REMINDER_TIME`（`HH:MM`、JST）以降に送信
  - 複数イベントはユーザー単位で1通にまとめる
- `internal/push/`
  - VAPID、暗号化、Web Push 送信、購読リポジトリ
- `internal/httpapi/push.go`
  - Push 設定取得、購読登録・解除、テスト送信 API
- `internal/store/migrations/0016_push_subscriptions.sql`
  - `push_subscriptions`
  - `push_reminder_sends`

現行の自動通知は **当日未開封リマインド1種類のみ**。また、`.env.board-dev` には Push/VAPID・時刻設定がないため、その環境ではワーカーは動かない。

## 未実装の計算・判定

指定された4種類の通知は、フロントだけではアプリ終了中に時刻判定できない。以下はバックエンドの常駐ワーカーで実装する。

### 共通の時刻計算

- 基準タイムゾーンは現行どおり **JST 固定**
- `today = TargetDate(now)`（JST の当日 00:00）
- 1分ポーリングで次の2つのゲートを判定する
  - `nowJST >= 09:00` → 朝通知を処理
  - `nowJST >= 12:00` → 未開封通知を処理
- 「時刻を過ぎて起動した場合」も、当日未送信なら送る
- 同じ通知を再起動や多重起動で二重送信しない

### 1. 当日ステッカー未開封（12:00）

対象条件:

```text
event.status = ACTIVE
membership.status = ACTIVE
calendar_day.target_date = today
対象 day_type
本人の opening が存在しない
本人の push_subscription が存在する
本日・DAILY_STICKER_UNOPENED が未送信
```

現行 `reminder.go` は `day_type` を限定していないため、KNOWLEDGE も対象になり得る。仕様上の「ステッカー」を次のどちらにするか実装前に確定する。

- 厳密: `day_type = STICKER`
- ステッカーが得られる日すべて: `STICKER | COOPERATION | EVENT_DAY`

推奨は後者。

### 2. 開始1日前・初日

アドベントカレンダーの開始日は、イベント本番日 `start_date` ではなく **`visible_start_date`** を使う。

```text
開始1日前: event.visible_start_date = today + 1 day
初日:     event.visible_start_date = today
```

対象は ACTIVE イベントの ACTIVE メンバーかつ Push 購読あり。開封有無は問わない。

通知種別:

- `ADVENT_EVE`
- `ADVENT_START`

**開始1日前・初日の送信時刻は未確定。** 協力デイ・最終日と合わせて JST 9:00 にする案が自然だが、実装前に確認する。

### 3. 協力デイ（9:00）

```text
event.status = ACTIVE
event.mode = GROUP
membership.status = ACTIVE
calendar_day.target_date = today
calendar_day.day_type = COOPERATION
本人の push_subscription が存在する
本日・COOPERATION_DAY が未送信
```

通知種別: `COOPERATION_DAY`

現状要件では9:00時点の開封有無や協力達成状況を問わず、対象メンバー全員へ送る想定。

### 4. 最終日（9:00）

最終日は `calendar_days.day_type = EVENT_DAY` かつ `target_date = today` で判定する。

```text
event.status = ACTIVE
membership.status = ACTIVE
calendar_day.target_date = today
calendar_day.day_type = EVENT_DAY
本人の push_subscription が存在する
本日・EVENT_FINAL_DAY が未送信
```

通知種別: `EVENT_FINAL_DAY`

## 二重送信防止の変更

現行 `push_reminder_sends` の主キーは `(user_id, target_date)`。同じ日に9:00通知と12:00通知を両方送れないため、通知種別 `kind` が必要。

新規マイグレーション案:

```sql
alter table push_reminder_sends
  add column kind text not null default 'DAILY_STICKER_UNOPENED';

alter table push_reminder_sends
  drop constraint push_reminder_sends_pkey,
  add primary key (user_id, target_date, kind);
```

`kind` の候補:

- `DAILY_STICKER_UNOPENED`
- `ADVENT_EVE`
- `ADVENT_START`
- `COOPERATION_DAY`
- `EVENT_FINAL_DAY`

claim / release の条件も `(user_id, target_date, kind)` に変更する。

## 実装方針

新しい公開 API は不要。既存の購読 API と Web Push Sender を使い、バックエンド内部の Reminder を拡張する。

```text
Reminder.Run（1分ごと）
├─ 09:00 到達
│  ├─ ADVENT_EVE
│  ├─ ADVENT_START
│  ├─ COOPERATION_DAY
│  └─ EVENT_FINAL_DAY
└─ 12:00 到達
   └─ DAILY_STICKER_UNOPENED
```

主な変更対象:

- `runrun-backend/internal/push/reminder.go`
- `runrun-backend/internal/push/reminder_test.go`
- `runrun-backend/internal/push/reminder_integration_test.go`
- `runrun-backend/internal/store/migrations/`（新規 migration）
- 必要なら `internal/config/config.go`、`cmd/api/main.go`
- 環境変数ドキュメントと本番環境設定

## 未確定事項

1. 開始1日前・初日の通知時刻（推奨: JST 9:00）
2. 12:00未開封通知の対象 day type
3. 同日に複数の9:00通知が該当した場合
   - 種類ごとに複数通送る
   - ユーザーごとに1通へまとめる
4. 通知タップ時に対象イベントを直接開くか
   - 現在の payload URL は `/`
   - Service Worker は URL を受け取れるが、アプリ側のディープリンク処理は未接続

## テスト観点

- 8:59では送らず、9:00以降に送る
- 11:59では送らず、12:00以降に送る
- 起動が遅れても当日未送信なら送る
- 同じ `kind` は1日1回だけ
- 9:00と12:00は同日に両方送れる
- CANCELEDイベント、LEFTメンバー、購読なしユーザーを除外
- PERSONALイベントに協力デイ通知を送らない
- 開封済みユーザーへ12:00通知を送らない
- 複数イベント該当時の集約仕様を確認

