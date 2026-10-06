import { extractJson } from './http.js'

export function isAiConfigured() {
  return Boolean(process.env.AI_API_KEY)
}

export function aiModel() {
  return process.env.AI_MODEL ?? 'gpt-4o-mini'
}

/** Calls an OpenAI-compatible chat completion and returns parsed JSON. */
export async function completeJson({ system, user, temperature = 0.6 }) {
  const baseUrl = (process.env.AI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '')
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.AI_API_KEY}` },
    body: JSON.stringify({
      model: aiModel(),
      temperature,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!response.ok) {
    const detail = await response.text()
    console.error('AI provider error', response.status, detail.slice(0, 500))
    throw new Error('ai_provider_error')
  }
  const payload = await response.json()
  const content = payload.choices?.[0]?.message?.content
  if (!content) throw new Error('ai_empty_response')
  return extractJson(content)
}
