// 星座カレンダー デザインカンバスのアートボード生成スクリプト
// 実行: node gen.mjs  →  Main / Reveal / Popup / Light の .dc.html を出力
import { writeFileSync } from 'node:fs'

// 30日分の星座標 (viewBox 0 0 390 520)。day1が左下、day30が左上のゴール星。
const STARS = [
  [48, 480], [92, 452], [70, 408], [120, 396], [158, 424],
  [196, 400], [176, 356], [222, 340], [264, 362], [300, 330],
  [276, 292], [312, 262], [282, 226], [236, 244], [200, 216],
  [222, 176], [180, 152], [140, 176], [108, 148], [128, 108],
  [172, 96], [214, 108], [252, 88], [290, 104], [322, 76],
  [300, 40], [256, 32], [216, 44], [170, 32], [120, 40],
]

const OPENED = 8 // 開封済み日数
const NEXT = OPENED + 1

// 背景の小さな星 (x, y, r, opacity)
const BG_STARS = [
  [22, 30, 1.2, 0.5], [60, 96, 0.9, 0.3], [140, 24, 1.0, 0.4],
  [250, 140, 0.9, 0.35], [348, 30, 1.3, 0.5], [368, 120, 0.9, 0.3],
  [30, 180, 1.0, 0.35], [340, 200, 1.1, 0.4], [20, 300, 0.9, 0.3],
  [356, 300, 1.0, 0.35], [40, 372, 1.2, 0.4], [366, 396, 0.9, 0.3],
  [16, 440, 0.9, 0.35], [120, 500, 1.0, 0.3], [230, 496, 0.9, 0.35],
  [330, 470, 1.2, 0.45], [96, 250, 0.8, 0.25], [286, 380, 0.8, 0.3],
  [190, 290, 0.8, 0.22], [64, 60, 0.8, 0.28], [310, 160, 0.8, 0.3],
  [150, 64, 0.8, 0.26], [240, 40, 0.9, 0.3], [352, 340, 0.8, 0.28],
]

// 4方向に尖る星型パス (s=大きさ)
const sparklePath = (s) => {
  const c = (s / 5).toFixed(2)
  return `M 0 ${-s} C ${c} ${-c} ${c} ${-c} ${s} 0 C ${c} ${c} ${c} ${c} 0 ${s} C ${-c} ${c} ${-c} ${c} ${-s} 0 C ${-c} ${-c} ${-c} ${-c} 0 ${-s} Z`
}

const SPARKLE = sparklePath(7)

const FONT = `'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', system-ui, sans-serif`
const FONT_LINK = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@400;500;700&amp;display=swap">'

/* ==========================================
 * アイコン (lucide 準拠の stroke SVG)
 * ========================================== */

const icon = (inner, size = 22) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`

const IC_BACK = icon('<path d="m15 18-6-6 6-6"></path>', 26)
const IC_CHAT = icon('<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"></path>')
const IC_GIFT = icon('<rect x="3" y="8" width="18" height="4" rx="1"></rect><path d="M12 8v13"></path><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"></path><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"></path>')
const IC_CLOSE = icon('<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>', 20)

const gearSpokes = () => {
  let s = '<circle cx="12" cy="12" r="3.4"></circle>'
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i
    const x1 = 12 + Math.cos(a) * 6.4
    const y1 = 12 + Math.sin(a) * 6.4
    const x2 = 12 + Math.cos(a) * 9.2
    const y2 = 12 + Math.sin(a) * 9.2
    s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"></line>`
  }
  return s
}
const IC_SETTINGS = icon(gearSpokes())

/* ==========================================
 * 星座 SVG
 * ========================================== */

const pts = (arr) => arr.map(([x, y]) => `${x},${y}`).join(' ')

