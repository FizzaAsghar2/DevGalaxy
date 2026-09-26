const env = import.meta.env

export const clerkPublishableKey = env.VITE_CLERK_PUBLISHABLE_KEY ?? ''
export const supabaseUrl = env.VITE_SUPABASE_URL ?? ''
export const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY ?? ''

export const isClerkConfigured = clerkPublishableKey.startsWith('pk_')
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

/**
 * Demo mode keeps the whole product explorable without any third-party keys:
 * a local session stands in for Clerk and localStorage stands in for Supabase.
 */
export const isDemoMode = !isClerkConfigured || !isSupabaseConfigured
