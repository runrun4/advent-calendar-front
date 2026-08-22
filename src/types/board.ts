export type BoardConnectionStatus = 'connecting' | 'connected' | 'error'

export type BoardPoint = {
  x: number
  y: number
}

export type BoardStrokeSegment = {
  strokeId: string
  userId: string
  color: string
  width: number
  tool: 'pen' | 'eraser'
  from: BoardPoint
  to: BoardPoint
}

export const BOARD_BROADCAST_EVENT = 'stroke'
