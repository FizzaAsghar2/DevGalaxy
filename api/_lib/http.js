export async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}')
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}

export function send(res, status, body) {
  res.setHeader('cache-control', 'no-store')
  return res.status(status).json(body)
}

export function clientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? req.socket?.remoteAddress ?? 'local'
}

const RATE_WINDOW_MS = 60_000
const hits = new Map()

/** Per-instance burst limiter; durable limits are enforced in Postgres. */
export function rateLimited(key, max = 8) {
  const now = Date.now()
  const entry = hits.get(key)
  if (!entry || now - entry.start > RATE_WINDOW_MS) {
    hits.set(key, { start: now, count: 1 })
    return false
  }
  entry.count += 1
  return entry.count > max
}

const inFlight = new Set()

/** Rejects a second concurrent expensive request from the same user on this instance. */
export async function exclusive(key, fn) {
  if (inFlight.has(key)) return { busy: true }
  inFlight.add(key)
  try {
    return { busy: false, value: await fn() }
  } finally {
    inFlight.delete(key)
  }
}

export function extractJson(text) {
  const trimmed = String(text).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '')
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON object in AI response')
  return JSON.parse(trimmed.slice(start, end + 1))
}
