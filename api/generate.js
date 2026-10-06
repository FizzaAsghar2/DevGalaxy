import { authenticate, attachUsage, db, isManaged, releaseUsage, requireAccount, reserveUsage } from './_lib/account.js'
import { aiModel, completeJson, isAiConfigured } from './_lib/ai.js'
import { clientIp, exclusive, readBody, rateLimited, send } from './_lib/http.js'
import { ARCHITECTURE_PROMPT, COMPLEXITY_HINT } from './_lib/prompts.js'
import { normaliseArchitecture, validateArchitecture } from '../src/services/architectureSchema.js'
import { generateLocalArchitecture } from '../src/services/localArchitecture.js'

/**
 * Architecture generation (Vercel serverless function).
 * Order matters: authenticate → load plan → reserve usage → call AI → save.
 * The AI provider is never called for a user without remaining allowance, and
 * in managed mode the galaxy is saved here so each one maps to a usage event.
 */
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
  const idea = typeof body.idea === 'string' ? body.idea.trim() : ''
  if (idea.length < 12) return send(res, 400, { error: 'Describe your idea in at least 12 characters.' })
  if (idea.length > 1200) return send(res, 400, { error: 'Please keep your idea under 1200 characters.' })
  const complexity = ['simple', 'medium', 'complex'].includes(body.complexity) ? body.complexity : 'medium'
  const appType = typeof body.appType === 'string' ? body.appType.slice(0, 40) : 'Website'

  let account = null
  let userKey
  if (isManaged()) {
    account = await requireAccount(req, res).catch((error) => {
      console.error('account lookup failed', error)
      send(res, 500, { error: 'Could not load your account.' })
      return null
    })
    if (!account) return undefined
    userKey = account.profile.id
  } else {
    const auth = await authenticate(req)
    if (!auth) return send(res, 401, { error: 'Sign in to generate a galaxy.' })
    userKey = `${auth.userId}:${clientIp(req)}`
  }
  if (rateLimited(`gen:${userKey}`)) return send(res, 429, { error: 'Too many galaxies generated. Try again in a minute.' })

  const run = await exclusive(`gen:${userKey}`, async () => {
    let eventId = null
    try {
      if (account) eventId = await reserveUsage(account, 'GALAXY_GENERATION')
    } catch (error) {
      return { status: error.code === 'upgrade_required' ? 402 : 500, body: error.code === 'upgrade_required' ? { error: 'You have used your free galaxy.', code: 'upgrade_required', action: 'GALAXY_GENERATION' } : { error: 'Could not check your plan.' } }
    }

    try {
      let architecture
      let source = 'ai'
      if (isAiConfigured()) {
        const raw = await completeJson({
          system: ARCHITECTURE_PROMPT,
          user: `Application type: ${appType}\nComplexity: ${complexity} (${COMPLEXITY_HINT[complexity]})\nIdea: ${idea}`,
        })
        architecture = normaliseArchitecture(raw, 'Untitled Project')
        if (!validateArchitecture(architecture).valid) throw new Error('ai_invalid_architecture')
      } else {
        architecture = generateLocalArchitecture(idea, { appType, complexity })
        source = 'demo'
      }

      if (!account) return { status: 200, body: { architecture, source, model: source === 'ai' ? aiModel() : null } }

      const meta = { source, model: source === 'ai' ? aiModel() : null, complexity, app_type: appType }
      const { data: galaxy, error } = await db()
        .from('galaxies')
        .insert({
          user_id: account.profile.id,
          project_name: architecture.projectName,
          original_idea: idea,
          description: architecture.description,
          app_type: appType,
          complexity,
          architecture_data: architecture,
          generation_meta: meta,
        })
        .select('*')
        .single()
      if (error) throw error
      await attachUsage(eventId, galaxy.id, meta)
      return { status: 200, body: { architecture, source, galaxy } }
    } catch (error) {
      console.error('generation failed', error?.message ?? error)
      await releaseUsage(eventId)
      return { status: 502, body: { error: 'Could not generate an architecture right now. Your allowance was not used.' } }
    }
  })

  if (run.busy) return send(res, 409, { error: 'A generation is already running.', code: 'in_progress' })
  return send(res, run.value.status, run.value.body)
}
