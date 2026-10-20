// @ts-check
import { TAILWIND_THEME, googleFontsHref, tokensToCss } from './tokens.js'
import { FRAMEWORKS, slug, titleCase } from './spec.js'

/**
 * Deterministic code generator: SiteSpec → real project files (React + TypeScript +
 * Tailwind). The same spec always produces the same files, so offline edits change
 * only the files they affect and version diffs stay meaningful.
 */

/** @typedef {import('./paths.js').ProjectFile} ProjectFile */
/** @typedef {import('./spec.js').SiteSpec} SiteSpec */

export const DEP_VERSIONS = {
  react: '^19.2.0', 'react-dom': '^19.2.0', 'lucide-react': '^1.48.0',
  vite: '^8.3.0', '@vitejs/plugin-react': '^6.1.1', typescript: '~5.9.3', tailwindcss: '^3.4.17', postcss: '^8.5.0', autoprefixer: '^10.4.20',
  '@types/react': '^19.2.0', '@types/react-dom': '^19.2.0', next: '^16.0.0',
}

/** @param {string} s */
const pascal = (s) => titleCase(s.replace(/[^a-zA-Z0-9 ]+/g, ' ')).replace(/\s+/g, '').replace(/^\d/, 'P$&') || 'Page'
/** @param {unknown} v */
const js = (v) => JSON.stringify(v, null, 2)

/** @param {SiteSpec} spec */
export function designTokens(spec) {
  return {
    palette: spec.palette, headingFont: spec.typography.heading, bodyFont: spec.typography.body, radius: spec.layout.radius,
    density: spec.layout.density, animationSpeed: spec.animation.level === 'none' ? 0.25 : spec.animation.speed, maxWidth: spec.layout.maxWidth,
  }
}

/** @param {SiteSpec} spec */
function indexCss(spec) {
  const anim = spec.animation.level
  return `${tokensToCss(designTokens(spec))}

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html { scroll-behavior: smooth; }
  body { @apply bg-background font-body text-foreground antialiased; }
  h1, h2, h3, h4 { font-family: var(--font-heading); letter-spacing: -0.015em; }
  :focus-visible { outline: 2px solid rgb(var(--color-primary)); outline-offset: 3px; }
}

@layer components {
  .container-site { max-width: var(--max-w); margin-inline: auto; padding-inline: 1.5rem; }
  .section { padding-block: var(--section-y); }
  .card { @apply rounded-brand bg-surface ${spec.style.cardStyle === 'bordered' ? 'border border-foreground/10' : spec.style.cardStyle === 'elevated' ? 'shadow-xl shadow-black/10' : ''}; }
  .btn { @apply inline-flex items-center justify-center gap-2 rounded-brand px-5 py-3 text-sm font-semibold transition; }
  .btn-primary { @apply btn bg-primary text-on-primary hover:opacity-90; }
  .btn-outline { @apply btn border border-foreground/20 hover:border-primary hover:text-primary; }
  .eyebrow { @apply text-xs font-semibold uppercase tracking-[0.2em] text-primary; }
}

.reveal { animation: ${anim === 'none' ? 'none' : `rise calc(${anim === 'rich' ? '0.9s' : '0.6s'} / var(--anim-speed)) cubic-bezier(0.22, 1, 0.36, 1) both`}; }
@keyframes rise { from { opacity: 0; transform: translateY(${anim === 'rich' ? '28px' : '14px'}); } to { opacity: 1; transform: none; } }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
}
`
}

/** Generated SVG artwork so the site never depends on external images. @param {SiteSpec} spec @param {number} i */
export function artworkSvg(spec, i) {
  const p = spec.palette
  const r = 90 + ((i * 37) % 80)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img" aria-label="${spec.name} artwork ${i + 1}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.surface}"/><stop offset="1" stop-color="${p.background}"/></linearGradient>
  <radialGradient id="o" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${p.primary}" stop-opacity="0.95"/><stop offset="1" stop-color="${p.accent}" stop-opacity="0.15"/></radialGradient></defs>
  <rect width="800" height="600" fill="url(#g)"/>
  <circle cx="${300 + ((i * 83) % 220)}" cy="${240 + ((i * 47) % 140)}" r="${r}" fill="url(#o)"/>
  <circle cx="${520 - ((i * 61) % 200)}" cy="${330 - ((i * 29) % 120)}" r="${r * 0.45}" fill="${p.accent}" fill-opacity="0.35"/>
  <path d="M0 ${470 - i * 9} C 220 ${400 + i * 7}, 520 ${540 - i * 5}, 800 ${440 + i * 3} L800 600 L0 600Z" fill="${p.primary}" fill-opacity="0.12"/>
