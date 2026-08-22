import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { getAccessToken } from '../services/authService'
import { fetchMessages, sendMessage as sendMessageApi } from '../services/chatService'
import { listEventMembers } from '../services/eventApi'
import { supabase } from '../services/supabase'
import type {
  ChatConnectionStatus,
  ChatMessage,
  ChatUser,
} from '../types/chat'
import { messageFromRealtimeRow } from '../types/chat'

function sortMessages(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].sort((a, b) => {
    const byTime = a.sentAt.localeCompare(b.sentAt)
    if (byTime !== 0) return byTime
    return a.id.localeCompare(b.id)
  })
}

function mergeMessages(
  current: ChatMessage[],
  incoming: ChatMessage[],
): ChatMessage[] {
  const byId = new Map<string, ChatMessage>()
  for (const message of current) {
    byId.set(message.id, message)
  }
  for (const message of incoming) {
    byId.set(message.id, message)
  }
  return sortMessages([...byId.values()])
}

export function useChat(eventId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [connectionStatus, setConnectionStatus] =
    useState<ChatConnectionStatus>('connecting')
  const [error, setError] = useState<string | null>(null)

  const membersRef = useRef<Map<string, ChatUser>>(new Map())
  const knownKeysRef = useRef<Set<string>>(new Set())

  const rememberMessage = useCallback((message: ChatMessage) => {
    knownKeysRef.current.add(message.id)
    knownKeysRef.current.add(message.clientMessageId)
  }, [])

  const upsertMessage = useCallback(
    (message: ChatMessage) => {
      if (
        knownKeysRef.current.has(message.id) ||
        knownKeysRef.current.has(message.clientMessageId)
      ) {
        return
      }
      rememberMessage(message)
      setMessages((current) => mergeMessages(current, [message]))
    },
    [rememberMessage],
  )

  const loadHistory = useCallback(async (signal?: AbortSignal) => {
    const history = await fetchMessages(eventId, signal)
    for (const message of history) {
      rememberMessage(message)
    }
    setMessages((current) => mergeMessages(current, history))
  }, [eventId, rememberMessage])

  const loadMembers = useCallback(async (signal?: AbortSignal) => {
    const data = await listEventMembers(eventId, signal)
    const members = new Map<string, ChatUser>()
    for (const member of data.members) {
      members.set(member.user.id, {
        id: member.user.id,
        displayName: member.user.displayName,
        avatarUrl: member.user.avatarUrl,
      })
    }
    membersRef.current = members
  }, [eventId])

  useEffect(() => {
    const controller = new AbortController()
    knownKeysRef.current = new Set()

    const bootstrap = async () => {
      setIsLoading(true)
      setError(null)
      setMessages([])

      try {
        await loadMembers(controller.signal)
        await loadHistory(controller.signal)
      } catch (loadError) {
        if (controller.signal.aborted) return
        console.error('chat bootstrap failed', loadError)
        setError('メッセージの取得に失敗しました')
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
  }, [eventId, loadHistory, loadMembers])

  useEffect(() => {
    let channel: RealtimeChannel | null = null
    let cancelled = false

    const subscribe = async () => {
      setConnectionStatus('connecting')

      const token = await getAccessToken()
      if (!token) {
        setConnectionStatus('error')
        setError('ログインが必要です')
        return
      }

      supabase.realtime.setAuth(token)

      channel = supabase
        .channel(`chat:${eventId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `event_id=eq.${eventId}`,
          },
          (payload) => {
            const row = payload.new as {
              id: string
              event_id: string
              client_message_id: string
              sender_user_id: string
              body: string
              sent_at: string
            }
            upsertMessage(messageFromRealtimeRow(row, membersRef.current))
          },
        )
        .subscribe((status) => {
          if (cancelled) return

          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected')
            void loadHistory().catch((refreshError) => {
              console.error('chat refresh after subscribe failed', refreshError)
            })
            return
          }

          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setConnectionStatus('error')
            return
          }

          setConnectionStatus('connecting')
        })
    }

    void subscribe()

    return () => {
      cancelled = true
      if (channel) {
        void supabase.removeChannel(channel)
      }
    }
  }, [eventId, loadHistory, upsertMessage])

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isSending) return

      setIsSending(true)
      setError(null)

      const clientMessageId = crypto.randomUUID()

      try {
        const message = await sendMessageApi(
          eventId,
          clientMessageId,
          trimmed,
        )
        upsertMessage(message)
      } catch (sendError) {
        console.error('send chat message failed', sendError)
        setError('送信に失敗しました')
        throw sendError
      } finally {
        setIsSending(false)
      }
    },
    [eventId, isSending, upsertMessage],
  )

  return {
    messages,
    isLoading,
    isSending,
    connectionStatus,
    error,
    sendMessage,
  }
}
