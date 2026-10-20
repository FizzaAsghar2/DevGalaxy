// @ts-check
import { googleFontsHref } from './core/tokens.js'

/**
 * Builds the HTML document for the sandboxed preview iframe. The iframe uses
 * sandbox="allow-scripts allow-forms" (no allow-same-origin), so the generated
 * site runs in an opaque origin: it cannot read Galaxy Studio's cookies, storage
 * or DOM. The CSP additionally blocks all network requests except fonts.
 * @param {{ js: string, css: string, fonts: string[], route?: string }} input
 */
export function previewDocument({ js, css, fonts, route = '/' }) {
  const csp = [
    "default-src 'none'", "script-src 'unsafe-inline'", "style-src 'unsafe-inline' https://fonts.googleapis.com", 'font-src https://fonts.gstatic.com data:',
    'img-src data: blob:', "connect-src 'none'", "form-action 'none'", "frame-src 'none'", "base-uri 'none'",
  ].join('; ')
  const safe = (/** @type {string} */ s) => s.replace(/<\/(script|style)/gi, '<\\/$1')
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="stylesheet" href="${googleFontsHref(fonts)}" />
<style>${safe(css)}</style></head><body><div id="root"></div>
<script>
location.hash = ${JSON.stringify(route)};
window.addEventListener('error', function (e) { parent.postMessage({ type: 'gs:error', message: String(e.message) }, '*') });
window.addEventListener('hashchange', function () { parent.postMessage({ type: 'gs:route', route: location.hash.slice(1) || '/' }, '*') });
window.addEventListener('message', function (e) { if (e.data && e.data.type === 'gs:navigate') location.hash = e.data.route });
</script>
<script>${safe(js)}</script></body></html>`
}
