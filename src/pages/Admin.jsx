import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import {
  Activity, Ban, Crown, History, LayoutTemplate, Lock, Orbit, RefreshCw, Search, ShieldCheck, Trash2, UserCheck, Users,
} from 'lucide-react'
import { useSession } from '../auth/AuthProvider'
import { useAccount } from '../account/AccountProvider'
import { isDemoMode } from '../lib/config'
import { LoadingState } from '../components/ui/States'

const TABS = [
  { key: 'overview', label: 'Overview', icon: Activity },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'galaxies', label: 'Galaxies', icon: Orbit },
  { key: 'plans', label: 'Plans', icon: Crown },
  { key: 'audit', label: 'Audit log', icon: History },
]

function useAdminApi() {
  const { getToken } = useSession()
  return useCallback(
    async (method, params) => {
      const token = await getToken().catch(() => null)
      const headers = { ...(token ? { authorization: `Bearer ${token}` } : {}) }
      const url = method === 'GET' ? `/api/admin?${new URLSearchParams(params)}` : '/api/admin'
      const response = await fetch(url, {
        method,
        headers: method === 'GET' ? headers : { ...headers, 'content-type': 'application/json' },
        body: method === 'GET' ? undefined : JSON.stringify(params),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw Object.assign(new Error(payload.error ?? 'Request failed.'), { status: response.status })
      return payload
    },
    [getToken],
  )
}

function Denied({ title, message }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5"><Lock className="h-6 w-6 text-slate-300" /></div>
      <h1 className="mt-4 font-display text-2xl">{title}</h1>
      <p className="mt-2 text-sm text-slate-400">{message}</p>
      <Link to="/dashboard" className="btn-ghost mt-6">Back to dashboard</Link>
    </div>
  )
}

function Stat({ label, value, icon: Icon, tone = 'text-violet-300' }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-500">{label}<Icon className={`h-4 w-4 ${tone}`} /></div>
      <p className="mt-2 font-display text-2xl text-white">{value ?? '—'}</p>
    </div>
  )
}

function Overview({ data }) {
  if (!data) return <LoadingState label="Loading statistics…" />
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Users" value={data.users} icon={Users} />
        <Stat label="Galaxies" value={data.galaxies} icon={Orbit} tone="text-cyan-300" />
        <Stat label="Galaxies today" value={data.galaxiesToday} icon={Activity} tone="text-emerald-300" />
        <Stat label="UI previews" value={data.uiPreviews} icon={LayoutTemplate} tone="text-pink-300" />
        <Stat label="Paid users" value={data.paidUsers} icon={Crown} tone="text-amber-300" />
        <Stat label="Free users" value={data.freeUsers} icon={Users} tone="text-slate-300" />
        <Stat label="Active subscriptions" value={data.activeSubscriptions} icon={ShieldCheck} tone="text-emerald-300" />
        <Stat label="Usage events" value={data.usageTotal} icon={Activity} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="glass rounded-2xl p-4">
          <h2 className="label-muted mb-3">Recent registrations</h2>
          <ul className="space-y-2 text-sm">
            {data.recentUsers.map((u) => (
              <li key={u.id} className="flex justify-between gap-2"><span className="truncate text-slate-200">{u.email ?? u.id}</span><span className="shrink-0 text-xs text-slate-500">{new Date(u.created_at).toLocaleDateString()}</span></li>
            ))}
          </ul>
        </section>
        <section className="glass rounded-2xl p-4">
          <h2 className="label-muted mb-3">Recently generated galaxies</h2>
          <ul className="space-y-2 text-sm">
            {data.recentGalaxies.map((g) => (
              <li key={g.id} className="flex justify-between gap-2"><span className="truncate text-slate-200">{g.project_name}</span><span className="shrink-0 text-xs text-slate-500">{g.complexity} · {new Date(g.created_at).toLocaleDateString()}</span></li>
            ))}
          </ul>
        </section>
      </div>
      <section className="glass rounded-2xl p-4">
        <h2 className="label-muted mb-3">Generation usage · last 30 days</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          {Object.entries(data.usage30d).map(([k, v]) => <span key={k} className="chip">{k.replaceAll('_', ' ').toLowerCase()} · <b className="text-white">{v}</b></span>)}
          {!Object.keys(data.usage30d).length && <span className="text-slate-500">No usage yet.</span>}
        </div>
      </section>
    </div>
  )
}

