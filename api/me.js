import { isManaged, requireAccount, summariseAccount } from './_lib/account.js'
import { send } from './_lib/http.js'

/** Returns the caller's server-verified role, plan, usage and entitlements. */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return send(res, 405, { error: 'Method not allowed' })
  }
  if (!isManaged()) return send(res, 200, { mode: 'unmanaged' })
  try {
    const account = await requireAccount(req, res)
    if (!account) return undefined
    return send(res, 200, summariseAccount(account))
  } catch (error) {
    console.error('account lookup failed', error)
    return send(res, 500, { error: 'Could not load your account.' })
  }
}
