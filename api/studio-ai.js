import { attachUsage, authenticate, isManaged, releaseUsage, requireAccount, reserveUsage } from './_lib/account.js'
import { clientIp, exclusive, readBody, rateLimited, send } from './_lib/http.js'
import { completeStudioJson, providerConfig } from './_lib/providers.js'
import { checkBudget, costCents, limits, localLedger, maxTokensFor, recordLocal } from './_lib/studioUsage.js'
import { EDIT_PROMPT, PLAN_PROMPT, VARIATIONS_PROMPT } from './_lib/studioPrompts.js'
import { normaliseSpec, validatePrompt } from '../src/studio/core/spec.js'
import { isWritableByEditor, validateFiles } from '../src/studio/core/paths.js'

/**
 * Galaxy Studio AI operations (server-side only).
 * GET  → provider status, limits and (unmanaged) recent usage.
 * POST { op: 'plan' | 'variations' | 'edit', ... } → validated structured output.
 * Without AI_API_KEY every POST returns 503 ai_not_configured; the client then
 * uses the clearly labelled offline planner/editor.
 */
const ACTIONS = { plan: 'STUDIO_PLAN', variations: 'STUDIO_VARIATIONS', edit: 'STUDIO_EDIT' }
const TOKENS = { plan: 4000, variations: 2500, edit: 8000 }

function dollars(cents) {
  return cents == null ? null : cents / 100
}

