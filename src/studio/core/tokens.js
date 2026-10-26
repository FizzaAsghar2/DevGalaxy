// @ts-check
/**
 * Design tokens shared by the planner, the code generator, the preview compiler
 * and the visual design controls. Generated projects keep every token as a CSS
 * custom property in `src/index.css`, so design edits never rewrite components.
 */

/** @typedef {{ primary: string, accent: string, background: string, surface: string, text: string, muted: string }} Palette */

export const COLOR_WORDS = /** @type {Record<string, string>} */ ({
  black: '#0b0b0d', white: '#ffffff', gold: '#d4af37', golden: '#d4af37', silver: '#c0c4cc', navy: '#14213d',
  blue: '#2563eb', sky: '#38bdf8', teal: '#0d9488', cyan: '#06b6d4', green: '#16a34a', emerald: '#10b981',
  olive: '#6b7f3a', red: '#dc2626', crimson: '#b91c1c', pink: '#ec4899', rose: '#f43f5e', purple: '#7c3aed',
  violet: '#8b5cf6', lavender: '#b8a5f2', orange: '#f97316', coral: '#ff7f50', yellow: '#facc15', beige: '#e8dcc4',
  cream: '#f7f1e3', brown: '#7c4a2d', gray: '#6b7280', grey: '#6b7280', charcoal: '#1f2328', mint: '#5eead4',
})

export const FONT_STACKS = /** @type {Record<string, string>} */ ({
  'Playfair Display': "'Playfair Display', Georgia, 'Times New Roman', serif",
  'Cormorant Garamond': "'Cormorant Garamond', Georgia, serif",
  'DM Serif Display': "'DM Serif Display', Georgia, serif",
  Inter: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
  'Space Grotesk': "'Space Grotesk', Inter, ui-sans-serif, system-ui, sans-serif",
  Poppins: "Poppins, ui-sans-serif, system-ui, sans-serif",
  'DM Sans': "'DM Sans', ui-sans-serif, system-ui, sans-serif",
  Manrope: "Manrope, ui-sans-serif, system-ui, sans-serif",
  'Bricolage Grotesque': "'Bricolage Grotesque', 'Space Grotesk', ui-sans-serif, sans-serif",
  Lora: "Lora, Georgia, serif",
})

export const FONT_NAMES = Object.keys(FONT_STACKS)
export const RADII = /** @type {const} */ ({ none: '0px', sm: '6px', md: '12px', lg: '20px', full: '999px' })
export const DENSITY = /** @type {const} */ ({ compact: '4rem', comfortable: '6rem', spacious: '8rem' })

/** @param {unknown} value */
export function isHex(value) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
}

/** @param {string} hex @returns {[number, number, number]} */
export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** @param {number[]} rgb */
export function rgbToHex(rgb) {
  return `#${rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`
}

/** Relative luminance (WCAG). @param {string} hex */
export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** @param {string} a @param {string} b */
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** @param {string} a @param {string} b @param {number} t */
export function mix(a, b, t) {
  const x = hexToRgb(a)
  const y = hexToRgb(b)
  return rgbToHex(x.map((v, i) => v + (y[i] - v) * t))
}

/** Shifts the hue of a colour by `deg` degrees. @param {string} hex @param {number} deg */
export function shiftHue(hex, deg) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  let h = 0
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  h = (((h * 60 + deg) % 360) + 360) % 360
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r1, g1, b1] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return rgbToHex([(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255])
}

/** Readable text colour for a background. @param {string} bg */
export function readableOn(bg) {
  return contrast(bg, '#ffffff') >= contrast(bg, '#111111') ? '#ffffff' : '#111111'
}

/**
 * Builds a complete, accessible palette around a background and a primary colour.
 * @param {{ primary: string, background: string, accent?: string }} input
 * @returns {Palette}
 */
export function buildPalette({ primary, background, accent }) {
  const dark = luminance(background) < 0.2
  const text = dark ? '#f5f5f4' : '#18181b'
  const surface = dark ? mix(background, '#ffffff', 0.06) : mix(background, '#000000', 0.035)
  const muted = mix(text, background, 0.38)
  let p = primary
  if (contrast(p, background) < 2.2) p = dark ? mix(p, '#ffffff', 0.35) : mix(p, '#000000', 0.35)
  return { primary: p, accent: accent ?? mix(shiftHue(p, -18), text, 0.25), background, surface, text, muted }
}