// theme: { star, lineOp, lockedFill, lockedStroke, labelFill, dottedStroke, bgStarFill, hintFill }
// mode: 'main' | 'reveal' | 'popupbg'
// popupbg はカード表示中 = 9日目を開封済みとして描く
const constellationSvg = (t, mode) => {
  const openedCount =
    mode === 'popupbg' ? NEXT : mode === 'finale' ? STARS.length : OPENED
  const halo = t.halo ?? t.star
  const openedPts = pts(STARS.slice(0, openedCount))
  const allPts = pts(STARS)
  const [nx, ny] = STARS[NEXT - 1]
  const [px, py] = STARS[OPENED - 1]

  let s = `<svg width="390" height="520" viewBox="0 0 390 520" style="display: block">`
  s += `<defs>
    <filter id="soft" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.2"></feGaussianBlur></filter>`
  if (mode === 'reveal') {
    s += `<radialGradient id="burst" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#fff7e0" stop-opacity="0.95"></stop>
      <stop offset="0.35" stop-color="${t.burst}" stop-opacity="0.55"></stop>
      <stop offset="1" stop-color="${t.burst}" stop-opacity="0"></stop>
    </radialGradient>`
  }
  s += `</defs>`

  // 背景の小星
  for (const [x, y, r, o] of BG_STARS) {
    s += `<circle cx="${x}" cy="${y}" r="${r}" fill="${t.bgStarFill}" fill-opacity="${o}"></circle>`
  }

  // 星座の完成形をほのめかす点線 (完成後は不要)
  if (mode !== 'finale') {
    s += `<polyline points="${allPts}" fill="none" stroke="${t.dottedStroke}" stroke-opacity="${t.dottedOp}" stroke-width="1" stroke-dasharray="1 5"></polyline>`
  }

  // 開封済みの線 (グロー下敷き + 本線)
  s += `<polyline points="${openedPts}" fill="none" stroke="${t.star}" stroke-opacity="0.18" stroke-width="5" filter="url(#soft)"></polyline>`
  s += `<polyline points="${openedPts}" fill="none" stroke="${t.star}" stroke-opacity="${t.lineOp}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></polyline>`

  // 開封演出: 8→9 の線が輝いて到達した瞬間
  if (mode === 'reveal') {
    s += `<line x1="${px}" y1="${py}" x2="${nx}" y2="${ny}" stroke="${t.star}" stroke-opacity="0.4" stroke-width="6" filter="url(#soft)"></line>`
    s += `<line x1="${px}" y1="${py}" x2="${nx}" y2="${ny}" stroke="#fff3d0" stroke-opacity="0.95" stroke-width="2" stroke-linecap="round"></line>`
  }

  // 未開封の星
  STARS.forEach(([x, y], i) => {
    const day = i + 1
    if (day <= openedCount) return
    if (day === NEXT && mode !== 'popupbg') return
    if (day === 30) {
      // ゴール星: 少し大きく、淡いリング付き
      s += `<circle cx="${x}" cy="${y}" r="7.5" fill="none" stroke="${t.lockedFill}" stroke-opacity="0.5" stroke-width="1" stroke-dasharray="2 3"></circle>`
      s += `<circle cx="${x}" cy="${y}" r="3.2" fill="${t.lockedFill}" fill-opacity="0.6"></circle>`
    } else {
      s += `<circle cx="${x}" cy="${y}" r="2.2" fill="${t.lockedFill}" fill-opacity="0.45"></circle>`
    }
  })

  // 開封済みの星 (ハロー + 輝き + 日数ラベル)
  STARS.slice(0, openedCount).forEach(([x, y], i) => {
    const day = i + 1
    s += `<g transform="translate(${x} ${y})">`
    s += `<circle r="11" fill="${halo}" fill-opacity="0.13"></circle>`
    s += `<circle r="5.5" fill="${halo}" fill-opacity="0.3"></circle>`
    s += `<path d="${SPARKLE}" fill="${t.star}"></path>`
    s += `<circle r="1.5" fill="#ffffff" fill-opacity="0.9"></circle>`
    s += `<text x="10" y="4" font-size="9" fill="${t.labelFill}" fill-opacity="0.75">${day}</text>`
    s += `</g>`
  })

  // 次に開ける星
  if (mode === 'main') {
    s += `<g transform="translate(${nx} ${ny})">`
    s += `<circle r="12" fill="${t.star}" fill-opacity="0.08"></circle>`
    s += `<circle r="9" fill="none" stroke="${t.star}" stroke-opacity="0.9" stroke-width="1.2" stroke-dasharray="2.5 3.5"></circle>`
    s += `<circle r="3" fill="${t.star}" fill-opacity="0.85"></circle>`
    s += `<text y="30" text-anchor="middle" font-size="10" font-weight="500" fill="${t.hintFill}">タップでひらく</text>`
    s += `</g>`
  }

  // 開封演出: 星9のバースト (実装では WebGL パーティクル)
  if (mode === 'reveal') {
    s += `<g transform="translate(${nx} ${ny})">`
    s += `<circle r="30" fill="url(#burst)"></circle>`
    s += `<path d="M 0 -36 L 2.6 0 L 0 36 L -2.6 0 Z" fill="${t.star}" fill-opacity="0.85"></path>`
    s += `<path d="M -36 0 L 0 2.6 L 36 0 L 0 -2.6 Z" fill="${t.star}" fill-opacity="0.85"></path>`
    s += `<g transform="rotate(45)"><path d="M 0 -20 L 1.6 0 L 0 20 L -1.6 0 Z" fill="${t.star}" fill-opacity="0.6"></path><path d="M -20 0 L 0 1.6 L 20 0 L 0 -1.6 Z" fill="${t.star}" fill-opacity="0.6"></path></g>`
    s += `<path d="${SPARKLE}" fill="#fff7e0"></path>`
    // 飛散パーティクル
    const parts = [
      [18, -24, 1.6, 0.8], [30, -8, 1.2, 0.6], [26, 16, 1.4, 0.7],
      [8, 30, 1.1, 0.5], [-14, 28, 1.5, 0.7], [-28, 12, 1.1, 0.55],
      [-30, -10, 1.3, 0.65], [-18, -26, 1.0, 0.5], [40, -20, 0.9, 0.4],
      [-40, 22, 0.9, 0.4], [4, -40, 1.0, 0.45], [-6, 42, 0.9, 0.4],
    ]
    for (const [dx, dy, r, o] of parts) {
      s += `<circle cx="${dx}" cy="${dy}" r="${r}" fill="${t.star}" fill-opacity="${o}"></circle>`
    }
    s += `</g>`
  }

  s += `</svg>`
  return s
}

