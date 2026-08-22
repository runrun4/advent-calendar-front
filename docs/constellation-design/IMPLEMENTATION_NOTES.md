# 星座アドベントカレンダー ─ 演出強化とバグ修正の実装メモ

対象: `constellation-proto/src`（→ 現在は `src/pages/constellation-lab/` に移植済み）
成果物: `ConstellationCalendar.dc.html`（夜空テーマ単一 / 星座ビューのみ）

---

## 1. バグ修正

### 1-1. スワイプが「星をつなぐ線」に沿わない（報告バグ）

**現状** `useCamera.onPointerMove(clientX)` が横方向の移動量だけを見ている。
星座の経路は上・左・右へ折れるため、次の星が真上にあっても「左スワイプ」でしか進めず、
指の動きと星の移動方向が一致しない。

**修正** 指のベクトルを、フォーカス星から次／前の星へ向かう単位ベクトルに射影する。
カメラが星へ寄ると画面の中身は逆に動くので、指の向きは `-dir`。

```ts
const dirTo = (from, to) => {           // レイアウト座標（y は下向き）
  const dx = to[0]-from[0], dy = to[1]-from[1]
  const len = Math.hypot(dx, dy) || 1
  return [dx/len, dy/len]
}

// onPointerMove
const dx = e.clientX - start.x, dy = e.clientY - start.y
const fwd = canNext ? (dx*-nDir[0] + dy*-nDir[1]) / DRAG_PX : 0
const bwd = canPrev ? (dx*-pDir[0] + dy*-pDir[1]) / DRAG_PX : 0
const signed = fwd >= bwd ? Math.max(0, fwd) : -Math.max(0, bwd)
setTravelProgress(clamp(dragStartProgress + signed, -1, 1))
```

`onPointerMove` は `clientX` だけでなく `clientY` も受けるようシグネチャを変える。
`.constellation-calendar__star-field-wrap` の `touch-action: pan-y` → `none`
（縦方向のスワイプも掴む必要があるため）。

検証値（day9 → day10、方向 (0.75, -0.66)）:

| ドラッグ | 進行度 |
|---|---|
| 線に沿って (-97, +86) | 1.00 |
| 従来の真横 (-130, 0) | 0.75 |
| 逆向き (+97, -86) | -0.35（前の星へ） |

### 1-2. スワイプ中に画面が飛ぶ / たどってきた道が変わる

**現状** `StarField` が「中央の大きなフォーカス星（`OpenedFocusStar` / `PreopenStar`）」と
「移動中の中サイズ2星（`TravelStars`）」を**別の要素として描き分けている**。
`travelProgress` が 0 を離れた瞬間に前者が消えて後者が現れるため、
星のサイズ・十字光条・DAY ラベルが不連続に切り替わり「ワープ」して見える。
線も、静止時は `prev → focus`、移動中は `focus → target` だけを描くので、
たどってきた道が別のものに差し替わる。

**修正** 星を1種類の描画関数に統一し、幾何を進行度から連続補間する。

```ts
const bigness = (day) => {           // 0 = 中サイズ, 1 = フォーカス
  if (!traveling) return day === focusDay ? 1 : 0
  if (day === focusDay) return 1 - t
  if (day === travelTargetDay) return t
  return 0
}
const m = camera.k / K_IDLE          // ドリーぶんの拡大

halo      = lerp(30, 118, b) * m
crossScale= lerp(0.2, 1, b) * m      // 十字光条は opacity = b * 0.42 でフェード
sparkle   = lerp(18, 56, b) * m
core      = lerp(3, 5.5, b) * m
smallLabel.opacity = 0.7 * (1 - b)   // 横の小さな数字
dayLabel.opacity   = b               // 「DAY n」
```

未開封（openable）の星も同じ扱いで、リング群を `scale(lerp(0.3, 1, b))`、
全体 opacity を `0.42 + 0.58b` にする。