</svg>
`
}

const ICONS = { sparkles: 'Sparkles', zap: 'Zap', shield: 'ShieldCheck' }

/** Section component sources, keyed by section type. Each reads its content from props. */
const SECTION_SOURCES = /** @type {Record<string, (spec: SiteSpec) => string>} */ ({
  hero: (spec) => `import { ArrowRight } from 'lucide-react'
import { Link } from '../../router'
import type { SectionData } from '../../data/site'
${spec.style.heroLayout === 'split' ? "import art from '../../assets/art-0.svg'\n" : ''}
export default function HeroSection({ data }: { data: SectionData }) {
  const [primary, secondary] = data.items
  return (
    <section className="section relative overflow-hidden">
      <div className="pointer-events-none absolute -top-32 right-0 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="container-site ${spec.style.heroLayout === 'split' ? 'grid items-center gap-12 lg:grid-cols-2' : spec.style.heroLayout === 'editorial' ? 'max-w-4xl' : 'text-center'}">
        <div className="reveal">
          <p className="eyebrow">${spec.style.mood}</p>
          <h1 className="mt-4 ${spec.style.heroLayout === 'editorial' ? 'text-5xl sm:text-7xl' : 'text-4xl sm:text-6xl'} font-semibold leading-[1.05]">{data.title}</h1>
          {data.subtitle && <p className="mt-6 max-w-xl text-lg text-muted${spec.style.heroLayout === 'centered' ? ' mx-auto' : ''}">{data.subtitle}</p>}
          <div className="mt-8 flex flex-wrap gap-3${spec.style.heroLayout === 'centered' ? ' justify-center' : ''}">
            {primary && <Link to="${spec.pages[1]?.path ?? '/'}" className="btn-primary">{primary.title} <ArrowRight size={16} aria-hidden /></Link>}
            {secondary && <Link to="${spec.pages.find((p) => /about/i.test(p.name))?.path ?? spec.pages[spec.pages.length - 1].path}" className="btn-outline">{secondary.title}</Link>}
          </div>
        </div>
        ${spec.style.heroLayout === 'split' ? '<img src={art} alt="" className="reveal card aspect-[4/3] w-full object-cover" />' : ''}
      </div>
    </section>
  )
}
`,
  features: () => `import { ShieldCheck, Sparkles, Zap } from 'lucide-react'
import type { SectionData } from '../../data/site'

const ICONS = { sparkles: Sparkles, zap: Zap, shield: ShieldCheck }

