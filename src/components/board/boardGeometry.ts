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
