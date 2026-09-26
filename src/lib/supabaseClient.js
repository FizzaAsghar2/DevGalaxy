import { createClient } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from './config'

let client = null

/**
 * Supabase client that forwards the Clerk session JWT on every request, so
 * Row Level Security can authorise against `auth.jwt() ->> 'sub'`.
 * `getToken` is supplied by Clerk and refreshed automatically by the SDK.
 */
export function getSupabaseClient(getToken) {
  if (!isSupabaseConfigured) return null
  if (client) return client

  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    accessToken: getToken ? async () => (await getToken()) ?? null : undefined,
  })
  return client
}
