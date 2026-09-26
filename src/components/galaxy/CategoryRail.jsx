import { motion } from 'framer-motion'
import { Eye, EyeOff, PanelLeftClose, PanelLeftOpen } from 'lucide-react'

/**
 * Left rail: jump to a category (level 2) or toggle its visibility in the galaxy.
 * Collapses to an icon strip so the canvas keeps the screen.
 */
export default function CategoryRail({
  layout,
  focus,
  collapsed,
  visibleCategories,
  onToggleCollapse,
  onFocusCategory,
  onToggleVisibility,
}) {
  return (
    <motion.aside
      animate={{ width: collapsed ? 56 : 208 }}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      className="glass-strong pointer-events-auto absolute bottom-20 left-3 top-20 z-30 hidden flex-col overflow-hidden rounded-2xl md:flex"
    >
      <button
        type="button"
        onClick={onToggleCollapse}
        aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
        className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-xs text-slate-400 hover:text-white"
      >
        {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        {!collapsed && <span>Categories</span>}
      </button>

      <ul className="flex-1 space-y-1 overflow-y-auto p-2">
        {layout.categories.map((category) => {
          const visible = visibleCategories.has(category.key)
          const active = focus.categoryKey === category.key
          return (
            <li key={category.key} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onFocusCategory(category)}
                title={category.label}
                className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition ${
                  active ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: category.color, boxShadow: `0 0 10px -1px ${category.color}` }}
                />
                {!collapsed && (
                  <>
                    <category.icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{category.label}</span>
                    <span className="ml-auto text-[10px] text-slate-500">{category.count}</span>
                  </>
                )}
              </button>
              {!collapsed && (
                <button
                  type="button"
                  onClick={() => onToggleVisibility(category.key)}
                  aria-label={`${visible ? 'Hide' : 'Show'} ${category.label}`}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"
                >
                  {visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </motion.aside>
  )
}
