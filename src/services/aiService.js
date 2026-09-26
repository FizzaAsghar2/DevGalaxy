import { normaliseArchitecture, validateArchitecture } from './architectureSchema'
import { generateLocalArchitecture } from './localArchitecture'

/**
 * Calls the secure `/api/generate` serverless function. When that endpoint is
 * unavailable (local `vite dev` without `vercel dev`, or no AI key configured)
 * we fall back to the offline generator and flag the result as `demo`.
 */
export async function generateArchitecture({ idea, appType, complexity, getToken }) {
  const fallback = () => ({
    architecture: normaliseArchitecture(generateLocalArchitecture(idea, { appType, complexity }), 'Untitled Project'),
    source: 'demo',
  })

  let response
  try {
    const token = getToken ? await getToken().catch(() => null) : null
    response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ idea, appType, complexity }),
    })
  } catch {
    return fallback()
  }

  if (!response.ok) {
    // 4xx that the user can act on should surface; infrastructure gaps fall back.
    if ([400, 401, 429].includes(response.status)) {
      const detail = await response.json().catch(() => ({}))
      throw new Error(detail.error ?? 'Generation failed.')
    }
    return fallback()
  }

  let payload
  try {
    payload = await response.json()
  } catch {
    return fallback()
  }

  const architecture = normaliseArchitecture(payload.architecture, 'Untitled Project')
  const { valid } = validateArchitecture(architecture)
  if (!valid) return fallback()

  return { architecture, source: 'ai' }
}
