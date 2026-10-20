import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Info } from 'lucide-react'
import Navbar from './Navbar'
import { isDemoMode } from '../../lib/config'

export function DemoBanner() {
  if (!isDemoMode) return null
  return (
    <div className="border-b border-amber-300/15 bg-amber-300/[0.06] px-4 py-2 text-center text-[12px] text-amber-200/90">
      <Info className="mr-1.5 inline h-3.5 w-3.5 align-[-2px]" />
      Demo mode — sign-in is simulated and My Workspace is saved in this browser only. Add Clerk, Supabase and AI
      keys in <code className="font-mono">.env</code> to connect real accounts, cloud saves and AI generation.
    </div>
  )
}

/** Scrolls to `#section` targets after navigation, waiting for lazily loaded pages to render them. */
function useHashScroll() {
  const { pathname, hash, key } = useLocation()
  useEffect(() => {
    if (!hash) return undefined
    let frame
    let tries = 0
    const attempt = () => {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)))
      if (target) {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
      } else if (tries++ < 60) frame = requestAnimationFrame(attempt)
    }
    attempt()
    return () => cancelAnimationFrame(frame)
  }, [pathname, hash, key])
}

export default function AppLayout() {
  useHashScroll()
  const { pathname } = useLocation()
  return (
    <div className="flex min-h-full flex-col">
      <DemoBanner />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      {!/^\/studio\/(?!new)/.test(pathname) && <footer className="border-t border-white/5 px-4 py-6 text-center text-xs text-slate-500">
        DevGalaxy · Galaxy Studio — plan, design and build websites with AI.
      </footer>}
    </div>
  )
}
