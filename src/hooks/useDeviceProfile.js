import { useEffect, useState } from 'react'

function matches(query) {
  return typeof window !== 'undefined' && window.matchMedia(query).matches
}

function readProfile() {
  if (typeof window === 'undefined') {
    return { tier: 'high', isMobile: false, isTablet: false, reducedMotion: false, coarsePointer: false }
  }

  const width = window.innerWidth
  const isMobile = width < 768
  const isTablet = width >= 768 && width < 1180
  const reducedMotion = matches('(prefers-reduced-motion: reduce)')
  const cores = navigator.hardwareConcurrency ?? 4
  const memory = navigator.deviceMemory ?? 4

  let tier = 'high'
  if (isTablet || cores <= 4 || memory <= 4) tier = 'medium'
  if (isMobile || cores <= 2 || memory <= 2 || reducedMotion) tier = 'low'

  return { tier, isMobile, isTablet, reducedMotion, coarsePointer: matches('(pointer: coarse)') }
}

/**
 * Drives every performance decision in the app: particle counts, dpr, whether
 * the WebGL galaxy renders at all, and how much motion we allow.
 */
export function useDeviceProfile() {
  const [profile, setProfile] = useState(readProfile)

  useEffect(() => {
    const update = () => setProfile(readProfile())
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    window.addEventListener('resize', update, { passive: true })
    motionQuery.addEventListener('change', update)
    return () => {
      window.removeEventListener('resize', update)
      motionQuery.removeEventListener('change', update)
    }
  }, [])

  return profile
}

export const QUALITY = {
  high: { stars: 2600, dpr: [1, 2], particles: true, bloomish: true, orbitDetail: 48 },
  medium: { stars: 1400, dpr: [1, 1.5], particles: true, bloomish: false, orbitDetail: 32 },
  low: { stars: 700, dpr: [1, 1.25], particles: false, bloomish: false, orbitDetail: 20 },
}

export function qualityFor(tier) {
  return QUALITY[tier] ?? QUALITY.medium
}
