// @ts-check
import { generateProject } from './core/codegen.js'
import { googleFontsHref } from './core/tokens.js'

/**
 * Project files = files generated from the spec, then files the AI or the user
 * edited by hand (they take priority), then uploaded assets.
 * @param {import('./core/spec.js').SiteSpec} spec
 * @param {import('./core/paths.js').ProjectFile[]} [customFiles]
 * @param {import('./core/paths.js').ProjectFile[]} [assets]
 */
export function composeFiles(spec, customFiles = [], assets = []) {
  const map = new Map(generateProject(spec).map((f) => [f.path, f]))
  for (const f of customFiles) map.set(f.path, f)
  for (const a of assets) map.set(a.path, a)
  return [...map.values()].sort((a, b) => a.path.localeCompare(b.path))
}

/** Loads Google Fonts into the Studio page so spec previews render with the chosen type. @param {string[]} fonts */
export function loadFontsInPage(fonts) {
  if (typeof document === 'undefined') return
  const href = googleFontsHref(fonts)
  if (document.head.querySelector(`link[data-gs-fonts="${CSS.escape(href)}"]`)) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  link.dataset.gsFonts = href
  document.head.appendChild(link)
}

/** @param {File} file @returns {Promise<string>} base64 without the data: prefix */
export function readFileBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/** @param {import('./core/paths.js').ProjectFile} file */
export function assetUrl(file) {
  const ext = file.path.split('.').pop()?.toLowerCase()
  const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
  return file.encoding === 'base64' ? `data:${mime};base64,${file.content}` : `data:${mime};charset=utf-8,${encodeURIComponent(file.content)}`
}
