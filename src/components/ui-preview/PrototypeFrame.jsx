import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, CheckCircle2, Menu, Search, X } from 'lucide-react'
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

/**
 * Renders a generated UI spec as a working multi-page prototype. `device`
 * narrows the frame; below `md` the navigation collapses to a drawer + bottom bar.
 */
export default function PrototypeFrame({ spec, pageId, onNavigate, device = 'desktop', highlightPageId }) {
  const d = spec.uiDesign
  const page = spec.uiPages.find((p) => p.id === pageId) ?? spec.uiPages[0]
  const [drawer, setDrawer] = useState(false)
  const [modal, setModal] = useState(null)
  const scrollRef = useRef(null)
  const compact = device !== 'desktop'
  const vars = useMemo(() => designVars(d), [d])
  const navPages = spec.uiPages.filter((p) => !/sign in|login|sign up|register/i.test(p.name))
  const authPage = spec.uiPages.find((p) => /sign in|login/i.test(p.name))
  const sidebar = d.navigation === 'sidebar' && !compact

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
    setDrawer(false)
  }, [page?.id])

  if (!page) return null

  const onAction = (label, item) => {
    const target = spec.uiPages.find((p) => p.name.toLowerCase() === String(label).toLowerCase())
    if (target) return onNavigate(target.id)
    if (/sign in|create account|log in/i.test(label) && authPage && page.id !== authPage.id) return onNavigate(authPage.id)
    const detail = /open|view|book|rent|contact/i.test(label) && spec.uiPages.find((p) => /detail/i.test(p.name))
    if (detail && item && page.id !== detail.id) return onNavigate(detail.id)
    setModal({ label, item })
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
            {!compact && (
              <div className="flex items-center gap-2 px-2.5 py-1.5 text-xs" style={{ border: '1px solid var(--p-border)', borderRadius: 'var(--p-radius-sm)', color: 'var(--p-muted)' }}>
                <Search className="h-3.5 w-3.5" /> Search
              </div>
            )}
            <button type="button" onClick={() => setModal({ label: 'Notifications' })} aria-label="Notifications" className="relative p-1.5" style={{ color: 'var(--p-muted)' }}>
              <Bell className="h-4 w-4" /><span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full" style={{ background: 'var(--p-accent)' }} />
            </button>
            {authPage && page.id !== authPage.id && !compact && (
              <button type="button" onClick={() => onNavigate(authPage.id)} className="px-3 py-1.5 text-xs font-semibold" style={{ background: 'var(--p-primary)', color: 'var(--p-on-primary)', borderRadius: 'var(--p-radius-sm)' }}>Sign in</button>
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
              <PageSections key={page.id} page={page} onAction={onAction} />
            </motion.div>
          </AnimatePresence>
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
              <CheckCircle2 className="h-8 w-8" style={{ color: 'var(--p-primary)' }} />
              <h3 className="p-display mt-3 text-base font-bold">{modal.label}</h3>
              <p className="mt-1 text-sm" style={{ color: 'var(--p-muted)' }}>
                {modal.item?.title ? `${modal.item.title} — ` : ''}This is a prototype interaction. In the real app this step would continue the “{modal.label}” flow.
              </p>
              <button type="button" onClick={() => setModal(null)} className="mt-4 w-full px-3 py-2 text-xs font-semibold" style={{ background: 'var(--p-primary)', color: 'var(--p-on-primary)', borderRadius: 'var(--p-radius-sm)' }}>Got it</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
