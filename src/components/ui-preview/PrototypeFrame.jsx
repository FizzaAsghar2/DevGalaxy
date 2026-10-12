import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, CheckCircle2, ChevronDown, LogOut, Menu, Search, Settings, Star, User, X } from 'lucide-react'
import { PageSections } from './sections'

const RADIUS = { none: ['0px', '0px'], small: ['6px', '4px'], medium: ['12px', '8px'], large: ['20px', '12px'], pill: ['24px', '999px'] }
const FONTS = {
  sans: '"Inter", ui-sans-serif, system-ui, sans-serif',
  rounded: '"Nunito", "Quicksand", ui-rounded, "Inter", system-ui, sans-serif',
  serif: '"Georgia", "Times New Roman", serif',
  mono: '"JetBrains Mono", ui-monospace, "SFMono-Regular", monospace',
  display: '"Space Grotesk", "Inter", system-ui, sans-serif',
}
const GAP = { compact: '0.75rem', comfortable: '1.25rem', spacious: '1.75rem' }

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function buttonVars(d) {
  const radius = d.buttonStyle === 'pill' ? '999px' : 'var(--p-radius-sm)'
  if (d.buttonStyle === 'outline') return { '--p-btn-bg': 'transparent', '--p-btn-fg': d.primaryColor, '--p-btn-border': `1.5px solid ${d.primaryColor}`, '--p-btn-radius': radius }
  if (d.buttonStyle === 'gradient') return { '--p-btn-bg': `linear-gradient(120deg, ${d.primaryColor}, ${d.secondaryColor})`, '--p-btn-fg': '#ffffff', '--p-btn-border': 'none', '--p-btn-radius': radius }
  return { '--p-btn-bg': d.primaryColor, '--p-btn-fg': luminance(d.primaryColor) > 0.45 ? '#0f172a' : '#ffffff', '--p-btn-border': 'none', '--p-btn-radius': radius }
}

function cardVars(d, dark) {
  const border = `1px solid ${dark ? 'rgba(255,255,255,0.09)' : 'rgba(15,23,42,0.09)'}`
  if (d.cardStyle === 'elevated') return { '--p-card-bg': d.surfaceColor, '--p-card-border': dark ? border : '1px solid transparent', '--p-card-shadow': dark ? '0 10px 30px -12px rgba(0,0,0,0.6)' : '0 2px 4px rgba(15,23,42,0.04), 0 12px 32px -12px rgba(15,23,42,0.18)', '--p-card-blur': 'none' }
  if (d.cardStyle === 'flat') return { '--p-card-bg': `color-mix(in srgb, ${d.textColor} 4%, ${d.surfaceColor})`, '--p-card-border': '1px solid transparent', '--p-card-shadow': 'none', '--p-card-blur': 'none' }
  if (d.cardStyle === 'glass') return { '--p-card-bg': `color-mix(in srgb, ${d.surfaceColor} 72%, transparent)`, '--p-card-border': `1px solid color-mix(in srgb, ${d.primaryColor} 25%, transparent)`, '--p-card-shadow': `0 0 0 1px rgba(255,255,255,0.02) inset, 0 12px 40px -18px color-mix(in srgb, ${d.primaryColor} 45%, transparent)`, '--p-card-blur': 'blur(10px)' }
  return { '--p-card-bg': d.surfaceColor, '--p-card-border': border, '--p-card-shadow': dark ? '0 1px 0 rgba(255,255,255,0.03) inset' : '0 1px 2px rgba(15,23,42,0.05)', '--p-card-blur': 'none' }
}

const FLOW = /book|rent|reserv|checkout|order|request|apply|enrol|register for/i

export function designVars(d) {
  const [radius, radiusSm] = RADIUS[d.borderRadius] ?? RADIUS.medium
  const dark = d.theme === 'dark'
  const body = FONTS[d.fontStyle] ?? FONTS.sans
  return {
    '--p-primary': d.primaryColor,
    '--p-secondary': d.secondaryColor,
    '--p-accent': d.accentColor,
    '--p-bg': d.backgroundColor,
    '--p-surface': d.surfaceColor,
    '--p-text': d.textColor,
    '--p-muted': d.mutedColor,
    '--p-on-primary': luminance(d.primaryColor) > 0.45 ? '#0f172a' : '#ffffff',
    '--p-border': dark ? 'rgba(255,255,255,0.09)' : 'rgba(15,23,42,0.09)',
    '--p-shadow': dark ? '0 1px 0 rgba(255,255,255,0.03) inset' : '0 1px 2px rgba(15,23,42,0.05), 0 8px 24px -16px rgba(15,23,42,0.25)',
    '--p-radius': radius,
    '--p-radius-sm': radiusSm,
    '--p-font': body,
    '--p-display': d.fontStyle === 'serif' ? FONTS.serif : d.fontStyle === 'mono' ? FONTS.mono : d.fontStyle === 'rounded' ? FONTS.rounded : FONTS.display,
    '--p-gap': GAP[d.density] ?? GAP.comfortable,
    ...buttonVars(d),
    ...cardVars(d, dark),
    colorScheme: dark ? 'dark' : 'light',
  }
}

