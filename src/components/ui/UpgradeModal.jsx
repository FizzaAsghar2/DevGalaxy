import { useNavigate } from 'react-router-dom'
import { Check, Crown, Lock } from 'lucide-react'
import Modal from './Modal'
import { USAGE_ACTIONS } from '../../lib/plans'

const COPY = {
  GALAXY_GENERATION: 'You have used your free galaxy generation.',
  UI_GENERATION: 'You have used your free UI preview.',
  UI_REGENERATION: 'Regenerating a UI is a Pro feature.',
  DESIGN_VARIATION: 'Design variations are a Pro feature.',
  AI_UI_CUSTOMIZATION: 'AI UI customisation is a Pro feature.',
}

export default function UpgradeModal({ state, account, onClose, onResetDemo }) {
  const navigate = useNavigate()
  const suspended = state?.reason === 'suspended'
  const pro = account?.plans?.find((p) => p.id === 'pro')

  return (
    <Modal
      open={Boolean(state)}
      onClose={onClose}
      title={suspended ? 'Account suspended' : "You've explored your free galaxy"}
      description={
        suspended
          ? 'This account has been suspended by an administrator.'
          : `${COPY[state?.action] ?? 'This feature needs Pro.'} Upgrade to Pro to create more galaxies, generate additional UI previews and unlock advanced features.`
      }
      footer={
        !suspended && (
          <>
            <button type="button" className="btn-ghost" onClick={() => { onClose(); navigate('/pricing') }}>
              View Plans
            </button>
            <button type="button" className="btn-primary" onClick={() => { onClose(); navigate('/pricing#pro') }}>
              <Crown className="h-4 w-4" /> Upgrade to Pro
            </button>
          </>
        )
      }
    >
      {!suspended && (
        <div className="space-y-3">
          <div className="rounded-xl border border-violet-400/25 bg-violet-500/10 p-3">
            <p className="flex items-center gap-2 text-sm text-white">
              <Crown className="h-4 w-4 text-amber-300" /> Pro includes
            </p>
            <ul className="mt-2 space-y-1 text-xs text-slate-300">
              {(pro?.features ?? []).map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-300" /> {feature}
                </li>
              ))}
            </ul>
          </div>
          <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Lock className="h-3 w-3" /> Your saved galaxies and previews stay available. {USAGE_ACTIONS[state?.action]?.label ?? 'Usage'} is checked on the server.
          </p>
          {account?.mode === 'demo' && (
            <button type="button" className="text-[11px] text-amber-200/80 underline-offset-2 hover:underline" onClick={() => { onResetDemo(); onClose() }}>
              Demo mode only: reset the simulated free allowance
            </button>
          )}
        </div>
      )}
    </Modal>
  )
}