export default function FeaturesSection({ data }: { data: SectionData }) {
  return (
    <section className="section">
      <div className="container-site">
        <h2 className="text-3xl font-semibold sm:text-4xl">{data.title}</h2>
        {data.subtitle && <p className="mt-3 max-w-2xl text-muted">{data.subtitle}</p>}
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {data.items.map((item, i) => {
            const Icon = ICONS[(item.tag ?? 'sparkles') as keyof typeof ICONS] ?? Sparkles
            return (
              <article key={item.title} className="card reveal p-6" style={{ animationDelay: \`\${i * 80}ms\` }}>
                <Icon className="text-primary" aria-hidden />
                <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted">{item.text}</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
`,
  cards: (spec) => `import { useState } from 'react'
import { X } from 'lucide-react'
import type { SectionData, SectionItem } from '../../data/site'
import { addToCart } from '../../lib/store'
import art1 from '../../assets/art-1.svg'
import art2 from '../../assets/art-2.svg'
import art3 from '../../assets/art-3.svg'

const ART = [art1, art2, art3]

export default function CardsSection({ data }: { data: SectionData }) {
  const [open, setOpen] = useState<SectionItem | null>(null)
  const [added, setAdded] = useState('')
  return (
    <section className="section">
      <div className="container-site">
        <h2 className="text-3xl font-semibold sm:text-4xl">{data.title}</h2>
        {data.subtitle && <p className="mt-3 text-muted">{data.subtitle}</p>}
        <div className="mt-10 grid gap-6 ${spec.style.cardSize === 'sm' ? 'grid-cols-2 md:grid-cols-4' : spec.style.cardSize === 'lg' ? 'md:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}">
          {data.items.map((item, i) => (
            <button key={item.title} type="button" onClick={() => setOpen(item)} className="card reveal group overflow-hidden text-left transition hover:-translate-y-1">
              <img src={ART[i % ART.length]} alt="" className="aspect-[4/3] w-full object-cover transition group-hover:scale-105" />
              <div className="${spec.style.cardSize === 'sm' ? 'p-3' : 'p-5'}">
                {item.meta && <span className="eyebrow">{item.meta}</span>}
                <h3 className="mt-1 font-semibold">{item.title}</h3>
                {item.price && <p className="mt-1 text-primary">{item.price}</p>}
              </div>
            </button>
          ))}
        </div>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label={open.title} onClick={() => setOpen(null)}>
          <div className="card w-full max-w-lg bg-background p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-2xl font-semibold">{open.title}</h3>
              <button type="button" onClick={() => setOpen(null)} aria-label="Close"><X /></button>
            </div>
            <p className="mt-3 text-muted">{open.text}</p>
            {open.price && <p className="mt-4 text-xl text-primary">{open.price}</p>}
            {open.price && (
              <button type="button" className="btn-primary mt-6 w-full" onClick={() => { addToCart(open.title); setAdded(open.title) }}>
                {added === open.title ? 'Added to bag ✓' : 'Add to bag'}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
`,
  gallery: () => `import type { SectionData } from '../../data/site'
import art0 from '../../assets/art-0.svg'
import art1 from '../../assets/art-1.svg'
import art2 from '../../assets/art-2.svg'
import art3 from '../../assets/art-3.svg'

const ART = [art0, art1, art2, art3]

export default function GallerySection({ data }: { data: SectionData }) {
  return (
    <section className="section">
      <div className="container-site">
        <h2 className="text-3xl font-semibold sm:text-4xl">{data.title}</h2>
        {data.subtitle && <p className="mt-3 text-muted">{data.subtitle}</p>}
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3">
          {data.items.map((item, i) => (
            <figure key={item.title} className={\`card reveal overflow-hidden \${i % 5 === 0 ? 'md:row-span-2' : ''}\`}>
              <img src={ART[i % ART.length]} alt={item.title} className="h-full w-full object-cover" />
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
`,
  testimonials: () => `import { Quote } from 'lucide-react'
import type { SectionData } from '../../data/site'

export default function TestimonialsSection({ data }: { data: SectionData }) {
  return (
    <section className="section bg-surface/50">
      <div className="container-site">
        <h2 className="text-3xl font-semibold sm:text-4xl">{data.title}</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {data.items.map((item) => (
            <figure key={item.title} className="card reveal p-6">
              <Quote className="text-primary" aria-hidden />
              <blockquote className="mt-4">{item.text}</blockquote>
              <figcaption className="mt-4 text-sm"><b>{item.title}</b> <span className="text-muted">· {item.meta}</span></figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
`,
  pricing: () => `import { useState } from 'react'
import type { SectionData } from '../../data/site'

export default function PricingSection({ data }: { data: SectionData }) {
  const [chosen, setChosen] = useState('')
  return (
    <section className="section">
      <div className="container-site">
        <h2 className="text-3xl font-semibold sm:text-4xl">{data.title}</h2>
        {data.subtitle && <p className="mt-3 text-muted">{data.subtitle}</p>}
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {data.items.map((item) => (
            <article key={item.title} className={\`card reveal p-6 \${item.tag === 'featured' ? 'ring-2 ring-primary' : ''}\`}>
              <p className="eyebrow">{item.meta}</p>
              <h3 className="mt-2 text-xl font-semibold">{item.title}</h3>
              <p className="mt-4 text-4xl font-semibold">{item.price}</p>
              <p className="mt-2 text-sm text-muted">{item.text}</p>
              <button type="button" onClick={() => setChosen(item.title)} className={item.tag === 'featured' ? 'btn-primary mt-6 w-full' : 'btn-outline mt-6 w-full'}>
                {chosen === item.title ? 'Selected ✓' : 'Choose'}
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
`,
  about: () => `import type { SectionData } from '../../data/site'
import art from '../../assets/art-2.svg'

export default function AboutSection({ data }: { data: SectionData }) {
  return (
    <section className="section">
      <div className="container-site grid items-center gap-12 md:grid-cols-2">
        <img src={art} alt="" className="card reveal aspect-square w-full object-cover" />
        <div className="reveal">
          <h2 className="text-3xl font-semibold sm:text-4xl">{data.title}</h2>
          <p className="mt-4 text-muted">{data.subtitle}</p>
          <dl className="mt-8 flex gap-10">
            {data.items.map((item) => (
              <div key={item.title}><dt className="text-sm text-muted">{item.title}</dt><dd className="text-xl font-semibold">{item.meta}</dd></div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}
`,
  stats: () => `import type { SectionData } from '../../data/site'

export default function StatsSection({ data }: { data: SectionData }) {
  return (
    <section className="section">
      <div className="container-site">
        <h2 className="sr-only">{data.title}</h2>
        <dl className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {data.items.map((item) => (
            <div key={item.text} className="card reveal p-6 text-center">
              <dt className="text-sm text-muted">{item.text}</dt>
              <dd className="mt-2 text-3xl font-semibold text-primary">{item.title}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
`,
  team: () => `import type { SectionData } from '../../data/site'

export default function TeamSection({ data }: { data: SectionData }) {
  return (
    <section className="section">
      <div className="container-site">
        <h2 className="text-3xl font-semibold sm:text-4xl">{data.title}</h2>
        {data.subtitle && <p className="mt-3 text-muted">{data.subtitle}</p>}
        <ul className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-4">
          {data.items.map((item) => (
            <li key={item.title} className="card reveal p-6 text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-xl font-semibold text-primary" aria-hidden>
                {item.title.split(' ').map((w) => w[0]).join('')}
              </span>
              <p className="mt-4 font-semibold">{item.title}</p>
              <p className="text-sm text-muted">{item.meta}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
`,
  faq: () => `import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { SectionData } from '../../data/site'

export default function FaqSection({ data }: { data: SectionData }) {
  const [open, setOpen] = useState(0)
  return (
    <section className="section">
      <div className="container-site max-w-3xl">
        <h2 className="text-3xl font-semibold sm:text-4xl">{data.title}</h2>
        <div className="mt-8 divide-y divide-foreground/10">
          {data.items.map((item, i) => (
            <div key={item.title} className="py-4">
              <button type="button" className="flex w-full items-center justify-between gap-4 text-left font-medium" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
                {item.title}
                <ChevronDown className={\`transition \${open === i ? 'rotate-180' : ''}\`} aria-hidden />
              </button>
              {open === i && <p className="mt-3 text-muted">{item.text}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
`,
  contact: () => `import { useState, type FormEvent } from 'react'
import type { SectionData } from '../../data/site'

export default function ContactSection({ data }: { data: SectionData }) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sent, setSent] = useState(false)
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const next: Record<string, string> = {}
    if (!String(form.get('name') ?? '').trim()) next.name = 'Please enter your name.'
    if (!/^\\S+@\\S+\\.\\S+$/.test(String(form.get('email') ?? ''))) next.email = 'Please enter a valid email.'
    if (String(form.get('message') ?? '').trim().length < 10) next.message = 'Tell us a little more (10+ characters).'
    setErrors(next)
    // Demo behaviour: nothing is sent anywhere. Connect your own form endpoint here.
    if (!Object.keys(next).length) setSent(true)
  }
  return (
    <section className="section" id="contact">
      <div className="container-site grid gap-12 md:grid-cols-2">
        <div>
          <h2 className="text-3xl font-semibold sm:text-4xl">{data.title}</h2>
          <p className="mt-3 text-muted">{data.subtitle}</p>
          <dl className="mt-8 space-y-4">
            {data.items.map((item) => (
              <div key={item.title}><dt className="text-sm text-muted">{item.title}</dt><dd className="font-medium">{item.meta}</dd></div>
            ))}
          </dl>
        </div>
        {sent ? (
          <p className="card p-8 text-lg" role="status">Thank you — your message is ready to send. (Demo: connect a form service to deliver it.)</p>
        ) : (
          <form onSubmit={submit} noValidate className="card space-y-4 p-6">
            {(['name', 'email', 'message'] as const).map((field) => (
              <label key={field} className="block text-sm font-medium capitalize">
                {field}
                {field === 'message' ? (
                  <textarea name={field} rows={4} className="mt-1 w-full rounded-brand border border-foreground/15 bg-background p-3" aria-invalid={Boolean(errors[field])} />
                ) : (
                  <input name={field} type={field === 'email' ? 'email' : 'text'} className="mt-1 w-full rounded-brand border border-foreground/15 bg-background p-3" aria-invalid={Boolean(errors[field])} />
                )}
                {errors[field] && <span className="mt-1 block text-xs text-red-500">{errors[field]}</span>}
              </label>
            ))}
            <button type="submit" className="btn-primary w-full">Send message</button>
          </form>
        )}
      </div>
    </section>
  )
}
`,
  cta: () => `import { useState, type FormEvent } from 'react'
import type { SectionData } from '../../data/site'

export default function CtaSection({ data }: { data: SectionData }) {
  const [done, setDone] = useState(false)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    setDone(true)
  }
  return (
    <section className="section">
      <div className="container-site">
        <div className="card reveal bg-gradient-to-br from-primary/25 to-accent/10 p-10 text-center">
          <h2 className="text-3xl font-semibold">{data.title}</h2>
          {data.subtitle && <p className="mx-auto mt-3 max-w-xl text-muted">{data.subtitle}</p>}
          {done ? (
            <p className="mt-6 font-medium" role="status">You're on the list (demo — no email was sent).</p>
          ) : (
            <form onSubmit={submit} className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row">
              <label className="sr-only" htmlFor="cta-email">Email</label>
              <input id="cta-email" type="email" required placeholder="you@example.com" className="flex-1 rounded-brand border border-foreground/15 bg-background px-4 py-3" />
              <button type="submit" className="btn-primary">{data.items[0]?.title ?? 'Subscribe'}</button>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
`,
  steps: () => `import type { SectionData } from '../../data/site'

export default function StepsSection({ data }: { data: SectionData }) {
  return (
    <section className="section">
      <div className="container-site">
        <h2 className="text-3xl font-semibold sm:text-4xl">{data.title}</h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {data.items.map((item, i) => (
            <li key={item.title} className="card reveal p-6">
              <span className="text-4xl font-semibold text-primary/40">0{i + 1}</span>
              <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted">{item.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
`,
})

/** @param {string} type */
export const sectionComponent = (type) => `${pascal(type)}Section`

/** @param {SiteSpec} spec */
function navbar(spec) {
  const centered = spec.navigation.style === 'centered'
  return `import { useState } from 'react'
import { Menu, ShoppingBag, X } from 'lucide-react'
import { Link, useRoute } from '../router'
import { site } from '../data/site'
import { useCartCount } from '../lib/store'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const route = useRoute()
  const count = useCartCount()
  return (
    <header className="${spec.navigation.sticky ? 'sticky top-0' : 'relative'} z-40 border-b border-foreground/10 bg-background/85 backdrop-blur">
      <nav className="container-site flex h-16 items-center justify-between gap-6${centered ? ' md:grid md:grid-cols-[1fr_auto_1fr]' : ''}" aria-label="Main">
        <Link to="/" className="text-lg font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>{site.name}</Link>
        <ul className="hidden items-center gap-6 md:flex${centered ? ' justify-center' : ''}">
          {site.pages.map((page) => (
            <li key={page.path}>
              <Link to={page.path} className={\`text-sm transition hover:text-primary \${route === page.path ? 'text-primary' : 'text-muted'}\`} aria-current={route === page.path ? 'page' : undefined}>{page.name}</Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-end gap-3">
          <span className="relative" aria-label={\`\${count} items in bag\`}>
            <ShoppingBag size={20} aria-hidden />
            {count > 0 && <span className="absolute -right-2 -top-2 rounded-full bg-primary px-1.5 text-[10px] text-on-primary">{count}</span>}
          </span>
          <Link to="${spec.pages.find((p) => p.sections.some((s) => s.type === 'contact'))?.path ?? spec.pages[spec.pages.length - 1].path}" className="btn-primary hidden py-2 md:inline-flex">${spec.navigation.cta}</Link>
          <button type="button" className="md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu" aria-expanded={open}>{open ? <X /> : <Menu />}</button>
        </div>
      </nav>
      {open && (
        <ul className="container-site space-y-1 pb-4 md:hidden">
          {site.pages.map((page) => (
            <li key={page.path}><Link to={page.path} onClick={() => setOpen(false)} className="block rounded-brand px-3 py-2 hover:bg-surface">{page.name}</Link></li>
          ))}
        </ul>
      )}
    </header>
  )
}
`
}

/** @param {SiteSpec} spec */
function siteData(spec) {
  const data = {
    name: spec.name,
    pages: spec.pages.map((p) => ({ name: p.name, path: p.path })),
    sections: Object.fromEntries(spec.pages.flatMap((p) => p.sections.map((s) => [s.id, { title: s.title, subtitle: s.subtitle ?? '', items: s.items ?? [] }]))),
  }
  return `export type SectionItem = { title: string; text?: string; meta?: string; price?: string; tag?: string }
export type SectionData = { title: string; subtitle: string; items: SectionItem[] }

export const site: { name: string; pages: { name: string; path: string }[]; sections: Record<string, SectionData> } = ${js(data)}
`
}

/** @param {import('./spec.js').Page} page */
function pageSource(page) {
  const types = [...new Set(page.sections.map((s) => s.type))]
  return `${types.map((t) => `import ${sectionComponent(t)} from '../components/sections/${sectionComponent(t)}'`).join('\n')}
import { site } from '../data/site'

export default function ${pascal(page.name)}Page() {
  return (
    <>
${page.sections.map((s) => `      <${sectionComponent(s.type)} data={site.sections[${JSON.stringify(s.id)}]} />`).join('\n')}
    </>
  )
}
`
}

/** @param {SiteSpec} spec */
function appSource(spec) {
  return `import { useRoute } from './router'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
${spec.pages.map((p) => `import ${pascal(p.name)}Page from './pages/${pascal(p.name)}Page'`).join('\n')}

const PAGES: Record<string, () => JSX.Element> = {
${spec.pages.map((p) => `  ${JSON.stringify(p.path)}: ${pascal(p.name)}Page,`).join('\n')}
}

export default function App() {
  const route = useRoute()
  const Page = PAGES[route] ?? PAGES['/']
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>
      <Navbar />
      <main id="main" className="flex-1" key={route}>
        <Page />
      </main>
      <Footer />
    </div>
  )
}
`
}

const ROUTER = `import { useEffect, useState, type AnchorHTMLAttributes } from 'react'

/** Tiny hash router: works in static hosting, previews and file:// without server rewrites. */
function current() {
  if (typeof window === 'undefined') return '/'
  return window.location.hash.replace(/^#/, '') || '/'
}

export function navigate(to: string) {
  window.location.hash = to
  window.scrollTo({ top: 0 })
}

export function useRoute() {
  const [route, setRoute] = useState('/')
  useEffect(() => {
    const update = () => setRoute(current())
    update()
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  return route
}

export function Link({ to, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  return (
    <a
      href={\`#\${to}\`}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) {
          event.preventDefault()
          navigate(to)
        }
      }}
      {...rest}
    />
  )
}
`

const STORE = `import { useSyncExternalStore } from 'react'

/** Demo cart kept in memory; replace with your commerce backend. */
let items: string[] = []
const listeners = new Set<() => void>()

export function addToCart(title: string) {
  items = [...items, title]
  listeners.forEach((listener) => listener())
}

export function useCartCount() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => items.length,
    () => 0,
  )
}
`

/** @param {SiteSpec} spec */
function footer(spec) {
  return `import { Link } from '../router'
import { site } from '../data/site'

export default function Footer() {
  return (
    <footer className="border-t border-foreground/10 py-10 text-sm text-muted">
      <div className="container-site flex flex-col justify-between gap-6 md:flex-row">
        <p>© {new Date().getFullYear()} {site.name}. ${spec.purpose.length < 90 ? spec.purpose.replace(/[{}<>`]/g, '') : 'All rights reserved.'}</p>
        <ul className="flex flex-wrap gap-4">
          {site.pages.map((page) => <li key={page.path}><Link to={page.path} className="hover:text-primary">{page.name}</Link></li>)}
        </ul>
      </div>
    </footer>
  )
}
`
}

/** @param {SiteSpec} spec */
function readme(spec) {
  const next = spec.framework === 'nextjs'
  return `# ${spec.name}

Generated with Galaxy Studio (${FRAMEWORKS[spec.framework]}, Tailwind CSS).

${spec.purpose}

## Requirements
- Node.js 20 or newer

## Run locally
\`\`\`bash
npm install
npm run dev
\`\`\`
Then open ${next ? 'http://localhost:3000' : 'http://localhost:5173'}.

## Production build
\`\`\`bash
npm run build
${next ? 'npm start' : 'npm run preview'}
\`\`\`

## Project structure
- \`src/App.tsx\` – layout and page switching (hash routes such as \`#/about\`)
- \`src/pages/\` – one component per page
- \`src/components/sections/\` – reusable page sections
- \`src/data/site.ts\` – all text content in one place
- \`src/index.css\` – design tokens (colours, fonts, radius, spacing) as CSS variables
- \`src/assets/\` – images bundled with the site
${next ? '- `src/app/` – Next.js App Router entry (layout + page)\n' : ''}
## Notes
- Forms use demo behaviour (nothing is sent). Connect your own form endpoint in \`ContactSection.tsx\`.
- No API keys or secrets are needed to run this project.
`
}

/**
 * @param {SiteSpec} spec
 * @param {{ assets?: ProjectFile[] }} [options]
 * @returns {ProjectFile[]}
 */
export function generateProject(spec, options = {}) {
  const next = spec.framework === 'nextjs'
  const fonts = googleFontsHref([spec.typography.heading, spec.typography.body])
  const types = [...new Set(spec.pages.flatMap((p) => p.sections.map((s) => s.type)))]
  const pkgName = slug(spec.name)
  /** @type {ProjectFile[]} */
  const files = []
  const add = (/** @type {string} */ path, /** @type {string} */ content) => files.push({ path, content })

  const devDeps = { typescript: DEP_VERSIONS.typescript, tailwindcss: DEP_VERSIONS.tailwindcss, postcss: DEP_VERSIONS.postcss, autoprefixer: DEP_VERSIONS.autoprefixer, '@types/react': DEP_VERSIONS['@types/react'], '@types/react-dom': DEP_VERSIONS['@types/react-dom'] }
  add('package.json', `${js({
    name: pkgName, private: true, version: '1.0.0', type: next ? undefined : 'module',
    scripts: next ? { dev: 'next dev', build: 'next build', start: 'next start' } : { dev: 'vite', build: 'tsc --noEmit && vite build', preview: 'vite preview' },
    dependencies: { react: DEP_VERSIONS.react, 'react-dom': DEP_VERSIONS['react-dom'], 'lucide-react': DEP_VERSIONS['lucide-react'], ...(next ? { next: DEP_VERSIONS.next } : {}) },
    devDependencies: next ? { ...devDeps, '@types/node': '^22.0.0' } : { ...devDeps, vite: DEP_VERSIONS.vite, '@vitejs/plugin-react': DEP_VERSIONS['@vitejs/plugin-react'] },
  })}\n`)
  add('.gitignore', 'node_modules\ndist\n.next\n.env\n.env.*\n!.env.example\n')
  add('README.md', readme(spec))
  add('postcss.config.js', `${next ? 'module.exports =' : 'export default'} { plugins: { tailwindcss: {}, autoprefixer: {} } }\n`)
  add('tailwind.config.js', `/** @type {import('tailwindcss').Config} */\n${next ? 'module.exports =' : 'export default'} ${js({ content: next ? ['./src/**/*.{ts,tsx}'] : ['./index.html', './src/**/*.{ts,tsx}'], theme: TAILWIND_THEME, plugins: [] })}\n`)
  if (next) {
    add('next.config.mjs', "/** @type {import('next').NextConfig} */\nexport default { reactStrictMode: true }\n")
    add('next-env.d.ts', '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n')
    add('tsconfig.json', `${js({ compilerOptions: { target: 'ES2020', lib: ['dom', 'dom.iterable', 'esnext'], allowJs: false, skipLibCheck: true, strict: true, noEmit: true, esModuleInterop: true, module: 'esnext', moduleResolution: 'bundler', resolveJsonModule: true, isolatedModules: true, jsx: 'preserve', incremental: true, plugins: [{ name: 'next' }] }, include: ['next-env.d.ts', 'src/**/*.ts', 'src/**/*.tsx', 'src/**/*.d.ts'], exclude: ['node_modules'] })}\n`)
    add('src/app/layout.tsx', `import type { ReactNode } from 'react'
import '../index.css'

export const metadata = { title: ${JSON.stringify(spec.name)}, description: ${JSON.stringify(spec.purpose)} }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="${fonts}" />
      </head>
      <body>{children}</body>
    </html>
  )
}
`)
    add('src/app/page.tsx', `'use client'

import App from '../App'

export default function Page() {
  return <App />
}
`)
    add('src/assets.d.ts', "declare module '*.svg' {\n  const src: string | { src: string }\n  export default src\n}\n")
  } else {
    add('index.html', `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${spec.purpose.replace(/"/g, '&quot;')}" />
    <title>${spec.name.replace(/</g, '&lt;')}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="stylesheet" href="${fonts}" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`)
    add('vite.config.ts', "import { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react'\n\nexport default defineConfig({ plugins: [react()] })\n")
    add('tsconfig.json', `${js({ compilerOptions: { target: 'ES2020', useDefineForClassFields: true, lib: ['ES2020', 'DOM', 'DOM.Iterable'], module: 'ESNext', skipLibCheck: true, moduleResolution: 'bundler', allowImportingTsExtensions: false, resolveJsonModule: true, isolatedModules: true, noEmit: true, jsx: 'react-jsx', strict: true, noUnusedLocals: true, noUnusedParameters: true }, include: ['src'] })}\n`)
    add('src/vite-env.d.ts', '/// <reference types="vite/client" />\n')
    add('src/main.tsx', `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
`)
  }
  add('src/index.css', indexCss(spec))
  add('src/router.tsx', ROUTER)
  add('src/lib/store.ts', STORE)
  add('src/data/site.ts', siteData(spec))
  add('src/App.tsx', appSource(spec).replace('() => JSX.Element', next ? '() => React.JSX.Element' : '() => React.JSX.Element'))
  add('src/components/Navbar.tsx', navbar(spec))
  add('src/components/Footer.tsx', footer(spec))
  for (const t of types) add(`src/components/sections/${sectionComponent(t)}.tsx`, (SECTION_SOURCES[t] ?? SECTION_SOURCES.features)(spec))
  for (const p of spec.pages) add(`src/pages/${pascal(p.name)}Page.tsx`, pageSource(p))
  for (let i = 0; i < 4; i += 1) add(`src/assets/art-${i}.svg`, artworkSvg(spec, i))
  for (const asset of options.assets ?? []) if (!files.some((f) => f.path === asset.path)) files.push(asset)
  // App.tsx references React.JSX; import the namespace type explicitly.
  const app = files.find((f) => f.path === 'src/App.tsx')
  if (app) app.content = `import type React from 'react'\n${app.content}`
  return files
}

/** Next.js serves imported SVGs as objects; normalise in components via this helper when needed. */
export const ICON_NAMES = ICONS
