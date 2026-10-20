// @ts-check
import { applyDirection, DIRECTIONS, planOffline } from './core/spec.js'
import { applyOfflineEdit } from './core/offlineEdit.js'

/**
 * Browser client for Galaxy Studio. AI work happens on the server; when no
 * provider is configured (503 ai_not_configured) or the server can't be reached,
 * the offline planner/editor is used and the result is marked source: 'offline'.
 */

/** @typedef {() => Promise<string | null>} GetToken */

/** @param {string} url @param {any} body @param {GetToken} [getToken] @param {string} [method] */
async function request(url, body, getToken, method = 'POST') {
  const token = getToken ? await getToken().catch(() => null) : null
  const response = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  })
  const payload = await response.json().catch(() => null)
  return { response, payload }
}

export class StudioError extends Error {
  /** @param {string} message @param {string} [code] */
  constructor(message, code) {
    super(message)
    this.code = code
  }
}

/** @param {GetToken} [getToken] */
export async function getStudioStatus(getToken) {
  try {
    const { response, payload } = await request('/api/studio-ai', null, getToken, 'GET')
    if (response.ok && payload) return { reachable: true, ...payload }
  } catch {
    // fall through
  }
  return { reachable: false, aiConfigured: false, provider: null, model: null, managed: false, limits: null, ledger: null }
}

/**
 * Runs an AI operation, falling back to the offline implementation only when the
 * server says no provider is configured or is unreachable.
 * @template T
 * @param {any} body @param {GetToken | undefined} getToken @param {() => T} offline
 * @returns {Promise<{ source: 'ai', data: any, usage?: any } | { source: 'offline', data: T, reason: string }>}
 */
async function withFallback(body, getToken, offline) {
  let result
  try {
    result = await request('/api/studio-ai', body, getToken)
  } catch {
    return { source: 'offline', data: offline(), reason: 'The Galaxy Studio server could not be reached.' }
  }
  const { response, payload } = result
  if (response.ok && payload) return { source: 'ai', data: payload, usage: payload.usage }
  if (response.status === 503 && payload?.code === 'ai_not_configured') return { source: 'offline', data: offline(), reason: 'No AI provider is configured.' }
  if (response.status === 404) return { source: 'offline', data: offline(), reason: 'The AI endpoint is not deployed.' }
  throw new StudioError(payload?.error ?? `Request failed (${response.status}).`, payload?.code)
}

/** @param {string} prompt @param {any} options @param {GetToken} [getToken] */
export async function planSite(prompt, options, getToken) {
  const r = await withFallback({ op: 'plan', prompt, options }, getToken, () => ({ spec: planOffline(prompt, options) }))
  return { spec: r.data.spec, source: r.source, reason: r.source === 'offline' ? r.reason : null, usage: r.source === 'ai' ? r.usage : null }
}

/** @param {import('./core/spec.js').SiteSpec} spec @param {GetToken} [getToken] */
export async function designVariations(spec, getToken) {
  const offline = () => ({ variations: DIRECTIONS.map((d) => ({ summary: d.summary, spec: applyDirection(spec, d.key) })) })
  const r = await withFallback({ op: 'variations', spec }, getToken, offline)
  return { variations: r.data.variations, source: r.source, reason: r.source === 'offline' ? r.reason : null }
}

/**
 * @param {import('./core/spec.js').SiteSpec} spec @param {import('./core/paths.js').ProjectFile[]} files @param {string} instruction @param {GetToken} [getToken]
 * @returns {Promise<{ source: 'ai' | 'offline', summary: string[], spec: import('./core/spec.js').SiteSpec | null, files: import('./core/paths.js').ProjectFile[], rejected: string[], unsupported?: string, reason: string | null }>}
 */
export async function editSite(spec, files, instruction, getToken) {
  const r = await withFallback({ op: 'edit', spec, files: files.filter((f) => f.encoding !== 'base64'), instruction }, getToken, () => applyOfflineEdit(spec, instruction))
  if (r.source === 'offline') {
    const d = r.data
    return { source: 'offline', summary: d.summary, spec: d.unsupported ? null : d.spec, files: [], rejected: [], unsupported: d.unsupported, reason: r.reason }
  }
  return { source: 'ai', summary: r.data.summary ?? [], spec: r.data.spec ?? null, files: r.data.files ?? [], rejected: r.data.rejected ?? [], reason: null }
}

/**
 * Compiles a project on the server. Never executes it there.
 * @param {import('./core/paths.js').ProjectFile[]} files @param {GetToken} [getToken]
 * @returns {Promise<{ ok: true, js: string, css: string, ms: number } | { ok: false, stage: string, errors: { file: string | null, line: number | null, column: number | null, text: string }[] }>}
 */
export async function buildPreview(files, getToken) {
  try {
    const { response, payload } = await request('/api/studio-build', { files }, getToken)
    if (payload && (payload.ok === true || payload.ok === false)) return payload
    return { ok: false, stage: 'server', errors: [{ file: null, line: null, column: null, text: payload?.error ?? `Preview build failed (${response.status}).` }] }
  } catch {
    return { ok: false, stage: 'network', errors: [{ file: null, line: null, column: null, text: 'Could not reach the preview compiler. Check your connection.' }] }
  }
}
