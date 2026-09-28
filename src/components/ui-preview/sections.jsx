import { useMemo, useState } from 'react'
import {
  Bell, Calendar as CalendarIcon, Check, ChevronRight, Clock, Heart, ImagePlus, MapPin, MessageSquare, Mic, Search,
  Send, SlidersHorizontal, Star, Trophy, Upload, User,
} from 'lucide-react'

/**
 * Section library for generated prototypes. Every section reads its colours
 * from CSS variables set by <PrototypeFrame>, so one component renders any
 * generated design system. Interactions (tabs, filters, search, steppers,
 * answer picks, actions) are local state only — this is a clickable mock.
 */

const PALETTE = ['var(--p-primary)', 'var(--p-secondary)', 'var(--p-accent)']

function tone(status = '') {
  const s = String(status).toLowerCase()
  if (/critical|urgent|lost|overdue|failed|rejected|high|missing|declined/.test(s)) return '#ef4444'
  if (/pending|review|progress|open|waiting|medium|draft|investigat|booked|reserved/.test(s)) return '#f59e0b'
  if (/done|found|complete|resolved|active|paid|available|approved|closed|low|verified|confirmed|won/.test(s)) return '#10b981'
  return 'var(--p-primary)'
}

export function Badge({ children }) {
  if (!children) return null
  const color = tone(children)
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap px-2 py-0.5 text-[10px] font-semibold" style={{ borderRadius: 999, color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {children}
    </span>
  )
}

function Btn({ children, variant = 'primary', onClick, className = '' }) {
  const styles = {
    primary: { background: 'var(--p-primary)', color: 'var(--p-on-primary)' },
    ghost: { background: 'transparent', color: 'var(--p-text)', border: '1px solid var(--p-border)' },
    soft: { background: 'color-mix(in srgb, var(--p-primary) 12%, transparent)', color: 'var(--p-primary)' },
  }
  return (
    <button type="button" onClick={onClick} className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold transition hover:brightness-110 active:scale-[0.98] ${className}`} style={{ ...styles[variant], borderRadius: 'var(--p-radius-sm)' }}>
      {children}
    </button>
  )
}

function Card({ children, className = '', style }) {
  return (
    <div className={className} style={{ background: 'var(--p-surface)', border: '1px solid var(--p-border)', borderRadius: 'var(--p-radius)', boxShadow: 'var(--p-shadow)', ...style }}>
      {children}
    </div>
  )
}

function Heading({ section }) {
  if (!section.title && !section.subtitle) return null
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        {section.title && <h3 className="p-display truncate text-base font-semibold" style={{ color: 'var(--p-text)' }}>{section.title}</h3>}
        {section.subtitle && <p className="mt-0.5 text-xs" style={{ color: 'var(--p-muted)' }}>{section.subtitle}</p>}
      </div>
    </div>
  )
}

function Thumb({ index, label, tall }) {
  const a = PALETTE[index % 3]
  const b = PALETTE[(index + 1) % 3]
  return (
    <div className={`relative flex items-end overflow-hidden ${tall ? 'h-40' : 'h-24'}`} style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${a} 70%, #000 0%), color-mix(in srgb, ${b} 55%, var(--p-bg)))`, borderRadius: 'var(--p-radius-sm)' }}>
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/20" />
      <div className="absolute bottom-3 left-10 h-10 w-10 rounded-full bg-white/15" />
      {label && <span className="relative m-2 rounded-full bg-black/35 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">{label}</span>}
    </div>
  )
}

function Avatar({ name = '?', index = 0, size = 28 }) {
  const initials = String(name).split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <span className="inline-flex shrink-0 items-center justify-center text-[10px] font-bold text-white" style={{ width: size, height: size, borderRadius: 999, background: PALETTE[index % 3] }}>
      {initials}
    </span>
  )
}

function Hero({ section, onAction }) {
  const centered = section.variant === 'centered'
  return (
    <section className={`relative overflow-hidden px-6 py-10 sm:px-10 sm:py-14 ${centered ? 'text-center' : ''}`} style={{ borderRadius: 'var(--p-radius)', background: 'linear-gradient(135deg, color-mix(in srgb, var(--p-primary) 18%, var(--p-surface)), color-mix(in srgb, var(--p-secondary) 12%, var(--p-surface)))', border: '1px solid var(--p-border)' }}>
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-40 blur-3xl" style={{ background: 'var(--p-accent)' }} />
      <div className={`relative grid items-center gap-8 ${centered ? '' : 'md:grid-cols-[1.3fr_1fr]'}`}>
        <div className={centered ? 'mx-auto max-w-2xl' : ''}>
          <h1 className="p-display text-2xl font-bold leading-tight sm:text-4xl" style={{ color: 'var(--p-text)' }}>{section.title}</h1>
          {section.subtitle && <p className="mt-3 text-sm" style={{ color: 'var(--p-muted)' }}>{section.subtitle}</p>}
          {section.placeholder && (
            <div className={`mt-5 flex max-w-md items-center gap-2 px-3 py-2 ${centered ? 'mx-auto' : ''}`} style={{ background: 'var(--p-surface)', border: '1px solid var(--p-border)', borderRadius: 'var(--p-radius-sm)' }}>
              <Search className="h-4 w-4" style={{ color: 'var(--p-muted)' }} />
              <input placeholder={section.placeholder} className="min-w-0 flex-1 bg-transparent text-sm outline-none" style={{ color: 'var(--p-text)' }} />
            </div>
          )}
          <div className={`mt-5 flex flex-wrap gap-2 ${centered ? 'justify-center' : ''}`}>
            {section.actions.map((a, i) => (
              <Btn key={a} variant={i === 0 ? 'primary' : 'ghost'} onClick={() => onAction(a)}>{a}{i === 0 && <ChevronRight className="h-3.5 w-3.5" />}</Btn>
            ))}
          </div>
        </div>
        {!centered && (
          <div className="hidden grid-cols-2 gap-3 md:grid">
            <Thumb index={0} tall />
            <div className="grid gap-3"><Thumb index={1} /><Thumb index={2} /></div>
          </div>
        )}
      </div>
    </section>
  )
}

