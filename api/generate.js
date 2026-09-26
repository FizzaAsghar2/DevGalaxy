import { verifyToken } from '@clerk/backend'

/**
 * Secure AI architecture generation endpoint (Vercel serverless function).
 * The AI provider key never leaves the server; the browser only ever sees the
 * validated JSON architecture.
 */

const SYSTEM_PROMPT = `You are DevGalaxy, a senior software architect.
Given a product idea you return ONLY a JSON object describing the application architecture.
Never include markdown fences, commentary or trailing text.
Schema:
{
  "projectName": string,
  "description": string,
  "pages": [{ "name": string, "description": string }],
  "features": [{ "name": string, "description": string, "relatedPages": string[], "relatedRoles": string[] }],
  "userRoles": [{ "name": string, "description": string, "permissions": string[] }],
  "frontend": string[],
  "backend": string[],
  "database": { "type": string, "tables": [{ "name": string, "description": string, "fields": string[] }] },
  "apis": [{ "name": string, "purpose": string }],
  "relationships": [{ "from": string, "to": string, "type": string }]
}
Rules: table and field names are snake_case; relationships only reference table names you emitted;
tailor every item to the user's idea; never return an empty category.`

const COMPLEXITY_HINT = {
  simple: '5-6 pages, 3-4 features, 3-4 tables, 1-2 APIs.',
  medium: '7-9 pages, 5-7 features, 5-6 tables, 2-3 APIs.',
  complex: '10-12 pages, 8-10 features, 7-9 tables, 3-5 APIs.',
}

const RATE_LIMIT = { windowMs: 60_000, max: 8 }
const hits = new Map()

function rateLimited(key) {
  const now = Date.now()
  const entry = hits.get(key)
  if (!entry || now - entry.start > RATE_LIMIT.windowMs) {
    hits.set(key, { start: now, count: 1 })
    return false
  }
  entry.count += 1
  return entry.count > RATE_LIMIT.max
}

function extractJson(text) {
  const trimmed = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '')
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON object in AI response')
  return JSON.parse(trimmed.slice(start, end + 1))
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') return JSON.parse(req.body)
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}

async function requireUser(req) {
  const secretKey = process.env.CLERK_SECRET_KEY
  if (!secretKey) return { userId: 'anonymous', enforced: false }

  const header = req.headers.authorization ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return null

  try {
    const payload = await verifyToken(token, { secretKey })
    return { userId: payload.sub, enforced: true }
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const auth = await requireUser(req)
  if (!auth) return res.status(401).json({ error: 'Sign in to generate a galaxy.' })

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? 'local'
  if (rateLimited(`${auth.userId}:${ip}`)) {
    return res.status(429).json({ error: 'Too many galaxies generated. Try again in a minute.' })
  }

  let body
  try {
    body = await readBody(req)
  } catch {
    return res.status(400).json({ error: 'Invalid request body.' })
  }

  const idea = typeof body.idea === 'string' ? body.idea.trim() : ''
  if (idea.length < 12) return res.status(400).json({ error: 'Describe your idea in at least 12 characters.' })
  if (idea.length > 1200) return res.status(400).json({ error: 'Please keep your idea under 1200 characters.' })

  const apiKey = process.env.AI_API_KEY
  if (!apiKey) {
    return res.status(503).json({ error: 'AI_API_KEY is not configured on the server.', code: 'ai_not_configured' })
  }

  const baseUrl = (process.env.AI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '')
  const model = process.env.AI_MODEL ?? 'gpt-4o-mini'
  const complexity = ['simple', 'medium', 'complex'].includes(body.complexity) ? body.complexity : 'medium'
  const appType = typeof body.appType === 'string' ? body.appType.slice(0, 40) : 'Website'

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.6,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Application type: ${appType}\nComplexity: ${complexity} (${COMPLEXITY_HINT[complexity]})\nIdea: ${idea}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      console.error('AI provider error', response.status, detail.slice(0, 500))
      return res.status(502).json({ error: 'The AI provider rejected the request.' })
    }

    const payload = await response.json()
    const content = payload.choices?.[0]?.message?.content
    if (!content) return res.status(502).json({ error: 'The AI returned an empty response.' })

    return res.status(200).json({ architecture: extractJson(content), model })
  } catch (error) {
    console.error('AI generation failed', error)
    return res.status(502).json({ error: 'Could not generate an architecture right now.' })
  }
}
