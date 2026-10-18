import { Cloud, HardDrive } from 'lucide-react'
import { isDemoMode } from '../../lib/config'

/** Tells the user whether "My Workspace" is the browser-only demo or the connected cloud workspace. */
export default function WorkspaceModeChip({ className = '' }) {
  return isDemoMode ? (
    <span className={`chip border-amber-300/30 bg-amber-400/10 text-amber-100 ${className}`} title="No Clerk/Supabase keys: galaxies are saved in this browser only">
      <HardDrive className="h-3.5 w-3.5 text-amber-300" /> Demo · saved in this browser
    </span>
  ) : (
    <span className={`chip border-emerald-300/30 bg-emerald-400/10 text-emerald-100 ${className}`} title="Signed in with Clerk; galaxies sync to Supabase">
      <Cloud className="h-3.5 w-3.5 text-emerald-300" /> My Workspace · synced
    </span>
  )
}