線は「描画窓の連続する星のペア」から毎フレーム組み立てる。
窓は常に `focus-2 〜 max(focus+1, target)`（`maxAccessibleDay` で上限）。
これで静止・移動・コミットのどのフレームでも同じ規則の線が引かれる。

コミット時 (`t = 1` → `focusDay += 1`, `t = 0`) は
カメラ中心・ズーム・星の幾何がすべて一致するため、見た目の飛びがゼロになる。

### 1-3. フィナーレの線が二重制御

`StarField.css` の `.star-field__finale-line` に
`transition: stroke-dashoffset 1.6s` があり、同じ値を rAF が毎フレーム更新している。
transition が毎フレーム再スタートするため、線が遅れて伸び、途中でカクつく。

**修正** transition を削除し、進行度のソースを rAF ひとつに統一。
DC 版ではさらに `stroke-dashoffset` をやめ、
到達点までの `points` を組み立てる方式に変更（線の先端に光の頭を置けるようになる）。

### 1-3. 最終星（30日目）が点灯しない

連鎖距離 `chain` と累積長 `CUM[29]` が完全一致するため `ov = (chain - CUM[i]) / 30 = 0` で
スキップされ、30個目の星だけ描かれない。連鎖完了時は一律 `ov = 1` にする。

### 1-4. フィナーレから戻れない

`phase: 'finale'` を抜ける導線が DebugPanel のリセットしかない。
「星空にもどる」ボタンを追加（`phase → 'daily'`, `finaleT → 0`）。

### 1-5. ポインタ状態の解放漏れ

- `setPointerCapture` に対する `releasePointerCapture` がない
- カード表示中に `phase` が変わっても `dragInfoRef` / `dragStartX` が残り、次のスワイプが基準点を引きずる
- `pointerId` を照合していないため、マルチタッチで別の指の `pointermove` を拾う

**修正** `drag = { id, x, y, t, el }` を1本のソースにし、`releaseDrag()` で
capture 解放と参照クリアを常に同時に行う。`pointerId` 不一致のイベントは無視。

### 1-6. タイマー / rAF の解放漏れ

`openDay` 内の `setTimeout`（`justOpenedDay` 解除・2秒の保険）が unmount 時に残る。
全 timer を配列で保持し、`componentWillUnmount` と DebugPanel 操作時に一括 clear。

### 1-7. 多重タップで開封が二重に走る

`phase !== 'daily'` のガードを `openDay` の入口に追加。

### 1-8. DebugPanel のスライダー上限が 29

`max={totalDays - 1}` のため 30 を直接指定できず、フィナーレ手前の状態を作れない。
`max = totalDays` に変更し、「フィナーレ再生」ボタンを追加。

### 1-9. タブ非表示で開封演出が止まる

`visibilitychange` で `document.hidden` になったら開封を即完了させる
（従来の「2秒の保険 setTimeout」より確実で、待ち時間も生まない）。

### 1-10. `prefers-reduced-motion`

全アニメーションを 1 回・0.001s に短縮し、粒子数を 24 に落とす。

---

## 2. 演出強化

### 2-1. 背景（3層パララックス + 星雲 + 流れ星）

- 背景星を 3 層に分割し、カメラ移動量の 2% / 5% / 9% だけ逆方向へずらす。
  ズーム中に奥行きが出る。
- 各星に個別の周期（2.4–6.6s）と遅延を持つまたたき。乱数はシード関数で固定し、
  再レンダリングでちらつかない。
- 星雲 3枚（青・橙・紫）を 26–42s のドリフト。彩度は抑えめ。
- 流れ星 3本、17 / 23 / 29s 周期でそれぞれ全体の 8% の時間だけ可視。

### 2-2. 開封前の星（期待感）

- 呼吸するハロー（3.6s）
- 2本の拡散リング（3.2s、1.6s ずらし）
- 内側の破線軌道が時計回り 18s、外側が反時計回り 30s
- 「タップでひらく」自体もゆっくり明滅

### 2-3. 開封バースト

