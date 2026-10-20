// @ts-check
import { strToU8, zipSync } from 'fflate'
import { checkPath, containsSecret } from './paths.js'

/**
 * Packs project files into a ZIP under a single top-level folder. Re-validates
 * every path and skips anything that looks like a credential or an env file.
 * @param {import('./paths.js').ProjectFile[]} files
 * @param {string} folder
 * @returns {{ bytes: Uint8Array, included: string[], skipped: string[] }}
 */
export function buildProjectZip(files, folder) {
  /** @type {Record<string, Uint8Array>} */
  const entries = {}
  const included = []
  const skipped = []
  const root = folder.replace(/[^a-z0-9-]/gi, '-').replace(/^-+|-+$/g, '') || 'website'
  for (const file of files) {
    const check = checkPath(file.path)
    if (!check.ok || (file.encoding !== 'base64' && containsSecret(file.content))) {
      skipped.push(file.path)
      continue
    }
    entries[`${root}/${check.path}`] = file.encoding === 'base64' ? base64ToBytes(file.content) : strToU8(file.content)
    included.push(check.path)
  }
  return { bytes: zipSync(entries, { level: 6, mtime: new Date('2024-01-01T00:00:00Z') }), included, skipped }
}

/** @param {string} b64 */
export function base64ToBytes(b64) {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i)
  return out
}