/* ==========================================
 * ズームビュー (その日の星だけを大きく表示)
 * 期間中は全体像を見せない: 描くのは前後の星と線だけ
 * ========================================== */

// 星座座標をズームカメラでスクリーン座標へ投影
const ZOOM = { w: 390, h: 560, cx: 195, cy: 280, k: 3.8 }
const proj = (camX, camY) => ([x, y]) => [
  ZOOM.cx + (x - camX) * ZOOM.k,
  ZOOM.cy + (y - camY) * ZOOM.k,
]

// 中サイズの開封済み星 (隣に見える星)。scale はカメラ拡大率に合わせた見た目倍率
const midStar = (t, x, y, day, scale = 1) => {
  let s = `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">`
  s += `<circle r="${26 * scale}" fill="${t.star}" fill-opacity="0.12"></circle>`
  s += `<circle r="${13 * scale}" fill="${t.star}" fill-opacity="0.28"></circle>`
  s += `<path d="${sparklePath(Math.round(18 * scale))}" fill="${t.star}"></path>`
  s += `<circle r="${3 * scale}" fill="#ffffff" fill-opacity="0.9"></circle>`
  s += `<text x="${24 * scale}" y="${8 * scale}" font-size="${Math.min(22, Math.round(15 * scale))}" fill="${t.labelFill}" fill-opacity="0.75">${day}</text>`
  s += `</g>`
  return s
}