WebGL から **Canvas 2D + `globalCompositeOperation: 'lighter'`** に置き換え。
シェーダのコンパイル失敗・コンテキスト喪失というフォールバック分岐が丸ごと不要になり、
描ける要素も増える。1150ms、4レイヤー構成:

1. 白い閃光（放射グラデーション、最初の 22%）
2. 衝撃波リング（半径 20 → 250、線幅が減衰）
3. 光条 12本（中心からの線形グラデーション）
4. 粒子 140個（トレイル付き、5個に1個は白、重力 26px、個別のまたたき位相）

`effectLevel` で 70 / 140 / 210 粒に切替。DPR は 2 で打ち止め。

### 2-4. スワイプ中のカメラワーク

- ドリー 3.8 → 6.4 → 3.8（`sin(πt)`）。従来の 7.5 は寄りすぎて星が画面外に出ていたので緩めた。
- 移動中の 2星に `filter: blur(sin(πt) * 1.6px)` のモーションブラー。
- 次の星の方向にシェブロン（`atan2` で回転）。線に沿って動かすことを視覚的に示す。

### 2-5. 開封済みフォーカス星

- 十字の光条が 90s で 1回転
- 星本体は 4.4s の呼吸
- 開封直後は `cc-ignite`（0.35 → 1.22 → 1.0）でポップ

### 2-6. カード

- スクリム `backdrop-filter: blur(7px)`
- カードは `translateY(26px) scale(0.94)` から立ち上がる
- グラデーション背景 + 内側 1px ハイライト + 外側の暖色グロー
- CTA にグラデーションと投影

### 2-7. フィナーレ（4段構成 / 合計 6.1s）

| 時刻 | 内容 |
|---|---|
| 0 – 1900ms | day30 の星から重心へズームアウト（k 3.8 → 1.15）。ヘッダーは 0.35 まで減光 |
| 1900 – 4700ms | 線が 1→30 の順に伸びる。先端に光の頭（放射グラデーション + 白コア） |
| 通過ごと | 星が距離ベースでポップ点灯（0.2 → 1.35 → 1.0） |
| 4700 – 5600ms | 全体ブルーム（半径 120 → 420、`sin` で明滅） |
| 4700ms〜 | 「星座が完成 / 30 · 30 opened」バナー、「星空にもどる」ボタン |

線の連鎖は累積長ベースなので、星の間隔が違っても速度が一定に見える。
6.1s で rAF を停止し、以降は CSS の緩い呼吸のみ（バッテリー配慮）。

### 2-8. 進捗表示

数値だけだった `8 / 30 opened` の左に、発光する細いバーを追加。

---

## 3. 削除したもの

- **ライトテーマ**（`:root[data-theme='light']`、`ThemeSwitcher`）
  → トークンは夜空の hex 値を直接埋め込み。CSS 変数は `--star` の1本だけ残し、
  アクセントカラーの差し替えに使う。
- `effects/burst.ts` / `effects/burstFallback.ts`（Canvas 2D 版に統合）
- `.star-field__finale-line` の transition

---

## 4. 数値ラベルは HTML オーバーレイ

DC ランタイムはテンプレートの `{{ }}` を `<span>` にコンパイルするため、
SVG の `<text>` の中に置くと glyph が出ない（`getNumberOfChars() === 0`）。
そのため日付の数字・`DAY n`・フィナーレの通し番号は、
星座 SVG の上に重ねた `position: absolute` の HTML レイヤーで描いている。

`viewBox`(390×640) → コンテナ px の変換は `preserveAspectRatio="xMidYMid meet"` と同じ式:

```
S  = min(fw / 390, fh / 640)
OX = (fw - 390 * S) / 2
OY = (fh - 640 * S) / 2
```

`fw` / `fh` は `ResizeObserver` で観測する（バナー表示で星座エリアの高さが変わるため）。
**React 実装（`constellation-proto`）ではこの制約はないので、素直に `<text>` に戻してよい。**

---

## 5. 協力デイ（day 10）

