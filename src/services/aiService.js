import { isDemoMode } from '../lib/config'
import { normaliseArchitecture, validateArchitecture } from './architectureSchema'
import { generateLocalArchitecture } from './localArchitecture'

export class UpgradeRequiredError extends Error {
  constructor(action, message) {
    super(message ?? 'Upgrade required.')
    this.code = 'upgrade_required'
    this.action = action
  }
}

export async function postJson(url, body, getToken) {
  const token = getToken ? await getToken().catch(() => null) : null
  return fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
}

/**
 * Calls the secure `/api/generate` function. In managed mode the server checks
 * the plan, generates and saves the galaxy, so there is no client fallback.
 * In demo mode an unreachable endpoint falls back to the offline generator.
 */
export async function generateArchitecture({ idea, appType, complexity, getToken }) {
  const fallback = () => ({
    architecture: normaliseArchitecture(generateLocalArchitecture(idea, { appType, complexity }), 'Untitled Project'),
    source: 'demo',
    galaxy: null,
  })

  let response
  try {
    response = await postJson('/api/generate', { idea, appType, complexity }, getToken)
  } catch {
    if (isDemoMode) return fallback()
    throw new Error('Could not reach DevGalaxy. Check your connection and try again.')
  }

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 402) throw new UpgradeRequiredError('GALAXY_GENERATION', payload?.error)
    if ([400, 401, 403, 409, 429].includes(response.status) || !isDemoMode) throw new Error(payload?.error ?? 'Generation failed.')
    return fallback()
  }
  if (!payload) {
    if (isDemoMode) return fallback()
    throw new Error('Unexpected response from the server.')
  }

  const architecture = normaliseArchitecture(payload.architecture, 'Untitled Project')
  if (!validateArchitecture(architecture).valid) {
    if (isDemoMode) return fallback()
    throw new Error('The generated architecture was incomplete. Try again.')
  }
  return { architecture, source: payload.source ?? 'ai', galaxy: payload.galaxy ?? null }
}
