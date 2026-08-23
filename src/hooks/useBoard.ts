import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { getSession } from '../services/authService'
import { supabase } from '../services/supabase'
import { listEventMembers } from '../services/eventApi'
import {
  addBoardItem,
  deleteBoardItem,
  getBoard,
  normalizeBoardItemImages,
  normalizeStickerPayload,
  normalizeStrokePayload,
  type BoardItem,
  type BoardItemKind,
  type BoardItemPayload,
  type BoardOrientation,
  type BoardUser,
  type StickerPayload,
  type StrokePayload,
} from '../services/boardApi'

export type BoardConnectionStatus = 'connecting' | 'connected' | 'error'

const UNKNOWN_USER: BoardUser = {
  id: '',
  displayName: 'メンバー',
  avatarUrl: null,
}

/** Realtime で届く board_items の行(DBの列名そのまま)。 */
type BoardItemRow = {
  id: string
  event_id: string
  created_by: string
  client_item_id: string
  kind: string
  payload: unknown
  z_index: number
  created_at: string
}

/**
 * Realtime の timestamptz は `2026-08-23 12:34:56.789+00` のようなDBのテキスト形式で届く。
 * REST 経由の RFC3339 と混ぜても比較できるよう ISO に揃える。
 */
export function normalizeTimestamp(raw: unknown): string {
  if (typeof raw !== 'string' || raw === '') {
    return new Date().toISOString()
  }

  let text = raw.trim().replace(' ', 'T')

  if (/[+-]\d{2}$/.test(text)) {
    // `+00` は Date.parse が解釈しないので `+00:00` にする。
    text += ':00'
  } else if (/[+-]\d{4}$/.test(text)) {
    text = `${text.slice(0, -2)}:${text.slice(-2)}`
  } else if (!/(Z|[+-]\d{2}:\d{2})$/.test(text)) {
    // タイムゾーンが無い形式は UTC とみなす(DBは timestamptz なので実体はUTC)。
    text += 'Z'
  }

  const parsed = Date.parse(text)
  return Number.isNaN(parsed) ? raw : new Date(parsed).toISOString()
}

function itemFromRealtimeRow(
  row: BoardItemRow,
  members: Map<string, BoardUser>,
): BoardItem | null {
  if (row.kind !== 'STROKE' && row.kind !== 'STICKER') {
    // PHOTO などクライアントが描けない種別は無視する。
    return null
  }

  const base = {
    id: row.id,
    eventId: row.event_id,
    createdBy: members.get(row.created_by) ?? {
      ...UNKNOWN_USER,
      id: row.created_by,
    },
    zIndex: row.z_index,
    createdAt: normalizeTimestamp(row.created_at),
  }

  return row.kind === 'STROKE'
    ? { ...base, kind: 'STROKE', payload: row.payload as StrokePayload }
    : normalizeBoardItemImages({
        ...base,
        kind: 'STICKER',
        payload: row.payload as StickerPayload,
      })
}

function sortItems(items: BoardItem[]): BoardItem[] {
  return [...items].sort((a, b) => {
    if (a.zIndex !== b.zIndex) return a.zIndex - b.zIndex
    const byTime = a.createdAt.localeCompare(b.createdAt)
    if (byTime !== 0) return byTime
    return a.id.localeCompare(b.id)
  })
}

function nextZIndex(items: BoardItem[]): number {
  return items.reduce((max, item) => Math.max(max, item.zIndex), 0) + 1
}

function channelTopic(eventId: string): string {
  return `board:${eventId}`
}

async function removeBoardChannels(eventId: string): Promise<void> {
  const topic = `realtime:${channelTopic(eventId)}`
  const existing = supabase
    .getChannels()
    .filter((channel) => channel.topic === topic)

  await Promise.all(existing.map((channel) => supabase.removeChannel(channel)))
}

/**
 * イベントボードの読み込み・購読・書き込みをまとめたフック。
 *
 * - 初期表示は GET /board。書き込みは必ず Go API 経由。
 * - 他メンバーの追加/削除だけ Supabase Realtime で受け取る。
 * - 自分の追加は POST を待たずに描いて(楽観的追加)、レスポンスで確定させる。
 */
