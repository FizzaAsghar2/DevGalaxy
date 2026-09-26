import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from '../auth/AuthProvider'
import { createGalaxyService } from '../services/galaxyService'

export function useGalaxyService() {
  const { user, getToken, usesSupabase } = useSession()
  return useMemo(
    () => createGalaxyService({ userId: user?.id ?? 'anonymous', getToken, useSupabase: usesSupabase }),
    [getToken, user?.id, usesSupabase],
  )
}

export function useGalaxies() {
  const service = useGalaxyService()
  const [galaxies, setGalaxies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setGalaxies(await service.list())
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [service])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { galaxies, loading, error, refresh, service }
}