function SearchBar({ section, query, onQuery }) {
  return (
    <Card className="flex flex-wrap items-center gap-2 p-2">
      <div className="flex min-w-[160px] flex-1 items-center gap-2 px-2">
        <Search className="h-4 w-4" style={{ color: 'var(--p-muted)' }} />
        <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder={section.placeholder || 'Search…'} className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none" style={{ color: 'var(--p-text)' }} />
      </div>
      {section.fields.map((f) => (
        <div key={f.label} className="flex items-center gap-1.5 px-3 py-1.5 text-xs" style={{ border: '1px solid var(--p-border)', borderRadius: 'var(--p-radius-sm)', color: 'var(--p-muted)' }}>
          {f.type === 'date' ? <CalendarIcon className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />} {f.label}
        </div>
      ))}
      <Btn>Search</Btn>
    </Card>
  )
}

function Filters({ section, active, onToggle }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--p-muted)' }}><SlidersHorizontal className="h-3.5 w-3.5" /> Filter</span>
      {['All', ...section.items.map((i) => i.title)].map((label) => {
        const on = (active ?? 'All') === label
        return (
          <button key={label} type="button" onClick={() => onToggle(label)} className="px-3 py-1 text-xs font-medium transition" style={{ borderRadius: 999, border: '1px solid var(--p-border)', background: on ? 'var(--p-primary)' : 'var(--p-surface)', color: on ? 'var(--p-on-primary)' : 'var(--p-text)' }}>
            {label}
          </button>
        )
      })}
    </div>
  )
}

function matches(item, query, filter) {
  if (filter && filter !== 'All' && item.status && item.status !== filter) return false
  if (!query) return true
  return `${item.title} ${item.subtitle ?? ''} ${item.meta ?? ''}`.toLowerCase().includes(query.toLowerCase())
}