const LAYOUT_CLASS = {
  landing: 'max-w-6xl',
  browse: 'max-w-6xl',
  detail: 'max-w-5xl',
  dashboard: 'max-w-6xl',
  focus: 'max-w-2xl',
  split: 'max-w-6xl md:grid md:grid-cols-[1.5fr_1fr] md:items-start',
  centered: 'max-w-md min-h-[70%] flex flex-col justify-center',
  stack: 'max-w-4xl',
}

function Brand({ name }) {
  return (
    <span className="flex items-center gap-2">
      <span className="h-7 w-7" style={{ borderRadius: 'var(--p-radius-sm)', background: 'linear-gradient(135deg, var(--p-primary), var(--p-secondary))' }} />
      <span className="p-display text-sm font-bold" style={{ color: 'var(--p-text)' }}>{name}</span>
    </span>
  )
}

function Footer({ d, pages, onNavigate }) {
  const columns = [pages.slice(0, 4), pages.slice(4, 8)].filter((c) => c.length)
  return (
    <footer className="mt-8 px-6 py-8" style={{ background: 'var(--p-surface)', borderTop: '1px solid var(--p-border)' }}>
      <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-8">
        <div className="max-w-xs">
          <Brand name={d.appName} />
          <p className="mt-2 text-xs" style={{ color: 'var(--p-muted)' }}>{d.tagline || `${d.appName} — built with care for the people who use it every day.`}</p>
        </div>
        {columns.map((col, i) => (
          <div key={i} className="flex flex-col gap-1.5 text-xs">
            <p className="font-semibold" style={{ color: 'var(--p-text)' }}>{i === 0 ? 'Product' : 'More'}</p>
            {col.map((p) => <button key={p.id} type="button" onClick={() => onNavigate(p.id)} className="text-left hover:underline" style={{ color: 'var(--p-muted)' }}>{p.name}</button>)}
          </div>
        ))}
        <div className="flex flex-col gap-1.5 text-xs" style={{ color: 'var(--p-muted)' }}>
          <p className="font-semibold" style={{ color: 'var(--p-text)' }}>Company</p>
          <span>About</span><span>Help centre</span><span>Privacy</span>
        </div>
      </div>
      <p className="mx-auto mt-6 max-w-6xl text-[10px]" style={{ color: 'var(--p-muted)' }}>© 2026 {d.appName}. All rights reserved.</p>
    </footer>
  )
}

function HeaderSearch({ pages, records, onNavigate, onOpen }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const query = q.trim().toLowerCase()
  const pageHits = query ? pages.filter((p) => p.name.toLowerCase().includes(query)).slice(0, 4) : pages.slice(0, 4)
  const recordHits = query ? records.filter((r) => String(r.title).toLowerCase().includes(query)).slice(0, 4) : []
  return (
    <div className="relative">
      <div className="flex items-center gap-2 px-2.5 py-1.5 text-xs" style={{ border: '1px solid var(--p-border)', borderRadius: 'var(--p-radius-sm)', color: 'var(--p-muted)' }}>
        <Search className="h-3.5 w-3.5" />
        <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} placeholder="Search" aria-label="Search the app" className="w-28 bg-transparent outline-none lg:w-40" style={{ color: 'var(--p-text)' }} />
      </div>
      {open && (pageHits.length > 0 || recordHits.length > 0) && (
        <div className="absolute right-0 z-30 mt-1 w-64 py-1 text-xs shadow-xl" style={{ background: 'var(--p-surface)', border: '1px solid var(--p-border)', borderRadius: 'var(--p-radius-sm)' }}>
          {recordHits.map((r) => (
            <button key={r.title} type="button" onMouseDown={() => { onOpen(r); setQ('') }} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:brightness-95" style={{ color: 'var(--p-text)' }}>
              <Star className="h-3.5 w-3.5" style={{ color: 'var(--p-accent)' }} /> <span className="truncate">{r.title}</span>
            </button>
          ))}
          <p className="px-3 pb-1 pt-2 text-[10px] uppercase tracking-wide" style={{ color: 'var(--p-muted)' }}>Pages</p>
          {pageHits.map((p) => (
            <button key={p.id} type="button" onMouseDown={() => { onNavigate(p.id); setQ('') }} className="block w-full px-3 py-2 text-left hover:brightness-95" style={{ color: 'var(--p-text)' }}>{p.name}</button>
          ))}
        </div>
      )}
    </div>
  )
}

