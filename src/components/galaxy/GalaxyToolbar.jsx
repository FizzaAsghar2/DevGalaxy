import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Home, Presentation, Search, X } from 'lucide-react'
import { CATEGORY_BY_KEY } from '../../lib/categories'
import { searchLayout } from '../../services/galaxyLayout'

function Breadcrumbs({ projectName, focus, onNavigate }) {
  const category = focus.categoryKey ? CATEGORY_BY_KEY[focus.categoryKey] : null
  const crumbs = [
    { label: 'DevGalaxy', onClick: null, to: '/dashboard' },
    { label: projectName, onClick: () => onNavigate({ level: 1 }) },
  ]
  if (category) crumbs.push({ label: category.label, onClick: () => onNavigate({ level: 2, categoryKey: category.key }) })
  if (focus.level === 3 && focus.nodeLabel) crumbs.push({ label: focus.nodeLabel, onClick: null })

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-xs text-slate-400">
      {crumbs.map((crumb, index) => (
        <span key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1">
          {index > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-slate-600" />}
          {crumb.to ? (
            <Link to={crumb.to} className="flex shrink-0 items-center gap-1 hover:text-white">
              <Home className="h-3 w-3" /> {crumb.label}
            </Link>
          ) : crumb.onClick ? (
            <button type="button" onClick={crumb.onClick} className="truncate hover:text-white">
              {crumb.label}
            </button>
          ) : (
            <span className="truncate text-slate-200">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

export default function GalaxyToolbar({ projectName, focus, layout, onNavigate, onSelect, onPresent, right, hideSearch = false }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)
  const results = open ? searchLayout(layout, query) : []

  useEffect(() => {
    const onClickOutside = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div className="glass-strong pointer-events-auto absolute inset-x-3 top-3 z-30 flex items-center gap-3 rounded-2xl px-3 py-2 sm:inset-x-4">
      <div className="min-w-0 flex-1">
        <Breadcrumbs projectName={projectName} focus={focus} onNavigate={onNavigate} />
      </div>

      <div ref={boxRef} className={`relative hidden ${hideSearch ? '' : 'sm:block'}`}>
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search galaxy…"
          aria-label="Search galaxy"
          className="w-44 rounded-lg border border-white/10 bg-void-900/60 py-1.5 pl-8 pr-7 text-xs text-slate-200 placeholder:text-slate-500 focus:border-violet-400/50 focus:outline-none lg:w-60"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {open && results.length > 0 && (
          <ul className="glass-strong absolute right-0 top-10 max-h-64 w-72 overflow-y-auto rounded-xl p-1">
            {results.map((result) => (
              <li key={result.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect({ kind: result.kind, id: result.id, categoryKey: result.categoryKey })
                    setOpen(false)
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs text-slate-200 hover:bg-white/10"
                >
                  <span className="truncate">{result.label}</span>
                  <span className="ml-2 shrink-0 text-[10px] uppercase text-slate-500">
                    {CATEGORY_BY_KEY[result.categoryKey]?.label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {right}

      <button type="button" onClick={onPresent} className="btn-ghost px-2.5 py-1.5 text-xs" title="Presentation mode">
        <Presentation className="h-3.5 w-3.5" />
        <span className="hidden lg:inline">Present</span>
      </button>
    </div>
  )
}