function Cards({ section, query, filter, onAction }) {
  const [liked, setLiked] = useState({})
  const items = section.items.filter((i) => matches(i, query, filter))
  if (section.variant === 'people') {
    return (
      <div>
        <Heading section={section} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, i) => (
            <Card key={item.title} className="flex items-center gap-3 p-3">
              <Avatar name={item.title} index={i} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold" style={{ color: 'var(--p-text)' }}>{item.title}</p>
                <p className="truncate text-xs" style={{ color: 'var(--p-muted)' }}>{item.subtitle}</p>
              </div>
              <Badge>{item.status}</Badge>
            </Card>
          ))}
        </div>
      </div>
    )
  }
  const list = section.variant === 'list'
  return (
    <div>
      <Heading section={section} />
      {items.length === 0 && <p className="py-6 text-center text-sm" style={{ color: 'var(--p-muted)' }}>No results match your search.</p>}
      <div className={list ? 'grid gap-2' : 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3'}>
        {items.map((item, i) => (
          <Card key={`${item.title}-${i}`} className={`group overflow-hidden transition hover:-translate-y-0.5 ${list ? 'flex items-center gap-3 p-2' : ''}`}>
            {section.variant === 'media' || list ? (
              <div className={`relative ${list ? 'w-28 shrink-0' : 'p-2 pb-0'}`}>
                <Thumb index={i} label={list ? null : item.status} />
                {!list && (
                  <button type="button" aria-label="Save" onClick={() => setLiked((l) => ({ ...l, [i]: !l[i] }))} className="absolute right-4 top-4 rounded-full bg-black/35 p-1.5 text-white backdrop-blur">
                    <Heart className="h-3.5 w-3.5" fill={liked[i] ? 'currentColor' : 'none'} />
                  </button>
                )}
              </div>
            ) : null}
            <div className={`min-w-0 flex-1 ${list ? 'pr-2' : 'p-3'}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="truncate text-sm font-semibold" style={{ color: 'var(--p-text)' }}>{item.title}</p>
                {item.rating && <span className="flex shrink-0 items-center gap-0.5 text-[11px]" style={{ color: 'var(--p-text)' }}><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{item.rating}</span>}
              </div>
              <p className="mt-0.5 line-clamp-2 text-xs" style={{ color: 'var(--p-muted)' }}>{item.subtitle}</p>
              <div className="mt-2.5 flex items-center justify-between gap-2">
                {item.meta ? <span className="text-sm font-bold" style={{ color: 'var(--p-primary)' }}>{item.meta}</span> : <Badge>{item.status}</Badge>}
                {section.actions[0] && <Btn variant="soft" onClick={() => onAction(section.actions[0], item)}>{section.actions[0]}</Btn>}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function Table({ section, query, filter, onAction }) {
  const items = section.items.filter((i) => matches(i, query, filter))
  const columns = section.columns.length ? section.columns : ['Name', 'Details', 'Status']
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <Heading section={section} />
        <div className="flex gap-1.5">{section.actions.map((a) => <Btn key={a} variant="ghost" onClick={() => onAction(a)}>{a}</Btn>)}</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-xs">
          <thead>
            <tr style={{ color: 'var(--p-muted)', borderBottom: '1px solid var(--p-border)' }}>
              {columns.map((c) => <th key={c} className="px-4 py-2 font-semibold uppercase tracking-wide text-[10px]">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {items.map((item, r) => {
              const cells = [item.title, item.subtitle, item.meta, item.status]
              return (
                <tr key={`${item.title}-${r}`} className="cursor-pointer transition hover:brightness-95" style={{ borderBottom: '1px solid var(--p-border)', color: 'var(--p-text)' }} onClick={() => onAction('Open', item)}>
                  {columns.map((c, ci) => {
                    const last = ci === columns.length - 1
                    const value = last ? item.status : cells[ci] ?? ''
                    return (
                      <td key={c} className={`px-4 py-2.5 ${ci === 0 ? 'font-semibold' : ''}`} style={ci === 0 ? {} : { color: 'var(--p-muted)' }}>
                        {last ? <Badge>{value}</Badge> : ci === 0 ? <span className="flex items-center gap-2"><span className="h-6 w-6 shrink-0" style={{ borderRadius: 'var(--p-radius-sm)', background: `color-mix(in srgb, ${PALETTE[r % 3]} 30%, transparent)` }} />{value}</span> : value}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
        {items.length === 0 && <p className="py-6 text-center text-sm" style={{ color: 'var(--p-muted)' }}>No rows match.</p>}
      </div>
    </Card>
  )
}

function ListSection({ section, onAction }) {
  return (
    <Card className="p-4">
      <Heading section={section} />
      <ul className="divide-y" style={{ borderColor: 'var(--p-border)' }}>
        {section.items.map((item, i) => (
          <li key={`${item.title}-${i}`} className="flex cursor-pointer items-center gap-3 py-2.5" style={{ borderColor: 'var(--p-border)' }} onClick={() => onAction('Open', item)}>
            <span className="h-8 w-8 shrink-0" style={{ borderRadius: 'var(--p-radius-sm)', background: `color-mix(in srgb, ${PALETTE[i % 3]} 25%, transparent)` }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium" style={{ color: 'var(--p-text)' }}>{item.title}</p>
              {item.subtitle && <p className="truncate text-xs" style={{ color: 'var(--p-muted)' }}>{item.subtitle}</p>}
            </div>
            {item.status ? <Badge>{item.status}</Badge> : item.meta ? <span className="text-xs" style={{ color: 'var(--p-muted)' }}>{item.meta}</span> : <ChevronRight className="h-4 w-4" style={{ color: 'var(--p-muted)' }} />}
          </li>
        ))}
      </ul>
    </Card>
  )
}

function Stats({ section }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {section.items.map((item, i) => (
        <Card key={item.label ?? i} className="relative overflow-hidden p-4">
          <span className="absolute inset-x-0 top-0 h-0.5" style={{ background: PALETTE[i % 3] }} />
          <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--p-muted)' }}>{item.label}</p>
          <p className="p-display mt-1 text-xl font-bold" style={{ color: 'var(--p-text)' }}>{item.value}</p>
          {item.change && <p className="mt-0.5 text-[11px]" style={{ color: /^[−-]/.test(item.change) ? '#10b981' : 'var(--p-primary)' }}>{item.change}</p>}
        </Card>
      ))}
    </div>
  )
}

function Chart({ section }) {
  const values = section.items.map((i) => Number(i.value) || 0)
  const max = Math.max(1, ...values)
  const line = section.variant === 'line'
  const points = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * 100},${40 - (v / max) * 36}`).join(' ')
  return (
    <Card className="p-4">
      <Heading section={section} />
      {line ? (
        <svg viewBox="0 0 100 42" preserveAspectRatio="none" className="h-36 w-full">
          <defs>
            <linearGradient id={`g-${section.id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--p-primary)" stopOpacity="0.35" />
              <stop offset="1" stopColor="var(--p-primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={`0,42 ${points} 100,42`} fill={`url(#g-${section.id})`} />
          <polyline points={points} fill="none" stroke="var(--p-primary)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 2.5 }} />
        </svg>
      ) : (
        <div className="flex h-36 items-end gap-2">
          {values.map((v, i) => (
            <div key={i} className="flex-1 transition-all hover:opacity-80" style={{ height: `${(v / max) * 100}%`, background: PALETTE[i % 2 ? 1 : 0], borderRadius: 'var(--p-radius-sm) var(--p-radius-sm) 2px 2px' }} title={`${section.items[i].label}: ${v}`} />
          ))}
        </div>
      )}
      <div className="mt-2 flex justify-between text-[10px]" style={{ color: 'var(--p-muted)' }}>
        {section.items.map((i, idx) => <span key={idx} className="truncate">{i.label}</span>)}
      </div>
    </Card>
  )
}

function CalendarSection({ section }) {
  const [picked, setPicked] = useState(null)
  const byDay = Object.fromEntries(section.items.map((i) => [Number(i.day), i]))
  return (
    <Card className="p-4">
      <Heading section={section} />
      <div className="grid grid-cols-7 gap-1 text-center text-[10px]" style={{ color: 'var(--p-muted)' }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i}>{d}</span>)}
        {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => {
          const ev = byDay[day]
          const on = picked === day
          return (
            <button key={day} type="button" onClick={() => setPicked(day)} className="relative aspect-square text-xs transition" style={{ borderRadius: 'var(--p-radius-sm)', background: on ? 'var(--p-primary)' : ev ? 'color-mix(in srgb, var(--p-primary) 14%, transparent)' : 'transparent', color: on ? 'var(--p-on-primary)' : 'var(--p-text)' }} title={ev?.title}>
              {day}
              {ev && !on && <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full" style={{ background: 'var(--p-primary)' }} />}
            </button>
          )
        })}
      </div>
      {picked && <p className="mt-3 text-xs" style={{ color: 'var(--p-text)' }}>{byDay[picked] ? `${byDay[picked].title} · ${byDay[picked].meta}` : `Nothing scheduled on the ${picked}th.`}</p>}
    </Card>
  )
}

function Chat({ section }) {
  const [messages, setMessages] = useState(section.items)
  const [draft, setDraft] = useState('')
  const [thread, setThread] = useState(0)
  const send = () => {
    if (!draft.trim()) return
    const next = [...messages, { author: 'You', text: draft.trim() }]
    if (section.variant === 'assistant') next.push({ author: 'AI', text: 'Good question — here is a quick summary based on your data (sample response in the prototype).' })
    setMessages(next)
    setDraft('')
  }
  return (
    <Card className="flex h-[420px] overflow-hidden">
      {section.tabs.length > 0 && (
        <aside className="hidden w-48 shrink-0 flex-col gap-1 p-2 sm:flex" style={{ borderRight: '1px solid var(--p-border)' }}>
          {section.tabs.map((name, i) => (
            <button key={name} type="button" onClick={() => setThread(i)} className="flex items-center gap-2 px-2 py-2 text-left text-xs" style={{ borderRadius: 'var(--p-radius-sm)', background: thread === i ? 'color-mix(in srgb, var(--p-primary) 12%, transparent)' : 'transparent', color: 'var(--p-text)' }}>
              <Avatar name={name} index={i} size={24} /> <span className="truncate">{name}</span>
            </button>
          ))}
        </aside>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 px-4 py-3 text-sm font-semibold" style={{ borderBottom: '1px solid var(--p-border)', color: 'var(--p-text)' }}>
          <MessageSquare className="h-4 w-4" style={{ color: 'var(--p-primary)' }} /> {section.title || 'Chat'}
        </header>
        <div className="flex-1 space-y-2.5 overflow-y-auto p-4">
          {messages.map((m, i) => {
            const mine = m.author === 'You'
            return (
              <div key={i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[80%] px-3 py-2 text-xs leading-relaxed" style={{ borderRadius: 'var(--p-radius)', background: mine ? 'var(--p-primary)' : 'color-mix(in srgb, var(--p-text) 6%, transparent)', color: mine ? 'var(--p-on-primary)' : 'var(--p-text)' }}>
                  {!mine && <p className="mb-0.5 text-[10px] font-semibold opacity-70">{m.author}</p>}
                  {m.text}
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-2 p-3" style={{ borderTop: '1px solid var(--p-border)' }}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder={section.placeholder || 'Write a message…'} className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-sm outline-none" style={{ color: 'var(--p-text)' }} />
          <Btn onClick={send}><Send className="h-3.5 w-3.5" /></Btn>
        </div>
      </div>
    </Card>
  )
}

function Timeline({ section }) {
  return (
    <Card className="p-4">
      <Heading section={section} />
      <ol className="relative ml-2 space-y-4 pl-5" style={{ borderLeft: '2px solid var(--p-border)' }}>
        {section.items.map((item, i) => (
          <li key={i} className="relative">
            <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-4" style={{ background: PALETTE[i % 3], '--tw-ring-color': 'var(--p-surface)' }} />
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium" style={{ color: 'var(--p-text)' }}>{item.title}</p>
              <span className="flex shrink-0 items-center gap-1 text-[10px]" style={{ color: 'var(--p-muted)' }}><Clock className="h-3 w-3" />{item.meta}</span>
            </div>
            {item.subtitle && <p className="text-xs" style={{ color: 'var(--p-muted)' }}>{item.subtitle}</p>}
          </li>
        ))}
      </ol>
    </Card>
  )
}

function Kanban({ section }) {
  const [columns, setColumns] = useState(() => section.items.map((c) => ({ title: c.title, cards: Array.isArray(c.cards) ? c.cards : [] })))
  const advance = (ci, card) =>
    setColumns((cols) => cols.map((c, i) => (i === ci ? { ...c, cards: c.cards.filter((x) => x !== card) } : i === (ci + 1) % cols.length ? { ...c, cards: [...c.cards, card] } : c)))
  return (
    <div>
      <Heading section={section} />
      <div className="grid gap-3 sm:grid-cols-3">
        {columns.map((col, ci) => (
          <div key={col.title} className="p-2" style={{ background: 'color-mix(in srgb, var(--p-text) 4%, transparent)', borderRadius: 'var(--p-radius)' }}>
            <p className="mb-2 flex items-center justify-between px-1 text-xs font-semibold" style={{ color: 'var(--p-text)' }}>{col.title}<span style={{ color: 'var(--p-muted)' }}>{col.cards.length}</span></p>
            <div className="space-y-2">
              {col.cards.map((card) => (
                <Card key={card} className="cursor-pointer p-2.5 text-xs transition hover:-translate-y-0.5" style={{ color: 'var(--p-text)' }}>
                  <button type="button" className="w-full text-left" onClick={() => advance(ci, card)} title="Move to next column">{card}</button>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Gallery({ section, onAction }) {
  const [active, setActive] = useState(0)
  return (
    <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
      <div>
        <Thumb index={active} tall label={section.items[active]?.status} />
        <div className="mt-2 grid grid-cols-4 gap-2">
          {section.items.slice(0, 4).map((_, i) => (
            <button key={i} type="button" onClick={() => setActive(i)} className="overflow-hidden transition" style={{ outline: active === i ? '2px solid var(--p-primary)' : 'none', borderRadius: 'var(--p-radius-sm)' }}>
              <Thumb index={i} />
            </button>
          ))}
        </div>
      </div>
      <div>
        <h1 className="p-display text-2xl font-bold" style={{ color: 'var(--p-text)' }}>{section.title}</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--p-muted)' }}>{section.subtitle}</p>
        {section.value && <p className="mt-3 text-xl font-bold" style={{ color: 'var(--p-primary)' }}>{section.value}</p>}
        <div className="mt-4 flex gap-2"><Btn onClick={() => onAction('Contact')}>Contact</Btn><Btn variant="ghost" onClick={() => onAction('Save')}><Heart className="h-3.5 w-3.5" /> Save</Btn></div>
      </div>
    </div>
  )
}

function Profile({ section }) {
  return (
    <Card className="overflow-hidden">
      <div className="h-24" style={{ background: 'linear-gradient(120deg, var(--p-primary), var(--p-secondary))' }} />
      <div className="flex flex-wrap items-end gap-4 px-5 pb-5">
        <div className="-mt-10 rounded-full p-1" style={{ background: 'var(--p-surface)' }}><Avatar name={section.title} size={72} /></div>
        <div className="flex-1">
          <h2 className="p-display text-lg font-bold" style={{ color: 'var(--p-text)' }}>{section.title}</h2>
          <p className="text-xs" style={{ color: 'var(--p-muted)' }}>{section.subtitle}</p>
        </div>
        <Btn variant="ghost"><User className="h-3.5 w-3.5" /> Edit profile</Btn>
      </div>
      {section.items.length > 0 && (
        <div className="grid grid-cols-3" style={{ borderTop: '1px solid var(--p-border)' }}>
          {section.items.map((s) => (
            <div key={s.label} className="px-4 py-3 text-center">
              <p className="p-display text-lg font-bold" style={{ color: 'var(--p-text)' }}>{s.value}</p>
              <p className="text-[10px] uppercase" style={{ color: 'var(--p-muted)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function Field({ field }) {
  const base = { background: 'var(--p-bg)', border: '1px solid var(--p-border)', borderRadius: 'var(--p-radius-sm)', color: 'var(--p-text)' }
  if (field.type === 'textarea') return <textarea rows={3} className="w-full px-3 py-2 text-sm outline-none" style={base} placeholder={`Add ${field.label.toLowerCase()}…`} />
  if (field.type === 'select') return <select className="w-full px-3 py-2 text-sm outline-none" style={base}>{(field.options?.length ? field.options : ['Option 1', 'Option 2']).map((o) => <option key={o}>{o}</option>)}</select>
  if (field.type === 'file') return <div className="flex items-center gap-2 px-3 py-3 text-xs" style={{ ...base, borderStyle: 'dashed', color: 'var(--p-muted)' }}><ImagePlus className="h-4 w-4" /> Upload a file</div>
  return <input type={['date', 'number'].includes(field.type) ? field.type : 'text'} className="w-full px-3 py-2 text-sm outline-none" style={base} placeholder={field.label} />
}

function Form({ section, onAction }) {
  return (
    <Card className="p-5">
      <Heading section={section} />
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); onAction(section.actions[0] || 'Submit') }}>
        {section.fields.map((f) => (
          <label key={f.label} className={`block text-xs font-medium ${f.type === 'textarea' || f.type === 'file' ? 'sm:col-span-2' : ''}`} style={{ color: 'var(--p-muted)' }}>
            <span className="mb-1 block">{f.label}</span>
            <Field field={f} />
          </label>
        ))}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Btn variant="ghost">Cancel</Btn>
          <button type="submit" className="px-3.5 py-2 text-xs font-semibold" style={{ background: 'var(--p-primary)', color: 'var(--p-on-primary)', borderRadius: 'var(--p-radius-sm)' }}>{section.actions[0] || 'Submit'}</button>
        </div>
      </form>
    </Card>
  )
}

function Stepper({ section }) {
  const [step, setStep] = useState(0)
  const detailed = section.items.some((i) => i.subtitle)
  if (detailed) {
    return (
      <div>
        <Heading section={section} />
        <div className="grid gap-3 sm:grid-cols-3">
          {section.items.map((item, i) => (
            <Card key={item.title} className="p-4">
              <span className="flex h-7 w-7 items-center justify-center text-xs font-bold" style={{ borderRadius: 999, background: PALETTE[i % 3], color: '#fff' }}>{i + 1}</span>
              <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--p-text)' }}>{item.title}</p>
              <p className="mt-1 text-xs" style={{ color: 'var(--p-muted)' }}>{item.subtitle}</p>
            </Card>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2">
      {section.items.map((item, i) => (
        <button key={item.title} type="button" onClick={() => setStep(i)} className="flex flex-1 items-center gap-2 text-left">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center text-xs font-bold" style={{ borderRadius: 999, background: i <= step ? 'var(--p-primary)' : 'var(--p-border)', color: i <= step ? 'var(--p-on-primary)' : 'var(--p-muted)' }}>{i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>
          <span className="hidden truncate text-xs font-medium sm:block" style={{ color: i <= step ? 'var(--p-text)' : 'var(--p-muted)' }}>{item.title}</span>
          {i < section.items.length - 1 && <span className="h-0.5 flex-1" style={{ background: i < step ? 'var(--p-primary)' : 'var(--p-border)' }} />}
        </button>
      ))}
    </div>
  )
}

function Summary({ section, onAction }) {
  return (
    <Card className="p-5 md:sticky md:top-4">
      <Heading section={section} />
      {section.fields.length > 0 && <div className="mb-3 space-y-2">{section.fields.map((f) => <label key={f.label} className="block text-xs" style={{ color: 'var(--p-muted)' }}><span className="mb-1 block">{f.label}</span><Field field={f} /></label>)}</div>}
      <dl className="space-y-2 text-sm">
        {section.items.map((item, i) => (
          <div key={i} className={`flex justify-between gap-2 ${i === section.items.length - 1 && section.items.length > 2 ? 'pt-2 font-bold' : ''}`} style={{ borderTop: i === section.items.length - 1 && section.items.length > 2 ? '1px solid var(--p-border)' : 'none', color: 'var(--p-text)' }}>
            <dt style={{ color: i === section.items.length - 1 && section.items.length > 2 ? 'var(--p-text)' : 'var(--p-muted)' }}>{item.title}</dt>
            <dd className="text-right">{item.meta}</dd>
          </div>
        ))}
      </dl>
      {section.actions[0] && <Btn className="mt-4 w-full" onClick={() => onAction(section.actions[0])}>{section.actions[0]}</Btn>}
    </Card>
  )
}

function Feed({ section }) {
  return (
    <Card className="p-4">
      <Heading section={section} />
      <ul className="space-y-3">
        {section.items.map((item, i) => (
          <li key={i} className="flex gap-3">
            <Avatar name={item.title} index={i} />
            <div className="min-w-0 flex-1">
              <p className="text-xs" style={{ color: 'var(--p-text)' }}>{item.title}</p>
              <p className="text-[10px]" style={{ color: 'var(--p-muted)' }}>{item.meta} ago</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function Progress({ section }) {
  return (
    <Card className="p-4">
      <Heading section={section} />
      <div className="space-y-3">
        {section.items.map((item, i) => (
          <div key={item.title}>
            <div className="mb-1 flex justify-between text-xs" style={{ color: 'var(--p-text)' }}><span>{item.title}</span><span style={{ color: 'var(--p-muted)' }}>{item.value}%</span></div>
            <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--p-border)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Number(item.value) || 0)}%`, background: PALETTE[i % 3] }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function Tabs({ section }) {
  const [tab, setTab] = useState(0)
  const [toggles, setToggles] = useState(() => section.items.map((i) => Boolean(i.value)))
  const settings = section.variant === 'settings'
  const shown = settings ? section.items : section.items.slice(tab, tab + 1).concat(tab === 0 ? [] : [])
  return (
    <Card className="p-4">
      <div className="mb-4 flex gap-1 overflow-x-auto" style={{ borderBottom: '1px solid var(--p-border)' }}>
        {section.tabs.map((t, i) => (
          <button key={t} type="button" onClick={() => setTab(i)} className="-mb-px whitespace-nowrap px-3 py-2 text-xs font-semibold transition" style={{ color: tab === i ? 'var(--p-primary)' : 'var(--p-muted)', borderBottom: `2px solid ${tab === i ? 'var(--p-primary)' : 'transparent'}` }}>{t}</button>
        ))}
      </div>
      {settings ? (
        <ul className="space-y-3">
          {shown.map((item, i) => (
            <li key={item.title} className="flex items-center justify-between text-sm" style={{ color: 'var(--p-text)' }}>
              {item.title}
              <button type="button" role="switch" aria-checked={toggles[i]} onClick={() => setToggles((t) => t.map((v, j) => (j === i ? !v : v)))} className="relative h-5 w-9 rounded-full transition" style={{ background: toggles[i] ? 'var(--p-primary)' : 'var(--p-border)' }}>
                <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all" style={{ left: toggles[i] ? 18 : 2 }} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div>
          {(shown.length ? shown : section.items.slice(0, 1)).map((item) => (
            <div key={item.title}>
              <p className="text-sm font-semibold" style={{ color: 'var(--p-text)' }}>{item.title}</p>
              <p className="mt-1 text-sm" style={{ color: 'var(--p-muted)' }}>{item.subtitle}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function Leaderboard({ section }) {
  const compact = section.variant === 'compact'
  return (
    <Card className="p-4">
      <Heading section={section} />
      {!compact && section.items.length >= 3 && (
        <div className="mb-4 grid grid-cols-3 items-end gap-2 text-center">
          {[1, 0, 2].map((idx) => {
            const item = section.items[idx]
            return (
              <div key={idx}>
                <Avatar name={item.title} index={idx} size={idx === 0 ? 48 : 38} />
                <p className="mt-1 truncate text-xs font-semibold" style={{ color: 'var(--p-text)' }}>{item.title}</p>
                <div className="mt-1 flex items-center justify-center font-bold text-white" style={{ height: idx === 0 ? 70 : idx === 1 ? 52 : 40, background: PALETTE[idx], borderRadius: 'var(--p-radius-sm) var(--p-radius-sm) 0 0' }}>
                  {idx === 0 ? <Trophy className="h-5 w-5" /> : idx + 1}
                </div>
              </div>
            )
          })}
        </div>
      )}
      <ol className="space-y-1.5">
        {section.items.map((item, i) => (
          <li key={item.title} className="flex items-center gap-3 px-2 py-1.5 text-sm" style={{ borderRadius: 'var(--p-radius-sm)', background: i === 0 ? 'color-mix(in srgb, var(--p-primary) 10%, transparent)' : 'transparent', color: 'var(--p-text)' }}>
            <span className="w-5 text-xs font-bold" style={{ color: 'var(--p-muted)' }}>{i + 1}</span>
            <Avatar name={item.title} index={i} size={24} />
            <span className="flex-1 truncate">{item.title}</span>
            {item.meta && <span className="hidden text-[11px] sm:inline" style={{ color: 'var(--p-muted)' }}>{item.meta}</span>}
            <span className="font-bold" style={{ color: 'var(--p-primary)' }}>{item.value}</span>
          </li>
        ))}
      </ol>
    </Card>
  )
}

function MapSection({ section, onAction }) {
  const pins = useMemo(() => section.items.map((item, i) => ({ item, x: 12 + ((i * 37) % 76), y: 15 + ((i * 53) % 66) })), [section.items])
  const [active, setActive] = useState(0)
  return (
    <Card className="relative h-[360px] overflow-hidden">
      <div className="absolute inset-0" style={{ background: 'color-mix(in srgb, var(--p-secondary) 10%, var(--p-surface))', backgroundImage: 'linear-gradient(var(--p-border) 1px, transparent 1px), linear-gradient(90deg, var(--p-border) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <svg className="absolute inset-0 h-full w-full opacity-60" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M0 60 C 30 50, 50 80, 100 55" stroke="var(--p-secondary)" strokeWidth="3" fill="none" vectorEffect="non-scaling-stroke" /><path d="M35 0 C 40 40, 30 60, 45 100" stroke="var(--p-border)" strokeWidth="6" fill="none" vectorEffect="non-scaling-stroke" /></svg>
      {pins.map(({ item, x, y }, i) => (
        <button key={i} type="button" onClick={() => setActive(i)} className="absolute -translate-x-1/2 -translate-y-full transition hover:scale-110" style={{ left: `${x}%`, top: `${y}%` }} aria-label={item.title}>
          <MapPin className="h-7 w-7 drop-shadow" style={{ color: active === i ? 'var(--p-accent)' : 'var(--p-primary)', fill: 'var(--p-surface)' }} />
        </button>
      ))}
      {pins[active] && (
        <Card className="absolute bottom-3 left-3 right-3 flex items-center gap-3 p-3 sm:right-auto sm:w-72">
          <div className="w-16 shrink-0"><Thumb index={active} /></div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold" style={{ color: 'var(--p-text)' }}>{pins[active].item.title}</p>
            <p className="truncate text-xs" style={{ color: 'var(--p-muted)' }}>{pins[active].item.subtitle}</p>
          </div>
          <Btn variant="soft" onClick={() => onAction('Open', pins[active].item)}>View</Btn>
        </Card>
      )}
    </Card>
  )
}

function UploadSection({ section }) {
  const [files, setFiles] = useState(0)
  return (
    <button type="button" onClick={() => setFiles((f) => Math.min(6, f + 1))} className="flex w-full flex-col items-center justify-center gap-2 px-6 py-8 text-center transition hover:brightness-105" style={{ border: '2px dashed var(--p-border)', borderRadius: 'var(--p-radius)', background: 'var(--p-surface)' }}>
      <Upload className="h-6 w-6" style={{ color: 'var(--p-primary)' }} />
      <p className="text-sm font-semibold" style={{ color: 'var(--p-text)' }}>{section.title || 'Upload files'}</p>
      <p className="text-xs" style={{ color: 'var(--p-muted)' }}>{files ? `${files} file${files > 1 ? 's' : ''} added (sample)` : section.subtitle}</p>
    </button>
  )
}

function Notifications({ section }) {
  return (
    <Card className="p-4">
      <Heading section={section} />
      <ul className="space-y-2">
        {section.items.map((item, i) => (
          <li key={i} className="flex items-start gap-3 text-xs" style={{ color: 'var(--p-text)' }}>
            <Bell className="mt-0.5 h-4 w-4 shrink-0" style={{ color: PALETTE[i % 3] }} />
            <div className="flex-1"><p className="font-medium">{item.title}</p><p style={{ color: 'var(--p-muted)' }}>{item.subtitle}</p></div>
            <span style={{ color: 'var(--p-muted)' }}>{item.meta}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function Cta({ section, onAction }) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-4 px-6 py-6" style={{ borderRadius: 'var(--p-radius)', background: 'linear-gradient(120deg, var(--p-primary), var(--p-secondary))', color: 'var(--p-on-primary)' }}>
      <div>
        <h3 className="p-display text-lg font-bold">{section.title}</h3>
        {section.subtitle && <p className="text-sm opacity-85">{section.subtitle}</p>}
      </div>
      <div className="flex gap-2">{section.actions.map((a) => <button key={a} type="button" onClick={() => onAction(a)} className="bg-white px-4 py-2 text-xs font-semibold text-slate-900" style={{ borderRadius: 'var(--p-radius-sm)' }}>{a}</button>)}</div>
    </section>
  )
}

function Session({ section, onAction }) {
  const [picked, setPicked] = useState(null)
  const [recording, setRecording] = useState(false)
  const quiz = section.variant === 'quiz'
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--p-primary)' }}>{section.title}</p>
        <span className="flex items-center gap-1 px-2 py-1 text-xs font-bold" style={{ borderRadius: 999, background: 'color-mix(in srgb, var(--p-accent) 18%, transparent)', color: 'var(--p-text)' }}><Clock className="h-3.5 w-3.5" />{quiz ? `${section.value}s` : `${Math.floor(Number(section.value) / 60)}:${String(Number(section.value) % 60).padStart(2, '0')}`}</span>
      </div>
      <h2 className="p-display mt-4 text-xl font-bold leading-snug" style={{ color: 'var(--p-text)' }}>{section.subtitle}</h2>
      {quiz ? (
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {section.items.map((opt, i) => (
            <button key={opt.title} type="button" onClick={() => setPicked(i)} className="px-4 py-4 text-left text-sm font-semibold transition hover:-translate-y-0.5" style={{ borderRadius: 'var(--p-radius)', background: picked === i ? PALETTE[i % 3] : 'var(--p-surface)', color: picked === i ? '#fff' : 'var(--p-text)', border: `2px solid ${picked === i ? 'transparent' : 'var(--p-border)'}` }}>
              {String.fromCharCode(65 + i)}. {opt.title}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-5 flex flex-col items-center gap-4">
          <button type="button" onClick={() => setRecording((r) => !r)} className={`flex h-20 w-20 items-center justify-center rounded-full text-white transition ${recording ? 'animate-pulse' : ''}`} style={{ background: recording ? '#ef4444' : 'var(--p-primary)' }} aria-label="Record answer">
            <Mic className="h-8 w-8" />
          </button>
          <p className="text-xs" style={{ color: 'var(--p-muted)' }}>{recording ? 'Listening… speak your answer' : 'Tap to answer out loud'}</p>
          <div className="grid w-full gap-2 sm:grid-cols-3">
            {section.items.map((m) => (
              <div key={m.title} className="px-3 py-2 text-xs" style={{ border: '1px solid var(--p-border)', borderRadius: 'var(--p-radius-sm)', color: 'var(--p-text)' }}>
                {m.title}<div className="mt-1 h-1.5 rounded-full" style={{ background: 'var(--p-border)' }}><div className="h-full rounded-full" style={{ width: `${m.value}%`, background: 'var(--p-primary)' }} /></div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mt-5 flex justify-end gap-2">{section.actions.map((a, i) => <Btn key={a} variant={i === 0 ? 'primary' : 'ghost'} onClick={() => onAction(a)}>{a}</Btn>)}</div>
    </Card>
  )
}

function Auth({ section, onAction }) {
  const [signup, setSignup] = useState(false)
  return (
    <Card className="mx-auto w-full max-w-sm p-6">
      <div className="mx-auto mb-4 h-10 w-10" style={{ borderRadius: 'var(--p-radius-sm)', background: 'linear-gradient(135deg, var(--p-primary), var(--p-secondary))' }} />
      <h2 className="p-display text-center text-xl font-bold" style={{ color: 'var(--p-text)' }}>{section.title}</h2>
      <p className="mt-1 text-center text-xs" style={{ color: 'var(--p-muted)' }}>{signup ? 'Create your account in seconds' : section.subtitle}</p>
      <div className="mt-5 space-y-3">
        {signup && <Field field={{ label: 'Full name', type: 'text' }} />}
        <Field field={{ label: 'Email address', type: 'text' }} />
        <Field field={{ label: 'Password', type: 'text' }} />
        <Btn className="w-full" onClick={() => onAction(signup ? 'Create account' : 'Sign in')}>{signup ? 'Create account' : section.actions[0] || 'Sign in'}</Btn>
        <button type="button" onClick={() => setSignup((s) => !s)} className="w-full text-center text-xs" style={{ color: 'var(--p-primary)' }}>{signup ? 'Have an account? Sign in' : 'New here? Create an account'}</button>
      </div>
    </Card>
  )
}

function Pricing({ section, onAction }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {section.items.map((tier, i) => (
        <Card key={tier.title} className="p-5" style={i === 1 ? { outline: '2px solid var(--p-primary)' } : undefined}>
          <p className="text-sm font-semibold" style={{ color: 'var(--p-text)' }}>{tier.title}</p>
          <p className="p-display mt-2 text-2xl font-bold" style={{ color: 'var(--p-text)' }}>{tier.meta}</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--p-muted)' }}>{tier.subtitle}</p>
          <Btn className="mt-4 w-full" variant={i === 1 ? 'primary' : 'ghost'} onClick={() => onAction('Choose plan')}>Choose</Btn>
        </Card>
      ))}
    </div>
  )
}

function Faq({ section }) {
  const [open, setOpen] = useState(0)
  return (
    <Card className="divide-y p-2" style={{ borderColor: 'var(--p-border)' }}>
      {section.items.map((item, i) => (
        <div key={item.title} style={{ borderColor: 'var(--p-border)' }}>
          <button type="button" onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full items-center justify-between px-3 py-3 text-left text-sm font-medium" style={{ color: 'var(--p-text)' }}>
            {item.title}<ChevronRight className={`h-4 w-4 transition ${open === i ? 'rotate-90' : ''}`} />
          </button>
          {open === i && <p className="px-3 pb-3 text-xs" style={{ color: 'var(--p-muted)' }}>{item.subtitle}</p>}
        </div>
      ))}
    </Card>
  )
}

const RENDERERS = {
  hero: Hero, cards: Cards, table: Table, list: ListSection, stats: Stats, chart: Chart, calendar: CalendarSection,
  chat: Chat, timeline: Timeline, kanban: Kanban, gallery: Gallery, profile: Profile, form: Form, stepper: Stepper,
  summary: Summary, feed: Feed, progress: Progress, tabs: Tabs, leaderboard: Leaderboard, map: MapSection,
  upload: UploadSection, notifications: Notifications, cta: Cta, session: Session, auth: Auth, pricing: Pricing, faq: Faq,
}

/** Renders a page's sections; search + filter sections drive the data sections that follow them. */
export function PageSections({ page, onAction }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All')
  return page.sections.map((section) => {
    if (section.type === 'search') return <SearchBar key={section.id} section={section} query={query} onQuery={setQuery} />
    if (section.type === 'filters') return <Filters key={section.id} section={section} active={filter} onToggle={setFilter} />
    const Component = RENDERERS[section.type] ?? ListSection
    return <Component key={section.id} section={section} query={query} filter={filter} onAction={onAction} />
  })
}