// kind: 'preopen' | 'opened' | 'travel'
const zoomSvg = (t, kind) => {
  const [nx9, ny9] = STARS[NEXT - 1]
  const [nx8, ny8] = STARS[OPENED - 1]
  const [nx10, ny10] = STARS[NEXT]

  let s = `<svg width="${ZOOM.w}" height="${ZOOM.h}" viewBox="0 0 ${ZOOM.w} ${ZOOM.h}" style="display: block">`
  s += `<defs>
    <filter id="zsoft" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.2"></feGaussianBlur></filter>
    <radialGradient id="zhalo" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${t.star}" stop-opacity="0.35"></stop>
      <stop offset="0.55" stop-color="${t.star}" stop-opacity="0.1"></stop>
      <stop offset="1" stop-color="${t.star}" stop-opacity="0"></stop>
    </radialGradient>
    <linearGradient id="zfog" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#05081a" stop-opacity="0"></stop>
      <stop offset="1" stop-color="#05081a" stop-opacity="0.9"></stop>
    </linearGradient>
  </defs>`

  // 背景の小星 (拡大した空。上下に散らす)
  for (const [x, y, r, o] of BG_STARS) {
    s += `<circle cx="${x}" cy="${(y * 560) / 520}" r="${r * 1.3}" fill="${t.bgStarFill}" fill-opacity="${o}"></circle>`
  }

  if (kind === 'travel') {
    // 9→8 へ戻る途中。日常ビューよりさらにズームインして、
    // 星は画面端で切れる = 線分の向きしか分からず全体の形は読めない
    const K_TRAVEL = 7.5
    const STAR_SCALE = 1.9
    const tPos = 0.35 // 8→9 の 35% 地点にカメラ
    const camX = nx8 + (nx9 - nx8) * tPos
    const camY = ny8 + (ny9 - ny8) * tPos
    const pt = ([x, y]) => [
      ZOOM.cx + (x - camX) * K_TRAVEL,
      ZOOM.cy + (y - camY) * K_TRAVEL,
    ]
    const [x8, y8] = pt(STARS[OPENED - 1])
    const [x9, y9] = pt(STARS[NEXT - 1])

    // 移動方向のモーションストリーク (高倍率なので長め)
    const dx = x9 - x8
    const dy = y9 - y8
    const len = Math.hypot(dx, dy)
    const ux = dx / len
    const uy = dy / len
    for (const [sx, sy, sl] of [[70, 130, 90], [230, 440, 110], [320, 90, 70], [30, 400, 64], [160, 500, 80]]) {
      s += `<line x1="${sx}" y1="${sy}" x2="${(sx + ux * sl).toFixed(1)}" y2="${(sy + uy * sl).toFixed(1)}" stroke="${t.bgStarFill}" stroke-opacity="0.16" stroke-width="1.6" stroke-linecap="round"></line>`
    }

    // 2星を結ぶ開封済みの線 (画面を横断する)
    s += `<line x1="${x8.toFixed(1)}" y1="${y8.toFixed(1)}" x2="${x9.toFixed(1)}" y2="${y9.toFixed(1)}" stroke="${t.star}" stroke-opacity="0.2" stroke-width="9" filter="url(#zsoft)"></line>`
    s += `<line x1="${x8.toFixed(1)}" y1="${y8.toFixed(1)}" x2="${x9.toFixed(1)}" y2="${y9.toFixed(1)}" stroke="${t.star}" stroke-opacity="0.8" stroke-width="2.5" stroke-linecap="round"></line>`

    // 星8は画面内寄り、星9は右端からグローだけ覗く
    s += midStar(t, x8, y8, OPENED, STAR_SCALE)
    s += midStar(t, x9, y9, NEXT, STAR_SCALE)

    s += `<text x="195" y="540" text-anchor="middle" font-size="12" fill="${t.hintFill}">スワイプで星をたどる</text>`
    s += `</svg>`
    return s
  }

  // preopen / opened: 今日の星 (9日目) がカメラ中心
  const p = proj(nx9, ny9)
  const [x8, y8] = p(STARS[OPENED - 1])

  // きのうの星への線
  if (kind === 'preopen') {
    s += `<line x1="${x8.toFixed(1)}" y1="${y8.toFixed(1)}" x2="${ZOOM.cx}" y2="${ZOOM.cy}" stroke="${t.star}" stroke-opacity="0.35" stroke-width="1.6" stroke-dasharray="3 6" stroke-linecap="round"></line>`
  } else {
    s += `<line x1="${x8.toFixed(1)}" y1="${y8.toFixed(1)}" x2="${ZOOM.cx}" y2="${ZOOM.cy}" stroke="${t.star}" stroke-opacity="0.2" stroke-width="7" filter="url(#zsoft)"></line>`
    s += `<line x1="${x8.toFixed(1)}" y1="${y8.toFixed(1)}" x2="${ZOOM.cx}" y2="${ZOOM.cy}" stroke="${t.star}" stroke-opacity="0.8" stroke-width="2" stroke-linecap="round"></line>`
  }

  // きのうの星
  s += midStar(t, x8, y8, OPENED)

  if (kind === 'preopen') {
    // 開封前: 破線の軌道リング + 淡い星のシルエット + 大きな日数
    s += `<g transform="translate(${ZOOM.cx} ${ZOOM.cy})">`
    s += `<circle r="86" fill="url(#zhalo)" opacity="0.5"></circle>`
    s += `<circle r="64" fill="none" stroke="${t.star}" stroke-opacity="0.85" stroke-width="1.6" stroke-dasharray="5 8"></circle>`
    s += `<path d="${sparklePath(46)}" fill="none" stroke="${t.star}" stroke-opacity="0.4" stroke-width="1.4"></path>`
    s += `<text y="16" text-anchor="middle" font-size="44" font-weight="700" fill="${t.star}">9</text>`
    s += `<text y="106" text-anchor="middle" font-size="14" font-weight="500" fill="${t.hintFill}">タップでひらく</text>`
    s += `</g>`
  } else {
    // 開封後: 大きく灯った星 + 次の星への予告スタブ
    const [tx, ty] = p(STARS[NEXT])
    const dx = tx - ZOOM.cx
    const dy = ty - ZOOM.cy
    const dl = Math.hypot(dx, dy)
    const sx = ZOOM.cx + (dx / dl) * 92
    const sy = ZOOM.cy + (dy / dl) * 92
    s += `<line x1="${ZOOM.cx}" y1="${ZOOM.cy}" x2="${sx.toFixed(1)}" y2="${sy.toFixed(1)}" stroke="${t.star}" stroke-opacity="0.3" stroke-width="1.4" stroke-dasharray="2 7" stroke-linecap="round"></line>`

    s += `<g transform="translate(${ZOOM.cx} ${ZOOM.cy})">`
    s += `<circle r="110" fill="url(#zhalo)"></circle>`
    s += `<path d="M 0 -96 L 4 0 L 0 96 L -4 0 Z" fill="${t.star}" fill-opacity="0.5"></path>`
    s += `<path d="M -96 0 L 0 4 L 96 0 L 0 -4 Z" fill="${t.star}" fill-opacity="0.5"></path>`
    s += `<path d="${sparklePath(56)}" fill="${t.star}"></path>`
    s += `<circle r="5" fill="#ffffff" fill-opacity="0.95"></circle>`
    s += `<text y="-136" text-anchor="middle" font-size="15" font-weight="700" letter-spacing="4" fill="${t.star}">DAY 9</text>`
    s += `</g>`
  }

  // 未来側はフォグで隠す (ネタバレ防止)
  s += `<rect x="300" y="0" width="90" height="${ZOOM.h}" fill="url(#zfog)"></rect>`

  // 左端: きのうの星へのスワイプ手掛かり
  s += `<g opacity="0.55"><path d="m 30 ${ZOOM.cy - 10} -10 10 10 10" fill="none" stroke="${t.labelFill}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></g>`

  s += `</svg>`
  return s
}

