import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ClerkProvider, useAuth, useClerk, useUser } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import { clerkPublishableKey, isClerkConfigured, isSupabaseConfigured } from '../lib/config'

const AuthContext = createContext(null)
const DEMO_USER_KEY = 'devgalaxy:demo-user'

/**
 * One auth surface for the whole app. Backed by Clerk when a publishable key is
 * present, otherwise by a clearly-labelled local demo session so the product can
 * be explored (and demoed) before credentials exist.
 */
export function useSession() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useSession must be used inside <AuthProvider>')
  return context
}

function ClerkBridge({ children }) {
  const { isLoaded, isSignedIn, user } = useUser()
  const { getToken } = useAuth()
  const clerk = useClerk()

  const value = useMemo(
    () => ({
      mode: 'clerk',
      isLoaded,
      isSignedIn: Boolean(isSignedIn),
      user: user
        ? {
            id: user.id,
            name: user.fullName ?? user.firstName ?? user.username ?? 'Explorer',
            email: user.primaryEmailAddress?.emailAddress ?? '',
            imageUrl: user.imageUrl ?? '',
          }
        : null,
      getToken: () => getToken(),
      usesSupabase: isSupabaseConfigured,
      signIn: (redirectUrl) => clerk.openSignIn({ afterSignInUrl: redirectUrl ?? '/dashboard' }),
      signUp: (redirectUrl) => clerk.openSignUp({ afterSignUpUrl: redirectUrl ?? '/dashboard' }),
      signOut: () => clerk.signOut({ redirectUrl: '/' }),
      openProfile: () => clerk.openUserProfile(),
    }),
    [clerk, getToken, isLoaded, isSignedIn, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function DemoAuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    try {
      const stored = localStorage.getItem(DEMO_USER_KEY)
      if (stored) setUser(JSON.parse(stored))
    } catch {
      setUser(null)
    }
    setIsLoaded(true)
  }, [])

  const signIn = useCallback(
    (redirectUrl) => {
      const demoUser = { id: 'demo-user', name: 'Demo Explorer', email: 'demo@devgalaxy.app', imageUrl: '' }
      localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser))
      setUser(demoUser)
      navigate(redirectUrl ?? '/dashboard')
    },
    [navigate],
  )

  const signOut = useCallback(() => {
    localStorage.removeItem(DEMO_USER_KEY)
    setUser(null)
    navigate('/')
  }, [navigate])

  const value = useMemo(
    () => ({
      mode: 'demo',
      isLoaded,
      isSignedIn: Boolean(user),
      user,
      getToken: async () => null,
      usesSupabase: false,
      signIn,
      signUp: signIn,
      signOut,
      openProfile: () => {},
    }),
    [isLoaded, signIn, signOut, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function AuthProvider({ children }) {
  if (!isClerkConfigured) return <DemoAuthProvider>{children}</DemoAuthProvider>

  return (
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      appearance={{
        variables: {
          colorPrimary: '#8b5cf6',
          colorBackground: '#0b1026',
          colorText: '#e2e8f0',
          colorInputBackground: '#111936',
          borderRadius: '0.75rem',
        },
      }}
    >
      <ClerkBridge>{children}</ClerkBridge>
    </ClerkProvider>
  )
}
