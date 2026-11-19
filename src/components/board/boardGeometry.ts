import { clampUnit, type BoardOrientation, type BoardPoint } from '../../services/boardApi'

export type BoardViewBox = {
  width: number
  height: number
}

/**
 * SVG の viewBox。契約の PORTRAIT=3:4 / LANDSCAPE=4:3 に合わせる。
 * 1 viewBox 単位は両軸で同じ物理長になるので、ここで作った正方形は画面上でも正方形。
 */
const PORTRAIT_VIEW_BOX: BoardViewBox = { width: 300, height: 400 }
const LANDSCAPE_VIEW_BOX: BoardViewBox = { width: 400, height: 300 }

export function boardViewBox(orientation: BoardOrientation): BoardViewBox {
  return orientation === 'LANDSCAPE' ? LANDSCAPE_VIEW_BOX : PORTRAIT_VIEW_BOX
}

export function boardAspectClass(orientation: BoardOrientation): string {
  return orientation === 'LANDSCAPE'
    ? 'board-canvas--landscape'
    : 'board-canvas--portrait'
}

/**
 * ステッカー全体ができるだけボード内に収まるよう、中心座標を補正する。
 *
 * scale はボード幅基準なので、縦方向の余白はボードの縦横比も加味する。
 * 回転時は正方形の外接矩形を使い、端へ置いたときの画像切れを防ぐ。
 */
export function clampStickerCenter(
  point: BoardPoint,
  scale: number,
  rotation: number,
  orientation: BoardOrientation,
): BoardPoint {
  const viewBox = boardViewBox(orientation)
  const safeScale = Number.isFinite(scale) ? Math.max(0, scale) : 0
  const safeRotation = Number.isFinite(rotation) ? rotation : 0
  const radians = (safeRotation * Math.PI) / 180
  const rotatedSizeRatio =
    safeScale * (Math.abs(Math.cos(radians)) + Math.abs(Math.sin(radians)))
  const halfWidth = rotatedSizeRatio / 2
  const halfHeight = (rotatedSizeRatio * viewBox.width) / viewBox.height / 2

  return {
    x: clampCenterCoordinate(point.x, halfWidth),
    y: clampCenterCoordinate(point.y, halfHeight),
  }
}

function clampCenterCoordinate(value: number, margin: number): number {
  if (!Number.isFinite(value)) return 0.5
  if (margin >= 0.5) return 0.5
  return Math.min(1 - margin, Math.max(margin, value))
}

/**
 * 画面座標を 0..1 の正規化座標へ変換する。
 *
 * getBoundingClientRect ではなく getScreenCTM を使うのは、
 * preserveAspectRatio による余白(レターボックス)が出ても
 * viewBox 基準で正確に対応付けられるようにするため。
 */
export function clientPointToBoardPoint(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
  viewBox: BoardViewBox,
): BoardPoint | null {
  const screenCtm = svg.getScreenCTM()
  if (!screenCtm) return null

  const local = new DOMPoint(clientX, clientY).matrixTransform(screenCtm.inverse())

  return {
    x: clampUnit(local.x / viewBox.width),
    y: clampUnit(local.y / viewBox.height),
  }
}

/** 正規化座標の列を viewBox 単位の `points` 属性へ変換する。 */
export function toPolylinePoints(
  points: BoardPoint[],
  viewBox: BoardViewBox,
): string {
  return points
    .map(
      (point) =>
        `${round2(point.x * viewBox.width)},${round2(point.y * viewBox.height)}`,
    )
    .join(' ')
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
