import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Activity, Check, Cloud, Coins, Cpu, Download, ExternalLink, FileArchive, FolderGit2, HardDrive, KeyRound, Loader2, ShieldCheck, Trash2, X } from 'lucide-react'
import { useSession } from '../auth/AuthProvider'
import { useAccount } from '../account/AccountProvider'
import { isClerkConfigured, isDemoMode, isSupabaseConfigured, sourceRepoUrl } from '../lib/config'
import { USAGE_ACTIONS, formatCents } from '../lib/usage'
import Modal from '../components/ui/Modal'
import WorkspaceModeChip from '../components/ui/WorkspaceModeChip'

const TABS = [
  { key: 'usage', label: 'Usage & spend', icon: Activity },
  { key: 'export', label: 'Export', icon: FileArchive },
  { key: 'workspace', label: 'Workspace', icon: Cloud },
]

function Card({ title, children, className = '' }) {
  return (
    <section className={`glass rounded-2xl p-5 ${className}`}>
      {title && <h2 className="label-muted mb-3">{title}</h2>}
      {children}
    </section>
  )
}

function UsageTab() {
  const { account, usage, isAdmin, clearDemoUsage } = useAccount()
  const [confirm, setConfirm] = useState(false)
  if (!account) return <Card><p className="text-sm text-slate-400">Usage is unavailable until your account loads.</p></Card>
  const budget = account.budget ?? {}
  const spent = isAdmin && budget.spentCents != null ? budget.spentCents : usage.monthCents
  const pct = budget.budgetCents ? Math.min(100, Math.round((spent / budget.budgetCents) * 100)) : 0
  const max = Math.max(1, ...usage.series.map((d) => d.calls))
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><p className="label-muted">Generations this month</p><p className="mt-2 font-display text-3xl text-white">{usage.monthCalls}</p><p className="text-xs text-slate-500">{usage.aiCalls} via AI provider</p></Card>
        <Card><p className="label-muted">Estimated AI spend</p><p className="mt-2 flex items-center gap-2 font-display text-3xl text-white"><Coins className="h-6 w-6 text-amber-300" />{formatCents(spent)}</p><p className="text-xs text-slate-500">{isAdmin ? 'Whole workspace' : 'Your usage'} · {usage.monthTokens.toLocaleString()} tokens reported</p></Card>
        <Card>
          <p className="label-muted">Monthly budget</p>
          <p className="mt-2 font-display text-3xl text-white">{budget.budgetCents != null ? formatCents(budget.budgetCents) : 'Not set'}</p>
          {budget.budgetCents != null ? (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className={`h-full rounded-full ${pct >= 90 ? 'bg-rose-400' : 'bg-gradient-to-r from-violet-500 to-cyan-400'}`} /></div>
          ) : <p className="text-xs text-slate-500">Set <code className="font-mono">AI_MONTHLY_BUDGET_USD</code> on the server to cap spend.</p>}
        </Card>
      </div>

      {!account.aiConfigured && (
        <p className="rounded-xl border border-amber-300/20 bg-amber-400/5 px-4 py-3 text-xs text-amber-100">No AI provider is connected, so generations use the offline generator and cost $0.00. Add <code className="font-mono">AI_API_KEY</code> to use a model.</p>
      )}

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card title="Generations · last 14 days">
          <div className="flex h-40 items-end gap-1.5">
            {usage.series.map((d, i) => (
              <div key={d.date} className="group flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] text-slate-400 opacity-0 transition group-hover:opacity-100">{d.calls}</span>
                <motion.div initial={{ height: 0 }} animate={{ height: `${Math.max(4, (d.calls / max) * 100)}%` }} transition={{ delay: i * 0.03 }} className={`w-full rounded-md ${d.calls ? 'bg-gradient-to-t from-violet-600 to-cyan-400' : 'bg-white/10'}`} title={`${d.date}: ${d.calls} · ${formatCents(d.cents)}`} />
                <span className="text-[9px] text-slate-500">{d.date.slice(8)}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="By action · this month">
          <ul className="space-y-2 text-sm">
            {Object.entries(USAGE_ACTIONS).map(([key, spec]) => (
              <li key={key} className="flex justify-between"><span className="text-slate-300">{spec.label}</span><b className="text-white">{usage.counts[key] ?? 0}</b></li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Recent activity">
        {usage.recent.length === 0 ? <p className="text-sm text-slate-500">No generations yet. Create a galaxy to see it here.</p> : (
          <ul className="divide-y divide-white/5 text-sm">
            {usage.recent.map((e, i) => (
              <li key={`${e.created_at}-${i}`} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="text-slate-200">{USAGE_ACTIONS[e.action_type]?.label ?? e.action_type}</span>
                <span className="flex items-center gap-3 text-xs text-slate-500">
                  <span className={`chip ${e.source === 'ai' ? 'border-cyan-300/30 text-cyan-200' : ''}`}>{e.source === 'ai' ? 'AI' : 'Offline'}</span>
                  {formatCents(e.cost_cents)} · {new Date(e.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
        {account.mode === 'demo' && usage.recent.length > 0 && (
          <button type="button" onClick={() => setConfirm(true)} className="btn-ghost mt-3 px-3 py-1.5 text-xs text-rose-200"><Trash2 className="h-3.5 w-3.5" /> Clear local usage log</button>
        )}
      </Card>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Clear the local usage log?"
        description="This removes the usage history stored in this browser. Your galaxies are not affected."
        footer={<><button type="button" className="btn-ghost" onClick={() => setConfirm(false)}>Cancel</button><button type="button" className="btn-primary" onClick={() => { clearDemoUsage(); setConfirm(false); toast.success('Usage log cleared') }}>Clear log</button></>}
      />
    </div>
  )
}

const INCLUDED = ['Frontend source (src/), assets (public/)', 'Serverless API source (api/)', 'Supabase SQL migrations', 'README, AGENTS.md and .env.example', 'package.json + lockfile and build config']
const EXCLUDED = ['.env files, API keys, passwords, tokens', 'User data and database dumps', '.git, node_modules, dist and caches']

function ExportTab() {
  const { getToken } = useSession()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const download = async () => {
    setBusy(true)
    setError(null)
    try {
      const token = isDemoMode ? null : await getToken().catch(() => null)
      const response = await fetch('/api/export', { headers: token ? { authorization: `Bearer ${token}` } : {} })
      if (!response.ok || !(response.headers.get('content-type') ?? '').includes('zip')) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error ?? 'The in-app export is not available on this deployment.')
      }
      const blob = await response.blob()
      const name = /filename="([^"]+)"/.exec(response.headers.get('content-disposition') ?? '')?.[1] ?? 'devgalaxy-source.zip'
      const url = URL.createObjectURL(blob)
      const link = Object.assign(document.createElement('a'), { href: url, download: name })
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast.success(`Downloaded ${name} · ${response.headers.get('x-file-count') ?? ''} files`)
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
      <Card>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/30 to-cyan-400/20"><FileArchive className="h-6 w-6 text-violet-200" /></div>
          <div>
            <h2 className="font-display text-xl text-white">Download Source Code (.zip)</h2>
            <p className="mt-1 text-sm text-slate-400">The complete DevGalaxy project, ready to install with <code className="font-mono">npm install</code> and run with <code className="font-mono">npm run dev</code>. Secrets are never included.</p>
          </div>
        </div>
        <button type="button" onClick={download} disabled={busy} className="btn-primary mt-5 w-full py-3 disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} {busy ? 'Packaging source…' : 'Download Source Code (.zip)'}
        </button>
        {error && <p role="alert" className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error} Use the repository download below instead.</p>}
        {!isDemoMode && <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500"><ShieldCheck className="h-3.5 w-3.5" /> Only the workspace owner (database role admin) can download.</p>}
        <div className="mt-5 border-t border-white/5 pt-4">
          <p className="label-muted">Repository download</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <a href={`${sourceRepoUrl}/archive/refs/heads/main.zip`} className="btn-ghost px-3 py-2 text-xs"><FolderGit2 className="h-3.5 w-3.5" /> main branch .zip</a>
            <a href={sourceRepoUrl} target="_blank" rel="noreferrer" className="btn-ghost px-3 py-2 text-xs"><ExternalLink className="h-3.5 w-3.5" /> Open repository</a>
          </div>
        </div>
      </Card>
      <div className="space-y-4">
        <Card title="Included">
          <ul className="space-y-1.5 text-sm text-slate-300">{INCLUDED.map((x) => <li key={x} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />{x}</li>)}</ul>
        </Card>
        <Card title="Never included">
          <ul className="space-y-1.5 text-sm text-slate-300">{EXCLUDED.map((x) => <li key={x} className="flex gap-2"><X className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />{x}</li>)}</ul>
        </Card>
      </div>
    </div>
  )
}

function Status({ icon: Icon, label, live, liveText, demoText }) {
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <span className="flex items-center gap-2 text-sm text-slate-200"><Icon className="h-4 w-4 text-violet-300" /> {label}</span>
      <span className={`chip ${live ? 'border-emerald-300/30 text-emerald-200' : 'border-amber-300/30 text-amber-200'}`}>{live ? liveText : demoText}</span>
    </li>
  )
}

function WorkspaceTab() {
  const { account } = useAccount()
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Integrations">
        <ul className="divide-y divide-white/5">
          <Status icon={KeyRound} label="Sign-in" live={isClerkConfigured} liveText="Clerk connected" demoText="Demo account (simulated)" />
          <Status icon={isSupabaseConfigured ? Cloud : HardDrive} label="Storage" live={isSupabaseConfigured && !isDemoMode} liveText="Supabase connected" demoText="This browser only" />
          <Status icon={Cpu} label="AI generation" live={Boolean(account?.aiConfigured)} liveText="AI provider connected" demoText="Offline generator" />
        </ul>
      </Card>
      <Card title="Modes">
        <p className="text-sm text-slate-300"><b className="text-white">Explore Demo</b> opens a sample galaxy with simulated actions. Nothing is saved and no personal data is shown.</p>
        <p className="mt-3 text-sm text-slate-300"><b className="text-white">My Workspace</b> holds your own galaxies. {isDemoMode ? 'Right now it runs in demo mode: data stays in this browser until Clerk and Supabase are connected.' : 'It is private to your signed-in account and synced to Supabase.'}</p>
        <WorkspaceModeChip className="mt-4" />
      </Card>
    </div>
  )
}

export default function Settings() {
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((t) => t.key === params.get('tab')) ? params.get('tab') : 'usage'
  return (
    <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-indigo-600/12 blur-[110px]" />
      <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="label-muted">Personal workspace</p>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl">Settings</h1>
        <p className="mt-1.5 text-sm text-slate-400">Track AI usage and spend, export the source code, and see which integrations are live.</p>
      </motion.header>
      <nav className="mt-6 flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-1" role="tablist">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setParams({ tab: key })} className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm transition ${tab === key ? 'bg-violet-500/20 text-white' : 'text-slate-400 hover:text-white'}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </nav>
      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
        {tab === 'usage' && <UsageTab />}
        {tab === 'export' && <ExportTab />}
        {tab === 'workspace' && <WorkspaceTab />}
      </motion.div>
    </div>
  )
}