async function runOp(op, body) {
  const maxTokens = maxTokensFor(TOKENS[op])
  if (op === 'plan') {
    const prompt = String(body.prompt ?? '').trim()
    const o = body.options ?? {}
    const brief = [`Description: ${prompt}`, o.name && `Project name: ${String(o.name).slice(0, 40)}`, o.category && `Category: ${String(o.category).slice(0, 40)}`,
      o.references && `Design references: ${String(o.references).slice(0, 400)}`, o.colors && `Colour preferences: ${String(o.colors).slice(0, 120)}`, o.fonts && `Font preferences: ${String(o.fonts).slice(0, 120)}`].filter(Boolean).join('\n')
    const result = await completeStudioJson({ system: PLAN_PROMPT, user: brief, temperature: 0.7, maxTokens })
    const spec = normaliseSpec({ ...result.data, prompt, framework: o.framework, ...(o.name ? { name: o.name } : {}), ...(o.category && o.category !== 'Custom' ? { category: o.category } : {}), references: o.references })
    if (spec.pages[0].sections.length < 2) throw new Error('ai_invalid_output')
    return { ...result, output: { spec } }
  }
  const base = normaliseSpec(body.spec)
  if (op === 'variations') {
    const result = await completeStudioJson({ system: VARIATIONS_PROMPT, user: JSON.stringify({ ...base, pages: base.pages.map((p) => ({ name: p.name, sections: p.sections.map((s) => s.type) })) }), temperature: 0.95, maxTokens, fast: true })
    const list = Array.isArray(result.data?.variations) ? result.data.variations.slice(0, 3) : []
    if (list.length < 2) throw new Error('ai_invalid_output')
    const variations = list.map((v) => ({ summary: String(v.summary ?? '').slice(0, 200), spec: normaliseSpec({ ...base, ...v, pages: base.pages, style: { ...base.style, ...v.style, direction: v.variantName } }) }))
    return { ...result, output: { variations } }
  }
  const instruction = String(body.instruction ?? '').trim().slice(0, 800)
  const { files: incoming } = validateFiles(body.files)
  const editable = incoming.filter((f) => isWritableByEditor(f.path) && f.encoding !== 'base64')
  const result = await completeStudioJson({
    system: EDIT_PROMPT,
    user: `Change request: ${instruction}\n\nSpecification:\n${JSON.stringify(base)}\n\nEditable files:\n${editable.map((f) => `--- ${f.path}\n${f.content}`).join('\n').slice(0, 60_000)}`,
    temperature: 0.3,
    maxTokens,
  })
  const summary = (Array.isArray(result.data?.summary) ? result.data.summary : [result.data?.summary]).map((s) => String(s ?? '').slice(0, 240)).filter(Boolean).slice(0, 8)
  const spec = result.data?.spec ? normaliseSpec({ ...base, ...result.data.spec, prompt: base.prompt, framework: base.framework }) : null
  const checked = validateFiles(result.data?.files ?? [])
  const files = checked.files.filter((f) => isWritableByEditor(f.path) && !/\b(eval|new Function|dangerouslySetInnerHTML|fetch\(|XMLHttpRequest|WebSocket|document\.cookie|localStorage)\b/.test(f.content))
  const rejected = [...checked.problems, ...checked.files.filter((f) => !files.includes(f)).map((f) => `${f.path}: not allowed`)]
  return { ...result, output: { summary: summary.length ? summary : ['No changes were made.'], spec, files, rejected } }
}

function failure(error) {
  const code = error?.message ?? 'ai_error'
  if (code === 'ai_auth_error') return { status: 502, body: { error: 'The AI provider rejected the API key. Check AI_API_KEY and AI_PROVIDER in your server settings.', code } }
  if (code === 'ai_rate_limited') return { status: 429, body: { error: 'The AI provider is rate-limiting requests. Wait a moment and try again.', code } }
  if (code === 'ai_invalid_output' || error instanceof SyntaxError) return { status: 502, body: { error: 'The AI returned an incomplete result. Nothing was changed — try again.', code: 'ai_invalid_output' } }
  if (error?.name === 'TimeoutError') return { status: 504, body: { error: 'The AI provider took too long to respond. Try again.', code: 'ai_timeout' } }
  return { status: 502, body: { error: 'The AI provider is unavailable right now. Nothing was changed.', code: 'ai_provider_error' } }
}

export default async function handler(req, res) {
  const cfg = providerConfig()
  const managed = isManaged()
  if (req.method === 'GET') {
    const l = limits()
    return send(res, 200, {
      aiConfigured: cfg.configured, provider: cfg.provider, model: cfg.model, fastModel: cfg.fastModel, managed,
      limits: { requestUsd: dollars(l.requestCents), dailyUsd: dollars(l.dailyCents), monthlyUsd: dollars(l.monthlyCents), usdPerMillionTokens: l.usdPerMillion },
      ledger: managed ? null : localLedger(100),
    })
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return send(res, 405, { error: 'Method not allowed' })
  }
  let body
  try {
    body = await readBody(req)
  } catch {
    return send(res, 400, { error: 'Invalid request body.' })
  }
  const op = Object.hasOwn(ACTIONS, body.op) ? body.op : null
  if (!op) return send(res, 400, { error: 'Unknown operation.' })
  if (op === 'plan') {
    const problem = validatePrompt(String(body.prompt ?? ''))
    if (problem) return send(res, 400, { error: problem, code: 'invalid_prompt' })
  }
  if (op === 'edit' && String(body.instruction ?? '').trim().length < 3) return send(res, 400, { error: 'Describe the change you want.', code: 'invalid_instruction' })
  if (op !== 'plan' && (!body.spec || typeof body.spec !== 'object')) return send(res, 400, { error: 'Missing website specification.' })

  const auth = await authenticate(req)
  if (!auth) return send(res, 401, { error: 'Sign in to use Galaxy Studio AI.', code: 'unauthenticated' })
  if (!cfg.configured) return send(res, 503, { error: 'No AI provider is configured. Galaxy Studio is running in Offline (Demo) mode.', code: 'ai_not_configured' })
  if (rateLimited(`studio:${auth.userId}:${clientIp(req)}`, 10)) return send(res, 429, { error: 'Too many requests. Try again in a minute.', code: 'rate_limited' })

  const account = managed ? await requireAccount(req, res).catch(() => (send(res, 500, { error: 'Could not load your account.' }), null)) : null
  if (managed && !account) return undefined
  const action = ACTIONS[op]
  const run = await exclusive(`studio:${auth.userId}`, async () => {
    const budget = await checkBudget(action, managed)
    if (!budget.allowed) {
      return { status: 402, body: { error: budget.reason === 'daily_budget_reached' ? 'Today’s AI budget is used up. Raise AI_DAILY_BUDGET_USD or try again tomorrow.' : 'This month’s AI budget is used up. Raise AI_MONTHLY_BUDGET_USD or wait until next month.', code: budget.reason } }
    }
    let eventId = null
    if (managed) {
      try {
        eventId = await reserveUsage(account, action)
      } catch (error) {
        return error.code === 'budget_reached' ? { status: 402, body: { error: 'This month’s AI budget is used up.', code: 'budget_reached' } } : { status: 500, body: { error: 'Could not record AI usage.' } }
      }
    }
    try {
      const result = await runOp(op, body)
      const usage = { provider: result.provider, model: result.model, op, action, tokens: result.tokens, cost_cents: costCents(action, result.tokens), status: 'ok' }
      if (managed) await attachUsage(eventId, null, { source: 'studio', provider: result.provider, model: result.model, op }, result.tokens)
      else recordLocal({ ...usage, user: auth.userId })
      return { status: 200, body: { ...result.output, source: 'ai', usage } }
    } catch (error) {
      console.error('studio ai failed', op, error?.message)
      if (managed) await releaseUsage(eventId)
      else recordLocal({ provider: cfg.provider, model: cfg.model, op, action, tokens: null, cost_cents: 0, status: 'error', user: auth.userId })
      return failure(error)
    }
  })
  if (run.busy) return send(res, 409, { error: 'Another AI request is still running.', code: 'in_progress' })
  return send(res, run.value.status, run.value.body)
}
