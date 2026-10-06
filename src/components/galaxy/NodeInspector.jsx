import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, LayoutTemplate, X } from 'lucide-react'
import { CATEGORY_BY_KEY } from '../../lib/categories'
import { architectureStats } from '../../services/architectureSchema'

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <p className="label-muted">{title}</p>
      {children}
    </div>
  )
}

function FieldList({ fields }) {
  return (
    <ul className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10">
      {fields.map((field) => (
        <li key={field.name} className="flex items-center justify-between bg-white/[0.02] px-3 py-2">
          <span className="font-mono text-xs text-slate-200">{field.name}</span>
          {field.type && <span className="text-[10px] uppercase text-slate-500">{field.type}</span>}
        </li>
      ))}
    </ul>
  )
}

function CoreBody({ architecture }) {
  const stats = architectureStats(architecture)
  return (
    <div className="space-y-5">
      {architecture.description && <p className="text-sm leading-relaxed text-slate-300">{architecture.description}</p>}

      <Section title="Recommended stack">
        <div className="space-y-2 text-xs">
          <div>
            <span className="text-slate-500">Frontend · </span>
            <span className="text-slate-200">{architecture.frontend.join(', ') || '—'}</span>
          </div>
          <div>
            <span className="text-slate-500">Backend · </span>
            <span className="text-slate-200">{architecture.backend.join(', ') || '—'}</span>
          </div>
          <div>
            <span className="text-slate-500">Database · </span>
            <span className="text-slate-200">{architecture.database.type}</span>
          </div>
        </div>
      </Section>

      <Section title="Statistics">
        <div className="grid grid-cols-3 gap-2">
          {[
            ['Pages', stats.pages],
            ['Features', stats.features],
            ['Roles', stats.roles],
            ['Tables', stats.tables],
            ['APIs', stats.apis],
            ['Nodes', stats.nodes],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <p className="font-display text-lg text-white">{value}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

function CategoryBody({ category, onSelectChild }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-300">
        {category.count} {category.count === 1 ? 'node' : 'nodes'} orbiting this category.
      </p>
      <ul className="space-y-1.5">
        {category.children.map((child) => (
          <li key={child.id}>
            <button
              type="button"
              onClick={() => onSelectChild(child)}
              className="group flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-left transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              <span className="text-sm text-slate-200">{child.name}</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-slate-200" />
            </button>
          </li>
        ))}
        {category.children.length === 0 && <li className="text-sm text-slate-500">Nothing here yet.</li>}
      </ul>
    </div>
  )
}

function ChildBody({ child, architecture, onViewUi, hasUi }) {
  const { categoryKey, data } = child

  if (categoryKey === 'database') {
    const relationships = (architecture.relationships ?? []).filter(
      (rel) => rel.from === child.name || rel.to === child.name,
    )
    return (
      <div className="space-y-5">
        {data.description && <p className="text-sm text-slate-300">{data.description}</p>}
        <Section title="Fields">
          <FieldList fields={data.fields ?? []} />
        </Section>
        {relationships.length > 0 && (
          <Section title="Relationships">
            <ul className="space-y-1.5">
              {relationships.map((rel) => (
                <li key={`${rel.from}-${rel.to}`} className="chip font-mono">
                  {rel.from} → {rel.to}
                  <span className="text-slate-500">({rel.type})</span>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    )
  }

  if (categoryKey === 'users') {
    return (
      <div className="space-y-5">
        {data.description && <p className="text-sm text-slate-300">{data.description}</p>}
        <Section title="Permissions">
          <ul className="flex flex-wrap gap-1.5">
            {(data.permissions ?? []).map((permission) => (
              <li key={permission} className="chip">
                {permission}
              </li>
            ))}
            {(data.permissions ?? []).length === 0 && <li className="text-sm text-slate-500">No permissions listed.</li>}
          </ul>
        </Section>
      </div>
    )
  }

  if (categoryKey === 'features') {
    return (
      <div className="space-y-5">
        {data.description && <p className="text-sm text-slate-300">{data.description}</p>}
        {(data.relatedPages ?? []).length > 0 && (
          <Section title="Related pages">
            <div className="flex flex-wrap gap-1.5">
              {data.relatedPages.map((page) => (
                <span key={page} className="chip">
                  {page}
                </span>
              ))}
            </div>
          </Section>
        )}
        {(data.relatedRoles ?? []).length > 0 && (
          <Section title="Related roles">
            <div className="flex flex-wrap gap-1.5">
              {data.relatedRoles.map((role) => (
                <span key={role} className="chip">
                  {role}
                </span>
              ))}
            </div>
          </Section>
        )}
      </div>
    )
  }

  if (categoryKey === 'pages') {
    const features = architecture.features.filter((feature) => (feature.relatedPages ?? []).includes(child.name))
    const roles = architecture.userRoles.map((role) => role.name)
    return (
      <div className="space-y-5">
        {data.description && <p className="text-sm text-slate-300">{data.description}</p>}
        {onViewUi && (
          <button type="button" onClick={() => onViewUi(child.name)} className="btn-primary w-full py-2 text-xs">
            <LayoutTemplate className="h-3.5 w-3.5" /> {hasUi ? 'View UI' : 'Generate UI preview'}
          </button>
        )}
        {features.length > 0 && (
          <Section title="Features on this page">
            <div className="flex flex-wrap gap-1.5">
              {features.map((feature) => (
                <span key={feature.name} className="chip">
                  {feature.name}
                </span>
              ))}
            </div>
          </Section>
        )}
        <Section title="Who can access it">
          <div className="flex flex-wrap gap-1.5">
            {roles.map((role) => (
              <span key={role} className="chip">
                {role}
              </span>
            ))}
          </div>
        </Section>
      </div>
    )
  }

  if (categoryKey === 'apis') {
    return (
      <div className="space-y-5">
        <p className="text-sm text-slate-300">{data.purpose || data.description || 'External service integration.'}</p>
      </div>
    )
  }

  return <p className="text-sm text-slate-300">Part of the recommended {categoryKey} stack.</p>
}

export default function NodeInspector({ selection, architecture, layout, onClose, onSelectChild, onViewUi, hasUi }) {
  const open = Boolean(selection)
  let title = ''
  let subtitle = ''
  let color = '#a78bfa'
  let body = null

  if (selection?.kind === 'core') {
    title = architecture.projectName
    subtitle = 'Project core'
    body = <CoreBody architecture={architecture} />
  } else if (selection?.kind === 'category') {
    const category = layout.categories.find((item) => item.id === selection.id)
    if (category) {
      title = category.label
      subtitle = 'Category'
      color = category.color
      body = <CategoryBody category={category} onSelectChild={onSelectChild} />
    }
  } else if (selection?.kind === 'child') {
    for (const category of layout.categories) {
      const child = category.children.find((item) => item.id === selection.id)
      if (child) {
        title = child.name
        subtitle = CATEGORY_BY_KEY[child.categoryKey]?.label ?? 'Node'
        color = category.color
        body = <ChildBody child={child} architecture={architecture} onViewUi={onViewUi} hasUi={hasUi} />
        break
      }
    }
  }

  return (
    <AnimatePresence>
      {open && body && (
        <motion.aside
          key={selection.id ?? selection.kind}
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 28 }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          className="glass-strong pointer-events-auto absolute right-3 top-20 bottom-20 z-30 flex w-[min(360px,calc(100vw-1.5rem))] flex-col rounded-2xl sm:right-4"
        >
          <header className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div className="min-w-0">
              <p className="label-muted" style={{ color }}>
                {subtitle}
              </p>
              <h3 className="truncate font-display text-lg text-white">{title}</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close inspector"
              className="rounded-lg border border-white/10 p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto px-4 py-4">{body}</div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