function UsersTab({ api, plans, selfId }) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [rows, setRows] = useState(null)
  const load = useCallback(() => api('GET', { resource: 'users', q, filter }).then((r) => setRows(r.users)).catch((e) => toast.error(e.message)), [api, filter, q])
  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  const act = async (userId, action, extra = {}) => {
    if (action === 'suspend' && !window.confirm('Suspend this account? They will keep their data but cannot generate or sign in to generate.')) return
    try {
      await api('POST', { resource: 'user', action, userId, ...extra })
      toast.success('Account updated')
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <label className="glass flex min-w-[220px] flex-1 items-center gap-2 rounded-xl px-3 py-2">
          <Search className="h-4 w-4 text-slate-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search email, name or ID" className="flex-1 bg-transparent text-sm outline-none" />
        </label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="glass rounded-xl px-3 py-2 text-sm">
          {['all', 'free', 'paid', 'admin', 'active', 'suspended'].map((f) => <option key={f} value={f} className="bg-void-900">{f}</option>)}
        </select>
      </div>
      {!rows ? <LoadingState label="Loading users…" /> : (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-slate-500"><tr>{['User', 'Role', 'Plan', 'Status', 'Galaxies', 'Usage', 'Joined', ''].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3"><p className="text-slate-100">{u.full_name || '—'}</p><p className="text-xs text-slate-500">{u.email ?? u.id}</p></td>
                  <td className="px-4 py-3">{u.role === 'admin' ? <span className="chip border-amber-300/30 text-amber-200">admin</span> : 'user'}</td>
                  <td className="px-4 py-3">
                    <select value={u.plan_id} onChange={(e) => act(u.id, 'change_plan', { planId: e.target.value })} className="rounded-lg border border-white/10 bg-void-900 px-2 py-1 text-xs">
                      {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3"><span className={u.account_status === 'suspended' ? 'text-rose-300' : 'text-emerald-300'}>{u.account_status}</span></td>
                  <td className="px-4 py-3">{u.galaxy_count}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{u.usage_count} events</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    {u.id !== selfId && u.role !== 'admin' && (u.account_status === 'suspended'
                      ? <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => act(u.id, 'reactivate')}><UserCheck className="h-3.5 w-3.5" /> Reactivate</button>
                      : <button type="button" className="btn-ghost px-2 py-1 text-xs text-rose-200" onClick={() => act(u.id, 'suspend')}><Ban className="h-3.5 w-3.5" /> Suspend</button>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No users match.</p>}
        </div>
      )}
    </div>
  )
}

function GalaxiesTab({ api }) {
  const [q, setQ] = useState('')
  const [rows, setRows] = useState(null)
  const load = useCallback(() => api('GET', { resource: 'galaxies', q }).then((r) => setRows(r.galaxies)).catch((e) => toast.error(e.message)), [api, q])
  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])
  const remove = async (g) => {
    const reason = window.prompt(`Delete “${g.project_name}”? Enter a reason for the audit log:`)
    if (reason === null) return
    try {
      await api('POST', { resource: 'galaxy', action: 'delete', galaxyId: g.id, reason })
      toast.success('Galaxy deleted')
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }
  return (
    <div>
      <label className="glass mb-3 flex items-center gap-2 rounded-xl px-3 py-2">
        <Search className="h-4 w-4 text-slate-500" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search project name" className="flex-1 bg-transparent text-sm outline-none" />
      </label>
      {!rows ? <LoadingState label="Loading galaxies…" /> : (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-slate-500"><tr>{['Project', 'Owner', 'Complexity', 'Source', 'UI', 'Created', ''].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((g) => (
                <tr key={g.id}>
                  <td className="px-4 py-3 text-slate-100">{g.project_name}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{g.owner_email ?? g.user_id}</td>
                  <td className="px-4 py-3">{g.complexity}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{g.generation_meta?.source ?? '—'}</td>
                  <td className="px-4 py-3">{g.has_ui ? 'Yes' : '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{new Date(g.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right"><button type="button" onClick={() => remove(g)} className="btn-ghost px-2 py-1 text-xs text-rose-200"><Trash2 className="h-3.5 w-3.5" /> Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No galaxies.</p>}
        </div>
      )}
    </div>
  )
}

function PlanEditor({ plan, api, onSaved }) {
  const [draft, setDraft] = useState(() => ({ ...plan, features: (plan.features ?? []).join('\n') }))
  const num = (v) => (v === '' || v == null ? null : Number(v))
  const save = async () => {
    try {
      await api('POST', {
        resource: 'plan',
        action: 'update',
        planId: plan.id,
        changes: {
          name: draft.name,
          tagline: draft.tagline,
          price_cents: num(draft.price_cents),
          billing_interval: draft.billing_interval || null,
          galaxy_limit: num(draft.galaxy_limit),
          ui_limit: num(draft.ui_limit),
          regeneration_limit: num(draft.regeneration_limit),
          features: draft.features.split('\n').map((f) => f.trim()).filter(Boolean),
          is_active: draft.is_active,
        },
      })
      toast.success(`${draft.name} saved`)
      onSaved()
    } catch (e) {
      toast.error(e.message)
    }
  }
  const field = (key, label, type = 'text') => (
    <label className="block text-xs text-slate-400">
      {label}
      <input type={type} value={draft[key] ?? ''} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-void-900/70 px-2.5 py-1.5 text-sm text-slate-100" />
    </label>
  )
  return (
    <div className="glass rounded-2xl p-5">
      <p className="label-muted">{plan.id}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {field('name', 'Name')}
        {field('tagline', 'Tagline')}
        {field('price_cents', 'Price (cents, empty = not set)', 'number')}
        <label className="block text-xs text-slate-400">Billing interval
          <select value={draft.billing_interval ?? ''} onChange={(e) => setDraft({ ...draft, billing_interval: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-void-900/70 px-2.5 py-1.5 text-sm">
            <option value="">none</option><option value="month">month</option><option value="year">year</option>
          </select>
        </label>
        {field('galaxy_limit', 'Galaxy limit (empty = unlimited)', 'number')}
        {field('ui_limit', 'UI preview limit', 'number')}
        {field('regeneration_limit', 'Regeneration / variation limit', 'number')}
        <label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={draft.is_active !== false} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} /> Active</label>
        <label className="block text-xs text-slate-400 sm:col-span-2">Features (one per line)
          <textarea rows={4} value={draft.features} onChange={(e) => setDraft({ ...draft, features: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-void-900/70 px-2.5 py-1.5 text-sm text-slate-100" />
        </label>
      </div>
      <button type="button" onClick={save} className="btn-primary mt-4 px-4 py-2 text-xs">Save plan</button>
    </div>
  )
}

function PlansTab({ api, plans, reload }) {
  return <div className="grid gap-4 lg:grid-cols-2">{plans.map((p) => <PlanEditor key={`${p.id}-${p.updated_at}`} plan={p} api={api} onSaved={reload} />)}</div>
}

function AuditTab({ api }) {
  const [logs, setLogs] = useState(null)
  useEffect(() => {
    api('GET', { resource: 'audit' }).then((r) => setLogs(r.logs)).catch((e) => toast.error(e.message))
  }, [api])
  if (!logs) return <LoadingState label="Loading audit log…" />
  return (
    <ul className="glass divide-y divide-white/5 rounded-2xl">
      {logs.map((l) => (
        <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
          <span><b className="text-slate-100">{l.action}</b> <span className="text-slate-400">on {l.target_type} {l.target_id}</span></span>
          <span className="text-xs text-slate-500">{l.admin_id} · {new Date(l.created_at).toLocaleString()}</span>
        </li>
      ))}
      {logs.length === 0 && <li className="p-6 text-center text-sm text-slate-500">No admin actions yet.</li>}
    </ul>
  )
}

export default function Admin() {
  const { account, loading, isAdmin } = useAccount()
  const api = useAdminApi()
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState(null)
  const [plans, setPlans] = useState([])
  const [denied, setDenied] = useState(null)

  const loadCore = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([api('GET', { resource: 'stats' }), api('GET', { resource: 'plans' })])
      setStats(s)
      setPlans(p.plans)
    } catch (e) {
      setDenied(e.message)
    }
  }, [api])

  useEffect(() => {
    if (isAdmin) loadCore()
  }, [isAdmin, loadCore])

  if (isDemoMode) return <Denied title="Admin console unavailable" message="The admin console only runs against the secure backend (Clerk + Supabase service role). Demo mode has no administrators." />
  if (loading && !account) return <LoadingState label="Verifying access…" />
  // The server decides; this only avoids showing an empty shell to non-admins.
  if (!isAdmin || denied) return <Denied title="Access denied" message={denied ?? 'You do not have permission to view this page.'} />

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <motion.header initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="chip border-amber-300/30 bg-amber-400/10 text-amber-100"><ShieldCheck className="h-3.5 w-3.5" /> Mission control</span>
          <h1 className="mt-3 font-display text-3xl">Admin console</h1>
          <p className="mt-1 text-sm text-slate-400">Signed in as {account.user.email}. Every action here is verified server-side and written to the audit log.</p>
        </div>
        <button type="button" onClick={loadCore} className="btn-ghost text-xs"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
      </motion.header>
      <nav className="mt-6 flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-1" role="tablist">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm transition ${tab === key ? 'bg-violet-500/20 text-white' : 'text-slate-400 hover:text-white'}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </nav>
      <div className="mt-6">
        {tab === 'overview' && <Overview data={stats} />}
        {tab === 'users' && <UsersTab api={api} plans={plans} selfId={account.user.id} />}
        {tab === 'galaxies' && <GalaxiesTab api={api} />}
        {tab === 'plans' && <PlansTab api={api} plans={plans} reload={loadCore} />}
        {tab === 'audit' && <AuditTab api={api} />}
      </div>
    </div>
  )
}
