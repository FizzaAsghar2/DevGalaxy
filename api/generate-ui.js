import { attachUsage, db, isManaged, releaseUsage, requireAccount, reserveUsage, authenticate } from './_lib/account.js'
import { aiModel, completeJson, isAiConfigured } from './_lib/ai.js'
import { clientIp, exclusive, readBody, rateLimited, send } from './_lib/http.js'
import { CUSTOMIZE_PROMPT, UI_PROMPT } from './_lib/prompts.js'
import { normaliseArchitecture } from '../src/services/architectureSchema.js'
import { customizeLocalUi, generateLocalUi, UI_STYLES, UI_THEMES } from '../src/services/localUi.js'
import { normaliseUiSpec, validateUiSpec } from '../src/services/uiSchema.js'

/**
 * UI prototype generation for a saved galaxy.
 * mode: generate | regenerate | variation | customize → usage action.
 * Ownership is checked against the verified user id before anything else.
 */
const ACTION_FOR_MODE = {
  generate: 'UI_GENERATION',
  regenerate: 'UI_REGENERATION',
  variation: 'DESIGN_VARIATION',
  customize: 'AI_UI_CUSTOMIZATION',
}

async function buildUi({ mode, architecture, idea, current, style, theme, instruction, pageId }) {
  const variant = mode === 'variation' ? (current?.variant ?? 0) + 1 : mode === 'regenerate' ? (current?.variant ?? 0) : 0
  if (!isAiConfigured()) {
    if (mode === 'customize') return { spec: customizeLocalUi(current, instruction, { pageId }).spec, source: 'demo' }
    return { spec: generateLocalUi(architecture, idea, { style, theme, variant }), source: 'demo' }
  }
  const raw =
    mode === 'customize'
      ? await completeJson({
          system: CUSTOMIZE_PROMPT,
          user: `Instruction${pageId ? ` (focus on page id "${pageId}")` : ''}: ${instruction}\n\nCurrent prototype:\n${JSON.stringify({ uiDesign: current.uiDesign, uiPages: current.uiPages })}`,
          temperature: 0.4,
        })
      : await completeJson({
          system: UI_PROMPT,
          user: `Idea: ${idea}\nPreferred style: ${style}\nPreferred theme: ${theme}\n${mode === 'variation' ? 'Create a clearly different design direction from the previous one (different colours, navigation and layouts).\n' : ''}Architecture:\n${JSON.stringify(architecture)}`,
          temperature: mode === 'variation' ? 0.95 : 0.7,
        })
  const spec = normaliseUiSpec({ ...raw, variant, source: 'ai' }, architecture)
  if (!validateUiSpec(spec)) throw new Error('ai_invalid_ui')
  return { spec, source: 'ai' }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return send(res, 405, { error: 'Method not allowed' })
  }

  let body
  try {
    body = await readBody(req)
  } catch {
    return send(res, 400, { error: 'Invalid request body.' })
  }
  let mode = Object.hasOwn(ACTION_FOR_MODE, body.mode) ? body.mode : 'generate'
  const style = UI_STYLES.includes(body.style) ? body.style : 'Auto'
  const theme = UI_THEMES.includes(body.theme) ? body.theme : 'Auto'
  const instruction = typeof body.instruction === 'string' ? body.instruction.trim().slice(0, 500) : ''
  const pageId = typeof body.pageId === 'string' ? body.pageId.slice(0, 80) : undefined
  if (mode === 'customize' && instruction.length < 3) return send(res, 400, { error: 'Describe the change you want.' })

  // Unmanaged (demo) deployments: stateless generation from the architecture the client sends.
  if (!isManaged()) {
    const auth = await authenticate(req)
    if (!auth) return send(res, 401, { error: 'Sign in to generate a UI.' })
    if (rateLimited(`ui:${auth.userId}:${clientIp(req)}`, 12)) return send(res, 429, { error: 'Too many requests. Try again in a minute.' })
    try {
      const architecture = normaliseArchitecture(body.architecture, 'Untitled Project')
      const current = body.current ? normaliseUiSpec(body.current, architecture) : null
      if (mode !== 'generate' && !current) mode = 'generate'
      const result = await buildUi({ mode, architecture, idea: String(body.idea ?? '').slice(0, 1200), current, style, theme, instruction, pageId })
      return send(res, 200, { ui: result.spec, source: result.source })
    } catch (error) {
      console.error('ui generation failed', error?.message)
      return send(res, 502, { error: 'Could not generate the UI right now.' })
    }
  }

  const account = await requireAccount(req, res).catch((error) => {
    console.error('account lookup failed', error)
    send(res, 500, { error: 'Could not load your account.' })
    return null
  })
  if (!account) return undefined
  const galaxyId = typeof body.galaxyId === 'string' ? body.galaxyId : ''
  if (!/^[0-9a-f-]{36}$/i.test(galaxyId)) return send(res, 400, { error: 'Unknown galaxy.' })

  const { data: galaxy, error: loadError } = await db()
    .from('galaxies')
    .select('id, user_id, original_idea, architecture_data, ui_data')
    .eq('id', galaxyId)
    .eq('user_id', account.profile.id)
    .maybeSingle()
  if (loadError) return send(res, 500, { error: 'Could not load the galaxy.' })
  if (!galaxy) return send(res, 404, { error: 'Galaxy not found.' })

  const architecture = normaliseArchitecture(galaxy.architecture_data, 'Untitled Project')
  const current = galaxy.ui_data ? normaliseUiSpec(galaxy.ui_data, architecture) : null
  if (!current) mode = 'generate'
  else if (mode === 'generate') mode = 'regenerate'
  const action = ACTION_FOR_MODE[mode]

  if (rateLimited(`ui:${account.profile.id}`, 12)) return send(res, 429, { error: 'Too many requests. Try again in a minute.' })

  const run = await exclusive(`ui:${account.profile.id}`, async () => {
    let eventId
    try {
      eventId = await reserveUsage(account, action, galaxy.id)
    } catch (error) {
      return error.code === 'upgrade_required'
        ? { status: 402, body: { error: 'Upgrade to Pro to keep designing.', code: 'upgrade_required', action } }
        : { status: 500, body: { error: 'Could not check your plan.' } }
    }
    try {
      const { spec, source } = await buildUi({ mode, architecture, idea: galaxy.original_idea, current, style, theme, instruction, pageId })
      const { error } = await db().from('galaxies').update({ ui_data: spec }).eq('id', galaxy.id).eq('user_id', account.profile.id)
      if (error) throw error
      await attachUsage(eventId, galaxy.id, { source, model: source === 'ai' ? aiModel() : null, mode, style, theme })
      return { status: 200, body: { ui: spec, source, action } }
    } catch (error) {
      console.error('ui generation failed', error?.message ?? error)
      await releaseUsage(eventId)
      return { status: 502, body: { error: 'Could not generate the UI right now. Your allowance was not used.' } }
    }
  })
  if (run.busy) return send(res, 409, { error: 'A UI generation is already running.', code: 'in_progress' })
  return send(res, run.value.status, run.value.body)
}
