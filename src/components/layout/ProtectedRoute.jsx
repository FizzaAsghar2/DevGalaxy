import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useSession } from '../../auth/AuthProvider'
import { LoadingState } from '../ui/States'

export default function ProtectedRoute({ children }) {
  const { isLoaded, isSignedIn, signIn, mode } = useSession()
  const location = useLocation()
  const from = `${location.pathname}${location.search}`

  useEffect(() => {
    if (isLoaded && !isSignedIn && mode === 'clerk') signIn(from)
  }, [from, isLoaded, isSignedIn, mode, signIn])

  if (!isLoaded) return <LoadingState label="Checking your session…" />
  if (!isSignedIn) return <Navigate to="/" replace state={{ from }} />
  return children
}
