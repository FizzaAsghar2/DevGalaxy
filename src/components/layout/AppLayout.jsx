import { Outlet } from 'react-router-dom'
import { Info } from 'lucide-react'
import Navbar from './Navbar'
import { isDemoMode } from '../../lib/config'

export function DemoBanner() {
  if (!isDemoMode) return null
  return (
    <div className="border-b border-amber-300/15 bg-amber-300/[0.06] px-4 py-2 text-center text-[12px] text-amber-200/90">
      <Info className="mr-1.5 inline h-3.5 w-3.5 align-[-2px]" />
      Demo mode — add Clerk, Supabase and AI keys in <code className="font-mono">.env</code> to enable real accounts,
      cloud saves and AI generation.
    </div>
  )
}

export default function AppLayout() {
  return (
    <div className="flex min-h-full flex-col">
      <DemoBanner />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-white/5 px-4 py-6 text-center text-xs text-slate-500">
        DevGalaxy — see your app before you build it.
      </footer>
    </div>
  )
}