function AccountMenu({ pages, onNavigate, onSignOut }) {
  const [open, setOpen] = useState(false)
  const links = pages.filter((p) => /profile|account|setting|dashboard/i.test(p.name)).slice(0, 3)
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu" className="flex items-center gap-1">
        <span className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--p-primary), var(--p-accent))' }}>AO</span>
        <ChevronDown className="h-3.5 w-3.5" style={{ color: 'var(--p-muted)' }} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-2 w-48 py-1 text-xs shadow-xl" style={{ background: 'var(--p-surface)', border: '1px solid var(--p-border)', borderRadius: 'var(--p-radius-sm)' }}>
          <p className="px-3 py-2 font-semibold" style={{ color: 'var(--p-text)' }}>Amara Okafor<span className="block font-normal" style={{ color: 'var(--p-muted)' }}>amara@example.com</span></p>
          {links.map((p) => (
            <button key={p.id} type="button" role="menuitem" onClick={() => { setOpen(false); onNavigate(p.id) }} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:brightness-95" style={{ color: 'var(--p-text)' }}>
              {/setting/i.test(p.name) ? <Settings className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />} {p.name}
            </button>
          ))}
          <button type="button" role="menuitem" onClick={() => { setOpen(false); onSignOut() }} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:brightness-95" style={{ color: 'var(--p-text)', borderTop: '1px solid var(--p-border)' }}>
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Renders a generated UI spec as a working multi-page prototype. `device`
 * narrows the frame; below `md` the navigation collapses to a drawer + bottom bar.
 */
