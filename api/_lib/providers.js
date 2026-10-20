/**
 * Provider abstraction for Galaxy Studio. One provider is configured at a time
 * through server-only env vars; keys never reach the browser, generated files or
 * exports. Supported: OpenAI-compatible (default), Anthropic, Google Gemini.
 */
import { extractJson } from './http.js'

const DEFAULT_MODELS = { openai: 'gpt-4o-mini', anthropic: 'claude-3-5-haiku-latest', gemini: 'gemini-2.0-flash' }

export function providerConfig() {
  const raw = String(process.env.AI_PROVIDER ?? 'openai').toLowerCase()
  const provider = Object.hasOwn(DEFAULT_MODELS, raw) ? raw : 'openai'
  return {
    provider,
    configured: Boolean(process.env.AI_API_KEY),
    model: process.env.AI_MODEL || DEFAULT_MODELS[provider],
    fastModel: process.env.AI_MODEL_FAST || process.env.AI_MODEL || DEFAULT_MODELS[provider],
  }
}

async function call(url, init) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(Number(process.env.AI_TIMEOUT_MS) || 90_000) })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    console.error('AI provider error', response.status, detail.slice(0, 400))
    const error = new Error(response.status === 401 || response.status === 403 ? 'ai_auth_error' : response.status === 429 ? 'ai_rate_limited' : 'ai_provider_error')
    error.status = response.status
    throw error
  }
  return response.json()
}

/**
 * Sends one JSON-producing request to the configured provider.
 * @returns {Promise<{ data: any, tokens: number | null, provider: string, model: string }>}
 */
export async function completeStudioJson({ system, user, temperature = 0.6, maxTokens = 4000, fast = false }) {
  const { provider, model: main, fastModel } = providerConfig()
  const model = fast ? fastModel : main
  const key = process.env.AI_API_KEY
  let text = ''
  let tokens = null
  if (provider === 'anthropic') {
    const payload = await call(`${(process.env.AI_BASE_URL || 'https://api.anthropic.com/v1').replace(/\/$/, '')}/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: maxTokens, temperature, system: `${system}\nRespond with a single JSON object only.`, messages: [{ role: 'user', content: user }] }),
    })
    text = payload.content?.map((part) => part.text ?? '').join('') ?? ''
    tokens = (payload.usage?.input_tokens ?? 0) + (payload.usage?.output_tokens ?? 0) || null
  } else if (provider === 'gemini') {
    const base = (process.env.AI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '')
    const payload = await call(`${base}/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { temperature, maxOutputTokens: maxTokens, responseMimeType: 'application/json' },
      }),
    })
    text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? ''
    tokens = Number(payload.usageMetadata?.totalTokenCount) || null
  } else {
    const payload = await call(`${(process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model, temperature, max_tokens: maxTokens, response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      }),
    })
    text = payload.choices?.[0]?.message?.content ?? ''
    tokens = Number(payload.usage?.total_tokens) || null
  }
  if (!text) throw new Error('ai_empty_response')
  return { data: extractJson(text), tokens, provider, model }
}
