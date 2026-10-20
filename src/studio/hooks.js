import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { useSession } from '../auth/AuthProvider'
import { getStudioStatus } from './api'

/** Studio data is scoped to the signed-in user; signed-out visitors use a local guest scope. */
export function useStudioUser() {
  const { user, getToken, isSignedIn } = useSession()
  return { userId: user?.id ?? 'guest', getToken, isSignedIn }
}

/** Provider status from the server: AI connected or Offline (Demo). */
export function useStudioStatus() {
  const { getToken } = useSession()
  const [status, setStatus] = useState(null)
  const refresh = useCallback(() => getStudioStatus(getToken).then(setStatus), [getToken])
  useEffect(() => {
    refresh()
  }, [refresh])
  return { status, refresh }
}

/** Tracks a CSS media query so only one responsive layout is mounted at a time. */
export function useMediaQuery(query) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}