export default function PrototypeFrame({ spec, pageId, onNavigate, device = 'desktop', highlightPageId }) {
  const d = spec.uiDesign
  const page = spec.uiPages.find((p) => p.id === pageId) ?? spec.uiPages[0]
  const [drawer, setDrawer] = useState(false)
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [signedIn, setSignedIn] = useState(true)
  const scrollRef = useRef(null)
  const compact = device !== 'desktop'
  const vars = useMemo(() => designVars(d), [d])
  const navPages = spec.uiPages.filter((p) => !/\b(sign in|login|log in|sign up|register)\b/i.test(p.name))
  const authPage = spec.uiPages.find((p) => /\b(sign in|login|log in)\b/i.test(p.name))
  const sidebar = d.navigation === 'sidebar' && !compact
  const detailPage = spec.uiPages.find((p) => p.layout === 'detail') ?? spec.uiPages.find((p) => /detail|profile$/i.test(p.name) && !/^(my )?profile$/i.test(p.name))
  const flowPage = spec.uiPages.find((p) => FLOW.test(p.name) && p.layout === 'focus') ?? spec.uiPages.find((p) => FLOW.test(p.name))
  const browsePage = spec.uiPages.find((p) => p.layout === 'browse')
  const records = useMemo(() => {
    const seen = new Set()
    return spec.uiPages.flatMap((p) => p.sections.filter((s) => ['cards', 'table', 'list'].includes(s.type)).flatMap((s) => s.items)).filter((r) => r.title && !seen.has(r.title) && seen.add(r.title))
  }, [spec])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
    setDrawer(false)
  }, [page?.id])

  if (!page) return null

  const go = (id, item) => {
    if (item) setSelected(item)
    onNavigate(id)
  }

  const openRecord = (item) => {
    if (detailPage && page.id !== detailPage.id) return go(detailPage.id, item)
    setModal({ kind: 'detail', label: item.title, item })
  }

  const onAction = (label, item) => {
    const text = String(label)
    const target = spec.uiPages.find((p) => p.name.toLowerCase() === text.toLowerCase() || text.toLowerCase() === `browse ${p.name.toLowerCase()}`)
    if (target) return go(target.id, item)
    if (/sign in|create account|log in/i.test(text)) {
      setSignedIn(true)
      if (authPage && page.id === authPage.id) return go(navPages[0]?.id ?? page.id)
      if (authPage) return go(authPage.id)
    }
    if (/^(open|view|details?)$/i.test(text) && item) return openRecord(item)
    if (/^category$/i.test(text) && browsePage) return go(browsePage.id)
    if (/^(get started|explore|start)/i.test(text) && browsePage && page.id !== browsePage.id) return go(browsePage.id)
    if (FLOW.test(text) && flowPage && page.id !== flowPage.id) return go(flowPage.id, item?.title ? item : selected)
    if (FLOW.test(text) && !flowPage && item && detailPage && page.id !== detailPage.id) return go(detailPage.id, item)
    if (item?.title && !item.subtitle?.includes(':') && /badge|open/i.test(text)) return setModal({ kind: 'detail', label: item.title, item })
    setModal({ kind: 'done', label: text, item })
  }

  const navLink = (p, extra = '') => (
    <button key={p.id} type="button" onClick={() => onNavigate(p.id)} className={`whitespace-nowrap px-3 py-2 text-left text-xs font-medium transition ${extra}`} style={{ borderRadius: 'var(--p-radius-sm)', color: p.id === page.id ? 'var(--p-primary)' : 'var(--p-muted)', background: p.id === page.id ? 'color-mix(in srgb, var(--p-primary) 12%, transparent)' : 'transparent', outline: highlightPageId === p.id ? '2px dashed var(--p-accent)' : 'none' }}>
      {p.name}
    </button>
  )

  return (
    <div className="prototype relative flex h-full w-full overflow-hidden" style={{ ...vars, background: 'var(--p-bg)', color: 'var(--p-text)', fontFamily: 'var(--p-font)' }}>
      {sidebar && (
        <aside className="flex w-56 shrink-0 flex-col gap-1 p-3" style={{ background: 'var(--p-surface)', borderRight: '1px solid var(--p-border)' }}>
          <div className="mb-4 px-2 pt-1"><Brand name={d.appName} /></div>
          {navPages.map((p) => navLink(p))}
          {authPage && <div className="mt-auto">{navLink(authPage, 'w-full')}</div>}
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-3 px-4 py-3" style={{ background: sidebar ? 'var(--p-bg)' : 'var(--p-surface)', borderBottom: '1px solid var(--p-border)' }}>
          {compact && <button type="button" onClick={() => setDrawer(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>}
          {!sidebar && <Brand name={d.appName} />}
          {!sidebar && !compact && <nav className="ml-4 flex min-w-0 gap-1 overflow-x-auto">{navPages.slice(0, 7).map((p) => navLink(p))}</nav>}
          {sidebar && <p className="p-display text-sm font-semibold">{page.name}</p>}
          <div className="ml-auto flex items-center gap-2">
            {!compact && <HeaderSearch pages={navPages} records={records} onNavigate={(id) => go(id)} onOpen={openRecord} />}
            <button type="button" onClick={() => setModal({ kind: 'done', label: 'Notifications', item: { title: `3 new updates in ${d.appName}` } })} aria-label="Notifications" className="relative p-1.5" style={{ color: 'var(--p-muted)' }}>
              <Bell className="h-4 w-4" /><span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full" style={{ background: 'var(--p-accent)' }} />
            </button>
            {signedIn ? (
              <AccountMenu pages={navPages} onNavigate={(id) => go(id)} onSignOut={() => { setSignedIn(false); if (authPage) go(authPage.id) }} />
            ) : (
              authPage && page.id !== authPage.id && <button type="button" onClick={() => go(authPage.id)} className="px-3 py-1.5 text-xs font-semibold" style={{ background: 'var(--p-btn-bg)', color: 'var(--p-btn-fg)', border: 'var(--p-btn-border)', borderRadius: 'var(--p-btn-radius)' }}>Sign in</button>
            )}
          </div>
        </header>

        <main ref={scrollRef} className={`flex-1 overflow-y-auto ${compact ? 'pb-20' : ''}`}>
          <AnimatePresence mode="wait">
            <motion.div key={page.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className={`mx-auto w-full px-4 py-5 sm:px-6 ${LAYOUT_CLASS[page.layout] ?? LAYOUT_CLASS.stack}`} style={{ display: page.layout === 'split' && !compact ? 'grid' : 'flex', flexDirection: 'column', gap: 'var(--p-gap)' }}>
              {!['landing', 'centered', 'detail'].includes(page.layout) && !sidebar && (
                <div className={page.layout === 'split' && !compact ? 'md:col-span-2' : ''}>
                  <h1 className="p-display text-xl font-bold sm:text-2xl">{page.name}</h1>
                  {page.purpose && <p className="mt-0.5 text-xs" style={{ color: 'var(--p-muted)' }}>{page.purpose}</p>}
                </div>
              )}
              <PageSections key={page.id} page={page} onAction={onAction} selection={page.id === detailPage?.id || page.id === flowPage?.id ? selected : null} />
            </motion.div>
          </AnimatePresence>
          {!sidebar && page.layout !== 'centered' && <Footer d={d} pages={navPages} onNavigate={(id) => go(id)} />}
        </main>

        {compact && (
          <nav className="absolute inset-x-0 bottom-0 flex justify-around px-2 py-2" style={{ background: 'var(--p-surface)', borderTop: '1px solid var(--p-border)' }}>
            {navPages.slice(0, 4).map((p) => (
              <button key={p.id} type="button" onClick={() => onNavigate(p.id)} className="flex min-w-0 flex-1 flex-col items-center gap-1 px-1 text-[10px] font-medium" style={{ color: p.id === page.id ? 'var(--p-primary)' : 'var(--p-muted)' }}>
                <span className="h-1.5 w-6 rounded-full" style={{ background: p.id === page.id ? 'var(--p-primary)' : 'transparent' }} />
                <span className="max-w-full truncate">{p.name}</span>
              </button>
            ))}
          </nav>
        )}
      </div>

      <AnimatePresence>
        {drawer && (
          <motion.div className="absolute inset-0 z-20 flex" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.aside initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }} className="flex w-60 flex-col gap-1 p-3" style={{ background: 'var(--p-surface)' }}>
              <div className="mb-3 flex items-center justify-between"><Brand name={d.appName} /><button type="button" onClick={() => setDrawer(false)} aria-label="Close menu"><X className="h-4 w-4" /></button></div>
              {spec.uiPages.map((p) => navLink(p, 'w-full'))}
            </motion.aside>
            <button type="button" className="flex-1 bg-black/40" aria-label="Close menu" onClick={() => setDrawer(false)} />
          </motion.div>
        )}
        {modal && (
          <motion.div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModal(null)}>
            <motion.div initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm p-5" style={{ background: 'var(--p-surface)', borderRadius: 'var(--p-radius)', border: '1px solid var(--p-border)' }} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={modal.label}>
              {modal.kind === 'detail' ? (
                <>
                  <div className="h-24" style={{ borderRadius: 'var(--p-radius-sm)', background: 'linear-gradient(135deg, var(--p-primary), var(--p-secondary))' }} />
                  <h3 className="p-display mt-3 text-base font-bold">{modal.item.title}</h3>
                  {modal.item.subtitle && <p className="mt-1 text-sm" style={{ color: 'var(--p-muted)' }}>{modal.item.subtitle}</p>}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {[modal.item.status, modal.item.meta, modal.item.rating && `★ ${modal.item.rating}`].filter(Boolean).map((v) => <span key={v} className="px-2 py-1" style={{ borderRadius: 999, background: 'color-mix(in srgb, var(--p-primary) 12%, transparent)', color: 'var(--p-primary)' }}>{v}</span>)}
                  </div>
                  <div className="mt-4 flex gap-2">
                    {flowPage && <button type="button" onClick={() => { setModal(null); go(flowPage.id, modal.item) }} className="flex-1 px-3 py-2 text-xs font-semibold" style={{ background: 'var(--p-btn-bg)', color: 'var(--p-btn-fg)', border: 'var(--p-btn-border)', borderRadius: 'var(--p-btn-radius)' }}>{flowPage.name}</button>}
                    <button type="button" onClick={() => setModal(null)} className="flex-1 px-3 py-2 text-xs font-semibold" style={{ border: '1px solid var(--p-border)', borderRadius: 'var(--p-btn-radius)' }}>Close</button>
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-8 w-8" style={{ color: 'var(--p-primary)' }} />
                  <h3 className="p-display mt-3 text-base font-bold">{/confirm|submit|pay|send|save|create|post|request|book|rent/i.test(modal.label) ? `${modal.label} — done!` : modal.label}</h3>
                  <p className="mt-1 text-sm" style={{ color: 'var(--p-muted)' }}>
                    {modal.item?.subtitle && modal.item.subtitle.includes(':') ? modal.item.subtitle : modal.item?.title ? modal.item.title : `${d.appName} received your request.`}
                  </p>
                  <p className="mt-3 text-[10px]" style={{ color: 'var(--p-muted)' }}>Demo only — nothing was saved or charged.</p>
                  <button type="button" onClick={() => setModal(null)} className="mt-4 w-full px-3 py-2 text-xs font-semibold" style={{ background: 'var(--p-btn-bg)', color: 'var(--p-btn-fg)', border: 'var(--p-btn-border)', borderRadius: 'var(--p-btn-radius)' }}>Continue</button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