/* ==========================================
 * 画面の共通パーツ
 * ========================================== */

const iconButton = (t, inner, extra = '') =>
  `<button style="display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; padding: 0; border: ${t.btnBorder}; border-radius: 50%; background: ${t.btnBg}; color: ${t.btnFg}; cursor: pointer${extra}">${inner}</button>`

const screen = (t, body, { opened = OPENED, overlay = '' } = {}) => `<div style="position: relative; display: flex; flex-direction: column; width: 390px; height: 844px; overflow: hidden; background: ${t.bg}; font-family: ${FONT}">
  <div style="position: absolute; top: 20px; left: 20px; z-index: 2">${iconButton(t, IC_BACK)}</div>
  <div style="position: absolute; top: 20px; right: 20px; z-index: 2; display: flex; gap: 12px">${iconButton(t, IC_SETTINGS)}${iconButton(t, IC_CHAT)}</div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; padding-top: 80px; flex-shrink: 0">
    <p style="margin: 0; font-size: 15px; font-weight: 500; letter-spacing: 0.2em; line-height: 1; color: ${t.dateFg}">8/30</p>
    <h1 style="margin: 0; font-size: 30px; font-weight: 700; line-height: 1.2; letter-spacing: 0.06em; color: ${t.titleFg}${t.titleExtra ? '; ' + t.titleExtra : ''}">きなこの誕生日</h1>
  </div>
  <div style="flex-shrink: 0; margin-top: 8px">${body}</div>
  <div style="display: flex; justify-content: flex-end; padding: 4px 26px 0; font-size: 15px; font-weight: 600; letter-spacing: 0.06em; color: ${t.progressFg}">${opened} / 30 opened</div>
  <div style="position: absolute; right: 24px; bottom: 24px; z-index: 2">${iconButton(t, IC_GIFT)}</div>
${overlay}</div>`

