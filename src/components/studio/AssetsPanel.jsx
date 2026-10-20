import { useState } from 'react'
import { ImagePlus, RefreshCw, Trash2 } from 'lucide-react'
import { MAX_ASSET_BYTES } from '../../studio/core/paths'
import { assetUrl, readFileBase64 } from '../../studio/compose'

const OK = /^image\/(png|jpe?g|webp|gif|svg\+xml)$/

/** Generated artwork and uploaded images. Uploads are stored inside the project and exported with it. */
export default function AssetsPanel({ files, uploaded, onAdd, onReplace, onRemove }) {
  const [error, setError] = useState('')
  const generated = files.filter((f) => f.path.startsWith('src/assets/') && !uploaded.some((u) => u.path === f.path))

  async function read(file) {
    if (!OK.test(file.type)) throw new Error(`${file.name}: use PNG, JPG, WebP, GIF or SVG.`)
    if (file.size > MAX_ASSET_BYTES) throw new Error(`${file.name}: images must be under 2 MB.`)
    if (file.type === 'image/svg+xml') {
      const text = await file.text()
      if (/<script|on\w+\s*=|javascript:/i.test(text)) throw new Error(`${file.name}: SVGs with scripts are not allowed.`)
      return { content: text, encoding: 'utf8', ext: 'svg' }
    }
    return { content: await readFileBase64(file), encoding: 'base64', ext: file.type.split('/')[1].replace('jpeg', 'jpg') }
  }
  const safeName = (name) => name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'image'

  async function add(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setError('')
      const r = await read(file)
      let path = `src/assets/uploads/${safeName(file.name)}.${r.ext}`
      for (let n = 2; files.some((f) => f.path === path); n++) path = `src/assets/uploads/${safeName(file.name)}-${n}.${r.ext}`
      onAdd({ path, content: r.content, encoding: r.encoding })
    } catch (err) { setError(err.message) }
  }
  async function replace(asset, e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setError('')
      const r = await read(file)
      const path = asset.path.replace(/\.[^.]+$/, `.${r.ext}`)
      onReplace(asset.path, { path, content: r.content, encoding: r.encoding })
    } catch (err) { setError(err.message) }
  }

  const Tile = ({ f, removable }) => (
    <li className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
      <img src={assetUrl(f)} alt={f.path.split('/').pop()} className="aspect-video w-full bg-black/30 object-cover" />
      <div className="flex items-center gap-1 p-1.5 text-[10px]">
        <span className="min-w-0 flex-1 truncate font-mono text-slate-400" title={f.path}>{f.path.replace('src/assets/', '')}</span>
        {removable && (
          <>
            <label className="cursor-pointer rounded p-1 text-slate-400 hover:text-white" title="Replace image"><RefreshCw className="h-3 w-3" /><span className="sr-only">Replace {f.path}</span><input type="file" accept="image/*" className="hidden" onChange={(e) => replace(f, e)} /></label>
            <button type="button" className="rounded p-1 text-slate-400 hover:text-rose-300" aria-label={`Remove ${f.path}`} onClick={() => onRemove(f.path)}><Trash2 className="h-3 w-3" /></button>
          </>
        )}
      </div>
    </li>
  )

  return (
    <div className="space-y-3 text-xs">
      <label className="btn-ghost w-full cursor-pointer py-2 text-xs"><ImagePlus className="h-3.5 w-3.5" /> Upload image<input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" className="hidden" onChange={add} /></label>
      {error && <p role="alert" className="rounded-lg bg-rose-500/10 px-2 py-1.5 text-rose-200">{error}</p>}
      <div>
        <p className="label-muted text-[10px]">Uploaded ({uploaded.length})</p>
        {uploaded.length ? <ul className="mt-1 grid grid-cols-2 gap-2">{uploaded.map((f) => <Tile key={f.path} f={f} removable />)}</ul> : <p className="mt-1 text-slate-500">No uploads yet.</p>}
      </div>
      <div>
        <p className="label-muted text-[10px]">Generated artwork</p>
        <ul className="mt-1 grid grid-cols-2 gap-2">{generated.map((f) => <Tile key={f.path} f={f} />)}</ul>
      </div>
      <p className="text-[11px] text-slate-500">Assets are local project files and are included in the ZIP. Place uploads on a page via chat (connected AI) or by editing a file in Code view.</p>
    </div>
  )
}