export function useBoard(eventId: string, refreshKey = 0) {
  const [items, setItems] = useState<BoardItem[]>([])
  const [orientation, setOrientation] = useState<BoardOrientation | null>(null)
  const [boardEdited, setBoardEdited] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] =
    useState<BoardConnectionStatus>('connecting')
  const [pendingCount, setPendingCount] = useState(0)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const membersRef = useRef<Map<string, BoardUser>>(new Map())
  /** サーバー確定済みidの集合。Realtime の再送を捨てるために使う。 */
  const knownIdsRef = useRef<Set<string>>(new Set())
  /** 自分が送った clientItemId。自分の追加が Realtime で二重に来るのを防ぐ。 */
  const ownClientItemIdsRef = useRef<Set<string>>(new Set())
  /** ローカルで削除済みのid。再取得で復活させないために使う。 */
  const removedIdsRef = useRef<Set<string>>(new Set())
  const pendingCountRef = useRef(0)
  const currentUserRef = useRef<BoardUser>(UNKNOWN_USER)

  const mergeItems = useCallback(
    (current: BoardItem[], incoming: BoardItem[]): BoardItem[] => {
      const byId = new Map<string, BoardItem>()
      for (const item of current) {
        byId.set(item.id, item)
      }
      for (const item of incoming) {
        if (removedIdsRef.current.has(item.id)) continue
        byId.set(item.id, item)
      }
      return sortItems([...byId.values()])
    },
    [],
  )

  const loadBoard = useCallback(
    async (signal?: AbortSignal) => {
      const board = await getBoard(eventId, signal)
      for (const item of board.items ?? []) {
        knownIdsRef.current.add(item.id)
      }
      setOrientation(board.boardOrientation ?? null)
      setBoardEdited(board.boardEdited ?? false)
      setItems((current) => mergeItems(current, board.items ?? []))
    },
    [eventId, mergeItems],
  )

  const loadMembers = useCallback(
    async (signal?: AbortSignal) => {
      const data = await listEventMembers(eventId, signal)
      const members = new Map<string, BoardUser>()
      for (const member of data.members ?? []) {
        members.set(member.user.id, {
          id: member.user.id,
          displayName: member.user.displayName,
          avatarUrl: member.user.avatarUrl,
        })
      }
      membersRef.current = members
    },
    [eventId],
  )

  useEffect(() => {
    const controller = new AbortController()

    knownIdsRef.current = new Set()
    ownClientItemIdsRef.current = new Set()
    removedIdsRef.current = new Set()

    const bootstrap = async () => {
      setIsLoading(true)
      setError(null)
      setItems([])

      try {
        const session = await getSession()
        if (controller.signal.aborted) return

        if (session?.user) {
          currentUserRef.current = {
            id: session.user.id,
            displayName:
              (session.user.user_metadata?.display_name as string | undefined) ??
              'あなた',
            avatarUrl: null,
          }
          setCurrentUserId(session.user.id)
        }

        // メンバー情報は Realtime 行に作成者名が乗らないための補完。失敗しても描画は続ける。
        await loadMembers(controller.signal).catch((membersError) => {
          console.error('GET /v1/events/members failed', membersError)
        })
        if (controller.signal.aborted) return

        await loadBoard(controller.signal)
      } catch (loadError) {
        if (controller.signal.aborted) return
        console.error('GET /v1/events/board failed', loadError)
        setError('ボードの読み込みに失敗しました')
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void bootstrap()

    return () => {
      controller.abort()
    }
  }, [eventId, refreshKey, loadBoard, loadMembers])

  useEffect(() => {
    let channel: RealtimeChannel | null = null
    let cancelled = false

    const applyInsert = (row: BoardItemRow) => {
      if (ownClientItemIdsRef.current.has(row.client_item_id)) return
      if (knownIdsRef.current.has(row.id)) return

      const item = itemFromRealtimeRow(row, membersRef.current)
      if (!item) return

      knownIdsRef.current.add(item.id)
      setItems((current) => mergeItems(current, [item]))
    }

    const applyDelete = (row: Partial<BoardItemRow>) => {
      if (!row.id) return
      // REPLICA IDENTITY が FULL のときだけ event_id が入る。あれば他イベント分を弾く。
      if (row.event_id && row.event_id !== eventId) return

      knownIdsRef.current.delete(row.id)
      removedIdsRef.current.add(row.id)
      setItems((current) => current.filter((item) => item.id !== row.id))
    }

    const subscribe = async () => {
      setConnectionStatus('connecting')

      // StrictMode の二重マウントで古いチャンネルが残ると subscribe コールバックが来ない。
      await removeBoardChannels(eventId)
      if (cancelled) return

      channel = supabase
        .channel(channelTopic(eventId))
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'board_items',
            filter: `event_id=eq.${eventId}`,
          },
          (payload) => {
            applyInsert(payload.new as BoardItemRow)
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'board_items',
          },
          (payload) => {
            applyDelete(payload.old as Partial<BoardItemRow>)
          },
        )
        .subscribe((status, err) => {
          if (cancelled) return

          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected')
            // 切断中の追加は再送されないので、購読が張れた時点で取り直して埋める。
            // 送信中のものがあると楽観的追加と二重に見えるので、その間は見送る。
            if (pendingCountRef.current === 0) {
              void loadBoard().catch((refreshError) => {
                console.error('board refresh after subscribe failed', refreshError)
              })
            }
            return
          }

          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error('[board realtime]', status, err)
            setConnectionStatus('error')
            return
          }

          if (status === 'CLOSED') {
            setConnectionStatus('connecting')
          }
        })
    }

    void subscribe()

    return () => {
      cancelled = true
      const activeChannel = channel
      channel = null
      if (activeChannel) {
        void supabase.removeChannel(activeChannel)
      }
    }
  }, [eventId, loadBoard, mergeItems])

  const addItem = useCallback(
    async (kind: BoardItemKind, payload: BoardItemPayload): Promise<BoardItem> => {
      const clientItemId = crypto.randomUUID()
      const localId = `local:${clientItemId}`
      ownClientItemIdsRef.current.add(clientItemId)

      const optimistic = {
        id: localId,
        eventId,
        createdBy: currentUserRef.current,
        createdAt: new Date().toISOString(),
        pending: true,
        ...(kind === 'STROKE'
          ? { kind: 'STROKE' as const, payload: payload as StrokePayload }
          : { kind: 'STICKER' as const, payload: payload as StickerPayload }),
      }

      setError(null)
      setPendingCount((count) => count + 1)
      pendingCountRef.current += 1
      setItems((current) =>
        sortItems([...current, { ...optimistic, zIndex: nextZIndex(current) }]),
      )

      try {
        const saved = await addBoardItem(eventId, {
          clientItemId,
          kind,
          payload,
        })
        knownIdsRef.current.add(saved.id)
        setItems((current) =>
          mergeItems(
            current.filter((item) => item.id !== localId),
            [saved],
          ),
        )
        setBoardEdited(true)
        return saved
      } catch (addError) {
        console.error('POST /v1/events/board/items failed', addError)
        ownClientItemIdsRef.current.delete(clientItemId)
        setItems((current) => current.filter((item) => item.id !== localId))
        const detail =
          addError instanceof Error && addError.message
            ? ` (${addError.message})`
            : ''
        setError(`保存に失敗しました${detail}`)
        throw addError
      } finally {
        pendingCountRef.current -= 1
        setPendingCount((count) => Math.max(0, count - 1))
      }
    },
    [eventId, mergeItems],
  )

  const addStroke = useCallback(
    (payload: StrokePayload) =>
      addItem('STROKE', normalizeStrokePayload(payload)),
    [addItem],
  )

  const addSticker = useCallback(
    (payload: StickerPayload) =>
      addItem('STICKER', normalizeStickerPayload(payload)),
    [addItem],
  )

  const removeItem = useCallback(
    async (item: BoardItem): Promise<void> => {
      // 確定前のものはサーバー上のidが無いので消せない。
      if (item.pending) return

      setError(null)
      removedIdsRef.current.add(item.id)
      setItems((current) => current.filter((entry) => entry.id !== item.id))

      try {
        await deleteBoardItem(eventId, item.id)
        knownIdsRef.current.delete(item.id)
      } catch (deleteError) {
        console.error('DELETE /v1/events/board/items failed', deleteError)
        removedIdsRef.current.delete(item.id)
        setItems((current) => mergeItems(current, [item]))
        setError('削除に失敗しました')
        throw deleteError
      }
    },
    [eventId, mergeItems],
  )

  const clearError = useCallback(() => setError(null), [])

  return {
    items,
    orientation,
    boardEdited,
    isLoading,
    error,
    connectionStatus,
    pendingCount,
    currentUserId,
    addStroke,
    addSticker,
    removeItem,
    clearError,
  }
}