const page = (t, content, dataProps, logicBody) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  ${FONT_LINK}
  <style>
    body { margin: 0; background: transparent; font-family: ${FONT}; }
    a { color: ${t.linkColor}; } a:hover { color: ${t.linkHover}; }
    button { font-family: inherit; }
  </style>
</helmet>
${content}
</x-dc>
<script data-dc-script data-props='${dataProps}'>
class Component extends DCLogic {
  renderVals() {
    return { ${logicBody} };
  }
}
</script>
</body>
</html>
`

/* ==========================================
 * テーマ定義
 * ========================================== */

const nightTheme = (star) => ({
  bg: 'linear-gradient(180deg, #0a0e24 0%, #131a3a 55%, #1c264d 100%)',
  btnBg: 'rgba(255, 255, 255, 0.08)',
  btnBorder: '1px solid rgba(255, 255, 255, 0.16)',
  btnFg: '#e9edff',
  dateFg: 'rgba(233, 237, 255, 0.7)',
  titleFg: '#f2ecdb',
  titleExtra: 'text-shadow: 0 0 18px rgba(255, 217, 138, 0.35)',
  progressFg: 'rgba(233, 237, 255, 0.6)',
  linkColor: '#ffd98a',
  linkHover: '#ffe7b0',
  star,
  burst: '#ffd98a',
  lineOp: '0.65',
  lockedFill: '#dfe6ff',
  labelFill: '#e9edff',
  dottedStroke: '#ffffff',
  dottedOp: '0.1',
  bgStarFill: '#ffffff',
  hintFill: 'rgba(233, 237, 255, 0.75)',
})

const lightTheme = {
  halo: '#9ef581',
  bg: 'linear-gradient(180deg, #ffffff 0%, #f4fcee 70%, #eafae0 100%)',
  btnBg: '#d9d9d9',
  btnBorder: 'none',
  btnFg: '#000000',
  dateFg: '#000000',
  titleFg: '#000000',
  titleExtra: '',
  progressFg: '#555555',
  linkColor: '#57b13f',
  linkHover: '#3d9b2a',
  star: '#5cc93e',
  burst: '#9bff7a',
  lineOp: '0.75',
  lockedFill: '#b5b5b5',
  labelFill: '#777777',
  dottedStroke: '#b7e8a7',
  dottedOp: '0.6',
  bgStarFill: '#b7e8a7',
  hintFill: '#57b13f',
}

/* ==========================================
 * 出力
 * ========================================== */

const preview = '"$preview": {"width": 390, "height": 844}'

// Main: 夜空テーマ。星の色はチップで着せ替え検証できるようにする
const nightHole = nightTheme('{{starColor}}')
writeFileSync('Main.dc.html', page(
  nightHole,
  screen(nightHole, constellationSvg(nightHole, 'main')),
  `{"starColor": {"editor": "color", "default": "#ffd98a", "options": ["#ffd98a", "#a9d7ff", "#cdb9ff", "#9ef581"]}, ${preview}}`,
  `starColor: this.props.starColor ?? '#ffd98a'`,
))

// Reveal: 開封の瞬間 (WebGL バーストの静止フレーム)
const nightFixed = nightTheme('#ffd98a')
writeFileSync('Reveal.dc.html', page(
  nightFixed,
  screen(nightFixed, constellationSvg(nightFixed, 'reveal')),
  `{${preview}}`,
  '',
))

// Popup: 開封済みの星の内容表示
const popupCard = `<div style="position: absolute; inset: 0; z-index: 3; display: flex; align-items: center; justify-content: center; background: rgba(6, 10, 28, 0.72)">
  <div style="position: relative; display: flex; flex-direction: column; align-items: center; gap: 14px; width: 320px; padding: 28px 24px 24px; border: 1px solid rgba(255, 217, 138, 0.45); border-radius: 20px; background: #101832; box-shadow: 0 0 40px rgba(255, 217, 138, 0.12)">
    <button style="position: absolute; top: 12px; right: 12px; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; padding: 0; border: none; border-radius: 50%; background: transparent; color: rgba(233, 237, 255, 0.6); cursor: pointer">${IC_CLOSE}</button>
    <p style="margin: 0; font-size: 12px; font-weight: 700; letter-spacing: 0.3em; color: #ffd98a">DAY 9</p>
    <svg width="44" height="44" viewBox="-10 -10 20 20"><circle r="9" fill="#ffd98a" fill-opacity="0.15"></circle><path d="${SPARKLE}" fill="#ffd98a"></path></svg>
    <h2 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.05em; color: #f2ecdb">9日目のおくりもの</h2>
    <p style="margin: 0; font-size: 14px; line-height: 1.7; text-align: center; color: rgba(233, 237, 255, 0.85)">たんじょうびまであと21日。きょうの星はちょっとまぶしいね。</p>
    <div style="display: flex; align-items: center; gap: 8px; padding: 8px 16px; border: 1px solid rgba(255, 217, 138, 0.35); border-radius: 999px; color: #ffd98a; font-size: 13px; font-weight: 600">${icon('<rect x="3" y="8" width="18" height="4" rx="1"></rect><path d="M12 8v13"></path><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"></path><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"></path>', 16)}<span>こんぺいとうの星</span></div>
    <button style="margin-top: 6px; padding: 10px 40px; border: none; border-radius: 999px; background: #ffd98a; color: #1c264d; font-size: 14px; font-weight: 700; letter-spacing: 0.1em; cursor: pointer">とじる</button>
  </div>
