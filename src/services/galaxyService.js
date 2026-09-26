import { getSupabaseClient } from '../lib/supabaseClient'
import { normaliseArchitecture } from './architectureSchema'

/**
 * Galaxy persistence. Supabase is the real backend (ownership enforced by RLS);
 * localStorage keeps the product fully usable in demo mode.
 */

const STORAGE_KEY = 'devgalaxy:galaxies'

function hydrate(row) {
  return {
    ...row,
    architecture_data: normaliseArchitecture(row.architecture_data, row.project_name),
  }
}

function readLocal(userId) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return all.filter((row) => row.user_id === userId).map(hydrate)
  } catch {
    return []
  }
}

function writeLocal(rows) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
}

function allLocal() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function createGalaxyService({ userId, getToken, useSupabase }) {
  const supabase = useSupabase ? getSupabaseClient(getToken) : null

  async function list() {
    if (!supabase) return readLocal(userId).sort((a, b) => b.created_at.localeCompare(a.created_at))

    const { data, error } = await supabase
      .from('galaxies')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map(hydrate)
  }

  async function get(id) {
    if (!supabase) return readLocal(userId).find((row) => row.id === id) ?? null

    const { data, error } = await supabase.from('galaxies').select('*').eq('id', id).maybeSingle()
    if (error) throw new Error(error.message)
    return data ? hydrate(data) : null
  }

  async function create({ projectName, idea, description, appType, complexity, architecture }) {
    const payload = {
      project_name: projectName,
      original_idea: idea,
      description,
      app_type: appType,
      complexity,
      architecture_data: architecture,
    }

    if (!supabase) {
      const row = {
        id: crypto.randomUUID(),
        user_id: userId,
        ...payload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      writeLocal([row, ...allLocal()])
      return hydrate(row)
    }

    const { data, error } = await supabase
      .from('galaxies')
      .insert({ ...payload, user_id: userId })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return hydrate(data)
  }

  async function rename(id, projectName) {
    if (!supabase) {
      const rows = allLocal().map((row) =>
        row.id === id && row.user_id === userId
          ? { ...row, project_name: projectName, updated_at: new Date().toISOString() }
          : row,
      )
      writeLocal(rows)
      return
    }

    const { error } = await supabase
      .from('galaxies')
      .update({ project_name: projectName, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw new Error(error.message)
  }

  async function remove(id) {
    if (!supabase) {
      writeLocal(allLocal().filter((row) => !(row.id === id && row.user_id === userId)))
      return
    }

    const { error } = await supabase.from('galaxies').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  return { list, get, create, rename, remove }
}
