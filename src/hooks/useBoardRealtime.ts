import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { getAccessToken } from '../services/authService'
import { supabase } from '../services/supabase'
import {
  BOARD_BROADCAST_EVENT,
  type BoardConnectionStatus,
  type BoardStrokeSegment,
} from '../types/board'

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

type UseBoardRealtimeOptions = {
  onRemoteSegment: (segment: BoardStrokeSegment) => void
}

export function useBoardRealtime(
  eventId: string,
  { onRemoteSegment }: UseBoardRealtimeOptions,
) {
  const [connectionStatus, setConnectionStatus] =
    useState<BoardConnectionStatus>('connecting')
  const [error, setError] = useState<string | null>(null)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const onRemoteRef = useRef(onRemoteSegment)
  onRemoteRef.current = onRemoteSegment

  useEffect(() => {
    let channel: RealtimeChannel | null = null
    let cancelled = false

    const subscribe = async () => {
      setConnectionStatus('connecting')
      setError(null)

      const token = await getAccessToken()
      if (cancelled) return

      if (!token) {
        setConnectionStatus('error')
        setError('ログインが必要です')
        return
      }

      await supabase.realtime.setAuth(token)
      if (cancelled) return

      await removeBoardChannels(eventId)
      if (cancelled) return

      channel = supabase
        .channel(channelTopic(eventId), {
          config: {
            broadcast: { self: false },
          },
        })
        .on(
          'broadcast',
          { event: BOARD_BROADCAST_EVENT },
          ({ payload }) => {
            onRemoteRef.current(payload as BoardStrokeSegment)
          },
        )
        .subscribe((status, err) => {
          if (cancelled) return

          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected')
            return
          }

          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error('[board realtime]', status, err)
            setConnectionStatus('error')
            setError('WebSocket 接続に失敗しました')
            return
          }

          if (status === 'CLOSED') {
            setConnectionStatus('connecting')
          }
        })

      channelRef.current = channel
    }

    void subscribe()

    return () => {
      cancelled = true
      const activeChannel = channel
      channel = null
      channelRef.current = null
      if (activeChannel) {
        void supabase.removeChannel(activeChannel)
      }
    }
  }, [eventId])

  const broadcastSegment = useCallback((segment: BoardStrokeSegment) => {
    const channel = channelRef.current
    if (!channel) return

    void channel.send({
      type: 'broadcast',
      event: BOARD_BROADCAST_EVENT,
      payload: segment,
    })
  }, [])

  return {
    connectionStatus,
    error,
    broadcastSegment,
  }
}