</div>`

writeFileSync('Popup.dc.html', page(
  nightFixed,
  screen(nightFixed, constellationSvg(nightFixed, 'popupbg'), { opened: NEXT, overlay: popupCard }),
  `{${preview}}`,
  '',
))

// Light: 現行の白×緑トーンに合わせた着せ替え例
writeFileSync('Light.dc.html', page(
  lightTheme,
  screen(lightTheme, constellationSvg(lightTheme, 'main')),
  `{${preview}}`,
  '',
))

/* ==========================================
 * 一星ずつ案 (期間中は全体像を隠すズームビュー)
 * ========================================== */

// Today: 今日の星・開封前
writeFileSync('Today.dc.html', page(
  nightFixed,
  screen(nightFixed, zoomSvg(nightFixed, 'preopen'), { opened: OPENED }),
  `{${preview}}`,
  '',
))

// TodayOpen: 開封後。その星の内容カード付き
const dayCard = `<div style="position: absolute; left: 50%; bottom: 92px; z-index: 2; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 10px; width: 320px; padding: 16px 20px; border: 1px solid rgba(255, 217, 138, 0.4); border-radius: 18px; background: rgba(16, 24, 50, 0.85)">
  <p style="margin: 0; font-size: 14px; line-height: 1.7; text-align: center; color: rgba(233, 237, 255, 0.9)">たんじょうびまであと21日。きょうの星はちょっとまぶしいね。</p>
  <div style="display: flex; align-items: center; gap: 8px; padding: 6px 14px; border: 1px solid rgba(255, 217, 138, 0.35); border-radius: 999px; color: #ffd98a; font-size: 12px; font-weight: 600">${icon('<rect x="3" y="8" width="18" height="4" rx="1"></rect><path d="M12 8v13"></path><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"></path><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"></path>', 15)}<span>こんぺいとうの星</span></div>
</div>`

writeFileSync('TodayOpen.dc.html', page(
  nightFixed,
  screen(nightFixed, zoomSvg(nightFixed, 'opened'), { opened: NEXT, overlay: dayCard }),
  `{${preview}}`,
  '',
))

// Travel: スワイプでとなりの星へ移動中
writeFileSync('Travel.dc.html', page(
  nightFixed,
  screen(nightFixed, zoomSvg(nightFixed, 'travel'), { opened: NEXT }),
  `{${preview}}`,
  '',
))

// Finale: 30日目開封後、ズームアウトして初めて全体像が現れる
const banterSparkle = `<svg width="18" height="18" viewBox="-9 -9 18 18"><path d="${sparklePath(8)}" fill="#ffd98a"></path></svg>`
const finaleBanner = `<div style="display: flex; align-items: center; justify-content: center; gap: 10px; padding: 6px 0 2px">${banterSparkle}<p style="margin: 0; font-size: 17px; font-weight: 700; letter-spacing: 0.25em; color: #ffd98a">星座が完成</p>${banterSparkle}</div>`

writeFileSync('Finale.dc.html', page(
  nightFixed,
  screen(nightFixed, finaleBanner + constellationSvg(nightFixed, 'finale'), { opened: STARS.length }),
  `{${preview}}`,
  '',
))

console.log('generated: Main Reveal Popup Light Today TodayOpen Travel Finale (.dc.html)')
