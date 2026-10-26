// @ts-check
/**
 * Galaxy Studio project storage. Projects and their full version history live in
 * the browser's IndexedDB, scoped per signed-in user. This is local storage:
 * nothing is uploaded, and the UI labels it as "Saved in this browser".
 */

/**
 * @typedef {import('./core/paths.js').ProjectFile} ProjectFile
 * @typedef {import('./core/spec.js').SiteSpec} SiteSpec
 * @typedef {{ id: string, createdAt: string, summary: string, spec: SiteSpec, files: ProjectFile[], buildStatus: 'ok' | 'failed' | 'unknown', source: 'ai' | 'offline' | 'manual' | 'restore', errors?: string[], customFiles?: ProjectFile[] }} Version
 * @typedef {{ id: string, userId: string, name: string, category: string, framework: string, prompt: string, createdAt: string, updatedAt: string,
 *   favorite: boolean, currentVersionId: string, versions: Version[], assets: ProjectFile[], chat: { role: 'user' | 'assistant', text: string, at: string }[] }} Project
 */

const DB_NAME = 'galaxy-studio'
const STORE = 'projects'
/** @type {Promise<IDBDatabase> | null} */
let opening = null

function open() {
  if (!opening) {
    opening = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1)
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('userId', 'userId')
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }
  return opening
}

/** @template T @param {'readonly' | 'readwrite'} mode @param {(store: IDBObjectStore) => IDBRequest<T>} fn @returns {Promise<T>} */
async function tx(mode, fn) {
  const db = await open()
  return new Promise((resolve, reject) => {
    const request = fn(db.transaction(STORE, mode).objectStore(STORE))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export function newId() {
  return crypto.randomUUID()
}

/** @param {string} userId @returns {Promise<Project[]>} */
export async function listProjects(userId) {
  const all = /** @type {Project[]} */ (await tx('readonly', (s) => s.index('userId').getAll(userId)))
  return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

/** @param {string} userId @param {string} id @returns {Promise<Project | null>} */
export async function getProject(userId, id) {
  const project = /** @type {Project | undefined} */ (await tx('readonly', (s) => s.get(id)))
  return project && project.userId === userId ? project : null
}

/** @param {Project} project */
export async function saveProject(project) {
  await tx('readwrite', (s) => s.put(project))
  return project
}

/** @param {string} userId @param {string} id */
export async function deleteProject(userId, id) {
  const existing = await getProject(userId, id)
  if (existing) await tx('readwrite', (s) => s.delete(id))
}

/** @param {Project} project */
export function currentVersion(project) {
  return project.versions.find((v) => v.id === project.currentVersionId) ?? project.versions[project.versions.length - 1]
}

/**
 * @param {{ userId: string, spec: SiteSpec, files: ProjectFile[], summary: string, source: Version['source'], assets?: ProjectFile[] }} input
 * @returns {Project}
 */
export function createProject({ userId, spec, files, summary, source, assets = [] }) {
  const now = new Date().toISOString()
  const version = { id: newId(), createdAt: now, summary, spec, files, buildStatus: /** @type {const} */ ('unknown'), source }
  return {
    id: newId(), userId, name: spec.name, category: spec.category, framework: spec.framework, prompt: spec.prompt, createdAt: now, updatedAt: now,
    favorite: false, currentVersionId: version.id, versions: [version], assets, chat: [],
  }
}

/**
 * Adds a version after the current one. Versions are never deleted or overwritten.
 * @param {Project} project
 * @param {Omit<Version, 'id' | 'createdAt'>} input
 * @returns {Project}
 */
export function addVersion(project, input) {
  const version = { ...input, id: newId(), createdAt: new Date().toISOString() }
  return { ...project, name: input.spec.name, framework: input.spec.framework, versions: [...project.versions, version].slice(-60), currentVersionId: version.id, updatedAt: version.createdAt }
}

/** Restoring copies an old version to the top, so newer versions stay available. @param {Project} project @param {string} versionId */
export function restoreVersion(project, versionId) {
  const v = project.versions.find((x) => x.id === versionId)
  if (!v) return project
  return addVersion(project, { summary: `Restored “${v.summary}”`, spec: v.spec, files: v.files, customFiles: v.customFiles ?? [], buildStatus: v.buildStatus, source: 'restore' })
}

/** Undo/redo move the pointer through history without creating versions. @param {Project} project @param {-1 | 1} step */
export function stepVersion(project, step) {
  const i = project.versions.findIndex((v) => v.id === project.currentVersionId)
  const next = project.versions[i + step]
  return next ? { ...project, currentVersionId: next.id, updatedAt: new Date().toISOString() } : project
}

/** @param {Project} project @param {string} [versionId] */
export function duplicateProject(project, versionId) {
  const source = versionId ? project.versions.find((v) => v.id === versionId) ?? currentVersion(project) : currentVersion(project)
  const copy = createProject({ userId: project.userId, spec: { ...source.spec, name: `${project.name} copy`.slice(0, 40) }, files: source.files, summary: `Duplicated from ${project.name}`, source: 'manual', assets: project.assets })
  copy.versions[0].customFiles = source.customFiles ?? []
  return { ...copy, name: `${project.name} copy`.slice(0, 40), favorite: false }
}
