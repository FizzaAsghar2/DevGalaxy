import { authenticate, isManaged, requireAccount } from './_lib/account.js'
import { clientIp, rateLimited, send } from './_lib/http.js'
import { buildZip, collectSourceFiles } from './_lib/sourceZip.js'

/**
 * Settings → Export → Download Source Code (.zip).
 * Managed mode: only the verified owner (database role `admin`) may download.
 * Demo deployments have no accounts, so any visitor of that deployment can.
 * The archive never contains .env files, keys, .git, node_modules or build output.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return send(res, 405, { error: 'Method not allowed' })
  }
  let key
  if (isManaged()) {
    const account = await requireAccount(req, res).catch((error) => {
      console.error('export auth failed', error)
      send(res, 500, { error: 'Could not verify your account.' })
      return null
    })
    if (!account) return undefined
    if (account.profile.role !== 'admin') return send(res, 403, { error: 'Only the workspace owner can download the source code.', code: 'forbidden' })
    key = account.profile.id
  } else {
    const auth = await authenticate(req)
    if (!auth) return send(res, 401, { error: 'Sign in to download the source code.' })
    key = `${auth.userId}:${clientIp(req)}`
  }
  if (rateLimited(`export:${key}`, 4)) return send(res, 429, { error: 'Too many downloads. Try again in a minute.' })

  try {
    const files = collectSourceFiles()
    if (!files.some((f) => f.path === 'package.json')) return send(res, 500, { error: 'Source files are not available on this deployment.' })
    const zip = buildZip(files)
    const stamp = new Date().toISOString().slice(0, 10)
    res.statusCode = 200
    res.setHeader('content-type', 'application/zip')
    res.setHeader('content-disposition', `attachment; filename="devgalaxy-source-${stamp}.zip"`)
    res.setHeader('cache-control', 'no-store')
    res.setHeader('x-file-count', String(files.length))
    res.end(zip)
    return undefined
  } catch (error) {
    console.error('export failed', error)
    return send(res, 500, { error: 'Could not build the source archive.' })
  }
}
