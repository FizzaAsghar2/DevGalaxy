import { isDemoMode } from '../lib/config'
import { customizeLocalUi, generateLocalUi } from './localUi'
import { normaliseUiSpec } from './uiSchema'
import { UpgradeRequiredError, postJson } from './aiService'

export const UI_MODE_ACTION = {
  generate: 'UI_GENERATION',
  regenerate: 'UI_REGENERATION',
  variation: 'DESIGN_VARIATION',
  customize: 'AI_UI_CUSTOMIZATION',
}

function localBuild({ mode, galaxy, current, style, theme, instruction, pageId }) {
  const architecture = galaxy.architecture_data
  if (mode === 'customize') {
    const { spec, changes } = customizeLocalUi(current, instruction, { pageId })
    return { ui: spec, source: 'demo', changes }
  }
  const variant = mode === 'variation' ? (current?.variant ?? 0) + 1 : mode === 'regenerate' ? (current?.variant ?? 0) : 0
  return { ui: generateLocalUi(architecture, galaxy.original_idea, { style, theme, variant }), source: 'demo' }
}

/**
 * Generates or edits a galaxy's UI prototype via /api/generate-ui.
 * Managed mode: the server checks ownership + plan, calls the AI, and saves.
 * Demo mode: the server (if running) or the browser generates statelessly.
 */
export async function requestUi({ mode, galaxy, current, style = 'Auto', theme = 'Auto', instruction, pageId, getToken, offlineOnly = false }) {
  if (offlineOnly) return localBuild({ mode, galaxy, current, style, theme, instruction, pageId })
  let response
  try {
    response = await postJson(
      '/api/generate-ui',
      isDemoMode
        ? { mode, style, theme, instruction, pageId, architecture: galaxy.architecture_data, idea: galaxy.original_idea, current }
        : { mode, style, theme, instruction, pageId, galaxyId: galaxy.id },
      getToken,
    )
  } catch {
    if (isDemoMode) return localBuild({ mode, galaxy, current, style, theme, instruction, pageId })
    throw new Error('Could not reach DevGalaxy. Check your connection and try again.')
  }
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 402) throw new UpgradeRequiredError(payload?.action ?? UI_MODE_ACTION[mode], payload?.error)
    if (isDemoMode && ![400, 401, 429].includes(response.status)) return localBuild({ mode, galaxy, current, style, theme, instruction, pageId })
    throw new Error(payload?.error ?? 'UI generation failed.')
  }
  return { ui: normaliseUiSpec(payload.ui, galaxy.architecture_data), source: payload.source ?? 'ai' }
}
