import react from '@vitejs/plugin-react'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'

/**
 * Serves the Vercel-style functions in /api during `vite dev` and `vite preview`
 * so the same server-side checks run locally. Server-only env vars are loaded
 * into process.env here and never exposed to the client bundle.
 */
function localApi(mode) {
  const env = loadEnv(mode, process.cwd(), '')
  for (const [key, value] of Object.entries(env)) if (!(key in process.env)) process.env[key] = value

  const middleware = (load) => async (req, res, next) => {
    const url = new URL(req.url, 'http://localhost')
    if (!url.pathname.startsWith('/api/')) return next()
    const name = url.pathname.slice(5).replace(/\/$/, '')
    const file = resolve('api', `${name}.js`)
    if (!/^[a-z-]+$/.test(name) || !existsSync(file)) return next()
    res.status = (code) => ((res.statusCode = code), res)
    res.json = (payload) => {
      if (!res.getHeader('content-type')) res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify(payload))
      return res
    }
    req.query = Object.fromEntries(url.searchParams)
    try {
      const mod = await load(file)
      await mod.default(req, res)
    } catch (error) {
      console.error(error)
      if (!res.headersSent) res.status(500).json({ error: 'Local API error' })
    }
  }

  return {
    name: 'devgalaxy-local-api',
    configureServer(server) {
      server.middlewares.use(middleware((file) => server.ssrLoadModule(file)))
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware((file) => import(pathToFileURL(file).href)))
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), localApi(mode)],
}))
