import { supabase } from './supabase'

export type BoardSnapshot = {
  eventId: string
  imageData: string
  updatedBy: string | null
  updatedAt: string | null
  boardEdited: boolean
}

type BoardRow = {
  event_id: string
  image_data: string
  updated_by: string
  updated_at: string
  board_edited?: boolean
}

function toSnapshot(row: BoardRow | null, eventId: string): BoardSnapshot {
  if (!row) {
    return {
      eventId,
      imageData: '',
      updatedBy: null,
      updatedAt: null,
      boardEdited: false,
    }
  }

  return {
    eventId: row.event_id,
    imageData: row.image_data ?? '',
    updatedBy: row.updated_by ?? null,
    updatedAt: row.updated_at ?? null,
    boardEdited: row.board_edited ?? Boolean(row.image_data),
  }
}

function localStorageKey(eventId: string): string {
  return `event-board:${eventId}`
}

function readLocalBoard(eventId: string): BoardSnapshot | null {
  try {
    const raw = window.localStorage.getItem(localStorageKey(eventId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as { imageData?: string; updatedAt?: string }
    if (!parsed.imageData) return null
    return {
      eventId,
      imageData: parsed.imageData,
      updatedBy: null,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      boardEdited: true,
    }
  } catch {
    return null
  }
}

function writeLocalBoard(eventId: string, imageData: string): BoardSnapshot {
  const snapshot: BoardSnapshot = {
    eventId,
    imageData,
    updatedBy: null,
    updatedAt: new Date().toISOString(),
    boardEdited: true,
  }
  try {
    window.localStorage.setItem(
      localStorageKey(eventId),
      JSON.stringify({
        imageData: snapshot.imageData,
        updatedAt: snapshot.updatedAt,
      }),
    )
  } catch (error) {
    console.error('local board save failed', error)
  }
  return snapshot
}

function isMissingBoardSchema(error: { code?: string; message?: string; status?: number } | null): boolean {
  if (!error) return false
  const message = (error.message ?? '').toLowerCase()
  return (
    error.code === 'PGRST202' ||
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    error.status === 404 ||
    message.includes('event_boards') ||
    message.includes('save_event_board') ||
    message.includes('schema cache') ||
    message.includes('could not find')
  )
}

async function fetchBoardFromSupabase(eventId: string): Promise<BoardSnapshot | null> {
  const { data, error } = await supabase
    .from('event_boards')
    .select('event_id, image_data, updated_by, updated_at')
    .eq('event_id', eventId)
    .maybeSingle()

  if (error) {
    if (isMissingBoardSchema(error)) {
      return null
    }
    throw new Error(error.message || 'ボードの取得に失敗しました')
  }

  return toSnapshot(data as BoardRow | null, eventId)
}

async function saveBoardToSupabase(
  eventId: string,
  imageData: string,
): Promise<BoardSnapshot | null> {
  const { data, error } = await supabase.rpc('save_event_board', {
    p_event_id: eventId,
    p_image_data: imageData,
  })

  if (error) {
    if (isMissingBoardSchema(error)) {
      return null
    }
    throw new Error(error.message || 'ボードの保存に失敗しました')
  }

  const row = Array.isArray(data)
    ? (data[0] as BoardRow | undefined)
    : (data as BoardRow | null)
  return toSnapshot(row ?? null, eventId)
}

/*
 * 優先順:
 * 1. Supabase（event_boards / save_event_board）— みんなで共有できる正本
 * 2. localStorage — テーブル未作成(404)のときの端末内フォールバック
 *
 * docs/supabase/event-boards.sql を適用すると 1 が有効になる。
 */
export async function fetchBoard(
  eventId: string,
  signal?: AbortSignal,
): Promise<BoardSnapshot> {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError')
  }

  try {
    const remote = await fetchBoardFromSupabase(eventId)
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }
    if (remote?.imageData) {
      return remote
    }
  } catch (error) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }
    console.warn('fetchBoard supabase unavailable, trying local', error)
  }

  return readLocalBoard(eventId) ?? toSnapshot(null, eventId)
}

export async function saveBoard(
  eventId: string,
  imageData: string,
): Promise<BoardSnapshot> {
  try {
    const remote = await saveBoardToSupabase(eventId, imageData)
    if (remote?.imageData) {
      // オフライン復帰用にローカルにもミラー
      writeLocalBoard(eventId, imageData)
      return remote
    }
  } catch (error) {
    console.warn('saveBoard supabase unavailable, saving local', error)
  }

  return writeLocalBoard(eventId, imageData)
}