参加者 6 人全員が書き込むまで星が鎖で縛られている日。`COOP_DAYS = [10]`。

### 状態

```ts
myWritten: boolean        // 自分が書いたか
othersWritten: 0..5       // 他メンバーの人数
coopUnlocked: boolean     // 解放済み
coopT: number             // 解放演出の経過 ms (0 = 未再生)
```

`writtenCount = othersWritten + (myWritten ? 1 : 0)`、`allWritten = writtenCount === 6`。
`isChained(day) = COOP_DAYS.includes(day) && !coopUnlocked`。

### 進行を止めない

自分の分を書いた時点で `opened = max(opened, 10)` にするので、
11日目以降へは進める。星だけが暗いまま鎖で縛られている。

### 鎖の表現

星の周囲 `r = 74` に 6 スロットの弧（各 60°、両端 7° の隙間）。
弧と継ぎ目のドットが 44s で 1 回転する。

- 書いた人のスロット: `stroke-opacity 0.1`（砕けた跡）
- まだの人のスロット: `stroke-opacity 0.9`

**鎖の本数がそのまま残り人数**になる。色は星の金ではなく銀（`#cfd8f5`）で、
「星を閉じ込めている異物」として読ませる。

自分が書き終わると星の芯が `fill-opacity 0.26 → 0.5` に上がる（自分の分だけ光っている）。

### 操作

| 操作 | 挙動 |
|---|---|
| タップ（自分未記入） | 自分の分を書く。小さめのバースト（`burst(0.45)`）→ 確認カード |
| タップ（自分記入済・全員未達） | メンバー一覧を開く |
| **長押し 420ms** | メンバー一覧（誰が書いた / まだ）。移動 8px 超でキャンセル |
| 全員そろった後の「鎖を解放する」 | 解放演出へ |

自分の分を書いた直後は、鎖の状態だけが静かに変わって「何が起きたか分からない」ので、
**確認カード**を出す（「あなたの分を書きました / のこりN人が書きこむと、鎖がほどけて星がひらきます。」）。
✕ ボタン・CTA・スクリムのどこからでも閉じられる。メンバー一覧にも ✕ を付けた。

「気づいたら開いていた」を避けるため、全員そろっても自動では開かない。
最後の1人が明示的にボタンを押して演出に入る。

### 解放演出（1400ms）

| 時刻 | 内容 |
|---|---|
| 0 – 420ms | 6本の弧が `r 74 → 100` へ広がりながら opacity 0 へ（鎖が砕ける） |
| 250 – 1080ms | 6つの破片が外へ 58px 弾けたあと、星の中心（`r = 6`）へ吸い込まれる |
| 900ms | `coopUnlocked = true` → 通常の星に切り替わり、`cc-ignite` で点灯 + バースト |
| 1320ms | 通常のカードを表示 |

破片は `t2 < 0.32` で外向き、以降は内向きの単一の距離関数なので、
弾ける／吸い込まれるの折り返しが滑らかにつながる。

### 保険

`rAF` が止まる環境（タブ非表示など）でも演出が終わるよう、
`REL_END + 500ms` の `setTimeout` で終端状態（解放済み + カード表示）へ強制遷移する。
フィナーレ側にも同じ保険を入れた。

### Debug

「協力デイ直前」で9日目に立った状態（鎖の10日目を先に見ている）、
「協力デイへ」で10日目にフォーカスした状態へジャンプ。
スライダーで他メンバーの人数を 0–5 で操作できる。

---

## 6. 移植時の注意

- `useCamera` の `onPointerMove` は 2引数（x, y）になる。
- フィナーレの進行度は `finaleT`（経過 ms）ひとつだけを state に持ち、
  カメラ・連鎖・ブルーム・バナーはすべてそこから導出する。
  `finaleCamera` と `finaleLineProgress` を別々に持つと同期ずれの原因になる。
- 星の点灯は「時刻」ではなく「連鎖距離の超過量」で決めると、
  イージングを変えても点灯順とタイミングが自動で追従する。