/** Tailwind theme used by every generated project and by the preview compiler. */
export const TAILWIND_THEME = {
  extend: {
    colors: {
      primary: 'rgb(var(--color-primary) / <alpha-value>)',
      accent: 'rgb(var(--color-accent) / <alpha-value>)',
      background: 'rgb(var(--color-background) / <alpha-value>)',
      surface: 'rgb(var(--color-surface) / <alpha-value>)',
      foreground: 'rgb(var(--color-text) / <alpha-value>)',
      muted: 'rgb(var(--color-muted) / <alpha-value>)',
      'on-primary': 'rgb(var(--color-on-primary) / <alpha-value>)',
    },
    fontFamily: { heading: ['var(--font-heading)'], body: ['var(--font-body)'] },
    borderRadius: { brand: 'var(--radius)' },
  },
}

const TOKENS_START = '/* galaxy-studio:tokens:start */'
const TOKENS_END = '/* galaxy-studio:tokens:end */'

/**
 * @typedef {{ palette: Palette, headingFont: string, bodyFont: string, radius: keyof typeof RADII,
 *   density: keyof typeof DENSITY, animationSpeed: number, maxWidth: string }} DesignTokens
 */

/** @param {DesignTokens} t */
export function tokensToCss(t) {
  const rgb = (/** @type {string} */ hex) => hexToRgb(hex).join(' ')
  const p = t.palette
  return [
    TOKENS_START,
    ':root {',
    `  --color-primary: ${rgb(p.primary)};`,
    `  --color-accent: ${rgb(p.accent)};`,
    `  --color-background: ${rgb(p.background)};`,
    `  --color-surface: ${rgb(p.surface)};`,
    `  --color-text: ${rgb(p.text)};`,
    `  --color-muted: ${rgb(p.muted)};`,
    `  --color-on-primary: ${rgb(readableOn(p.primary))};`,
    `  --font-heading: ${FONT_STACKS[t.headingFont] ?? FONT_STACKS.Inter};`,
    `  --font-body: ${FONT_STACKS[t.bodyFont] ?? FONT_STACKS.Inter};`,
    `  --radius: ${RADII[t.radius] ?? RADII.md};`,
    `  --section-y: ${DENSITY[t.density] ?? DENSITY.comfortable};`,
    `  --anim-speed: ${Math.max(0.25, Math.min(3, Number(t.animationSpeed) || 1))};`,
    `  --max-w: ${t.maxWidth};`,
    '}',
    TOKENS_END,
  ].join('\n')
}

/** Replaces the token block of an existing stylesheet, keeping everything else. @param {string} css @param {DesignTokens} tokens */
export function replaceTokens(css, tokens) {
  const start = css.indexOf(TOKENS_START)
  const end = css.indexOf(TOKENS_END)
  if (start === -1 || end === -1) return `${tokensToCss(tokens)}\n\n${css}`
  return css.slice(0, start) + tokensToCss(tokens) + css.slice(end + TOKENS_END.length)
}

/** Reads design tokens back out of a stylesheet (used by the design controls). @param {string} css @returns {Partial<DesignTokens> | null} */
export function readTokens(css) {
  const start = css.indexOf(TOKENS_START)
  if (start === -1) return null
  const block = css.slice(start, css.indexOf(TOKENS_END))
  /** @param {string} name */
  const v = (name) => new RegExp(`--${name}:\\s*([^;]+);`).exec(block)?.[1]?.trim()
  /** @param {string} name */
  const color = (name) => {
    const parts = (v(`color-${name}`) ?? '').split(/\s+/).map(Number)
    return parts.length === 3 && parts.every((n) => Number.isFinite(n)) ? rgbToHex(parts) : '#000000'
  }
  /** @param {string | undefined} stack */
  const font = (stack) => FONT_NAMES.find((name) => FONT_STACKS[name] === stack) ?? 'Inter'
  const radius = /** @type {keyof typeof RADII} */ (Object.keys(RADII).find((k) => RADII[/** @type {keyof typeof RADII} */ (k)] === v('radius')) ?? 'md')
  const density = /** @type {keyof typeof DENSITY} */ (Object.keys(DENSITY).find((k) => DENSITY[/** @type {keyof typeof DENSITY} */ (k)] === v('section-y')) ?? 'comfortable')
  return {
    palette: { primary: color('primary'), accent: color('accent'), background: color('background'), surface: color('surface'), text: color('text'), muted: color('muted') },
    headingFont: font(v('font-heading')),
    bodyFont: font(v('font-body')),
    radius,
    density,
    animationSpeed: Number(v('anim-speed')) || 1,
    maxWidth: v('max-w') ?? '1200px',
  }
}

/** Google Fonts stylesheet URL for the chosen fonts. @param {string[]} fonts */
export function googleFontsHref(fonts) {
  const families = [...new Set(fonts)].filter((f) => FONT_STACKS[f]).map((f) => `family=${f.replace(/ /g, '+')}:wght@400;500;600;700`)
  return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`
}
