import { buildProjectZip } from './core/zip.js'
import { slug } from './core/spec.js'

/** Builds the ZIP in the browser and starts a download. Returns which files were skipped and why. */
export function downloadProjectZip(name, files) {
  const folder = slug(name) || 'galaxy-studio-site'
  const { bytes, included, skipped } = buildProjectZip(files, folder)
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${folder}.zip`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
  return { included, skipped }
}
