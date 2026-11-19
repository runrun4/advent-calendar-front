#!/usr/bin/env node

/**
 * Local-only sticker API helper.
 *
 * Examples:
 *   node scripts/debug-sticker-api.mjs \
 *     --email test@example.com --password 'password' --event <event-id> --open
 *   node scripts/debug-sticker-api.mjs \
 *     --email test@example.com --password 'password' --event <event-id> --open --place-first
 *
 * The script uses the same Supabase login and HTTP API as the frontend. It
 * never reads or writes the database directly and never prints the access
 * token. `--place-first` is intentionally opt-in because it creates a board
 * item in the selected event.
 */

import fs from 'node:fs'
import crypto from 'node:crypto'
import path from 'node:path'
import process from 'node:process'

function loadEnv(filePath) {
  const values = {}
  if (!fs.existsSync(filePath)) return values

  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/)
    if (!match) continue
    values[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
  }
  return values
}

function parseArgs(argv) {
  const options = { open: false, placeFirst: false, verifyBoard: false }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--open') {
      options.open = true
      continue
    }
    if (arg === '--place-first') {
      options.placeFirst = true
      continue
    }
    if (arg === '--verify-board') {
      options.verifyBoard = true
      continue
    }
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const value = argv[index + 1]
      if (!value || value.startsWith('--')) {
        throw new Error(`${arg} requires a value`)
      }
      options[key] = value
      index += 1
    }
  }
  return options
}

async function readResponse(response) {
  const text = await response.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  if (!response.ok) {
    const message =
      body && typeof body === 'object' && body.message
        ? body.message
        : `${response.status} ${response.statusText}`
    throw new Error(`${message} (${response.url})`)
  }
  return body
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const env = {
    ...loadEnv(path.resolve(process.cwd(), '.env')),
    ...loadEnv(path.resolve(process.cwd(), '.env.production')),
  }

  const email = options.email
  const password = options.password
  const eventId = options.event
  if (!email || !password || !eventId) {
    throw new Error(
      '--email, --password, and --event are required. Use --open to open sticker days.',
    )
  }

  const supabaseUrl = env.VITE_SUPABASE_URL
  const supabaseKey = env.VITE_SUPABASE_ANON_KEY
  const apiBaseUrl = (env.VITE_API_BASE_URL || '').replace(/\/$/, '')
  if (!supabaseUrl || !supabaseKey || !apiBaseUrl) {
    throw new Error(
      'VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and VITE_API_BASE_URL are required in .env.',
    )
  }

  const authResponse = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    },
  )
  const auth = await readResponse(authResponse)
  if (!auth?.access_token) throw new Error('Supabase login returned no access token')

  const api = async (requestPath, init = {}) => {
    const headers = new Headers(init.headers)
    headers.set('authorization', `Bearer ${auth.access_token}`)
    headers.set('accept', 'application/json')
    if (init.body !== undefined) headers.set('content-type', 'application/json')
    return readResponse(
      await fetch(`${apiBaseUrl}${requestPath}`, { ...init, headers }),
    )
  }

  let calendar = await api(`/v1/events/${eventId}/calendar`)
  const stickerDays = (calendar.days ?? []).filter(
    (day) => day.contentKind === 'STICKER',
  )
  console.log(
    `calendar: ${calendar.days?.length ?? 0} days, ${stickerDays.length} visible sticker days`,
  )

  if (options.open) {
    for (const day of stickerDays) {
      if (day.openedAt) continue
      try {
        await api(`/v1/events/${eventId}/days/${day.id}/open`, {
          method: 'POST',
          headers: { 'idempotency-key': `codex-debug-${day.id}` },
        })
        console.log(`opened sticker day ${day.position} (${day.date})`)
      } catch (error) {
        console.warn(`could not open day ${day.position}: ${error.message}`)
      }
    }
  }

  const collections = await api(`/v1/events/${eventId}/collections`)
  const stickers = collections.stickers ?? []
  console.log(`collections: ${stickers.length} sticker(s)`)
  for (const item of stickers) {
    console.log(`- ${item.sticker.id}: ${item.sticker.name} (${item.sticker.imageUrl ?? 'no image'})`)
  }

  if (options.placeFirst) {
    const first = stickers[0]
    if (!first) throw new Error('No collected sticker is available to place')
    const clientItemId = crypto.randomUUID()
    const boardItem = await api(`/v1/events/${eventId}/board/items`, {
      method: 'POST',
      body: JSON.stringify({
        clientItemId,
        kind: 'STICKER',
        payload: {
          stickerId: first.sticker.id,
          x: 0.5,
          y: 0.5,
          scale: 0.2,
          rotation: 0,
        },
      }),
    })
    console.log(`placed sticker board item ${boardItem.id ?? clientItemId}`)
  }

  if (options.verifyBoard) {
    const board = await api(`/v1/events/${eventId}/board`)
    const items = board.items ?? []
    console.log(`board: ${items.length} item(s)`)
    for (const item of items) {
      if (item.kind !== 'STICKER') continue
      console.log(`- sticker board item ${item.id}: ${item.payload.stickerId}`)
    }
  }
}

main().catch((error) => {
  console.error(`debug-sticker-api: ${error.message}`)
  process.exitCode = 1
})
