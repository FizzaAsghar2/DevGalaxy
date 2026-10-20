import { useCallback, useEffect, useState } from 'react'
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
