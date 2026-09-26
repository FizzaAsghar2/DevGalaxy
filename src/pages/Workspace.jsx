import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { ArrowLeft, Layers3, Sparkles, X } from 'lucide-react'
import { CATEGORIES, CATEGORY_BY_KEY } from '../lib/categories'
import { buildGalaxyLayout } from '../services/galaxyLayout'
import { buildDemoGalaxy } from '../services/localArchitecture'
import { useGalaxyService } from '../hooks/useGalaxies'
import { useDeviceProfile } from '../hooks/useDeviceProfile'
import { supportsWebGL } from '../lib/webgl'
import SpaceCanvas from '../components/three/SpaceCanvas'
import GalaxyToolbar from '../components/galaxy/GalaxyToolbar'
import CategoryRail from '../components/galaxy/CategoryRail'
import ViewControls from '../components/galaxy/ViewControls'
import NodeInspector from '../components/galaxy/NodeInspector'
import { ErrorState, LoadingState } from '../components/ui/States'

const GalaxyScene = lazy(() => import('../components/galaxy/GalaxyScene'))
const GalaxyFlow = lazy(() => import('../components/galaxy/GalaxyFlow'))

const ALL_CATEGORY_KEYS = CATEGORIES.map((category) => category.key)

export default function Workspace({ demo = false }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const service = useGalaxyService()
  const { tier, isMobile, reducedMotion } = useDeviceProfile()

  const [galaxy, setGalaxy] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [focus, setFocus] = useState({ level: 1, categoryKey: null, nodeId: null, nodeLabel: null })
  const [selection, setSelection] = useState(null)
  const [hoveredId, setHoveredId] = useState(null)
  const [visibleCategories, setVisibleCategories] = useState(() => new Set(ALL_CATEGORY_KEYS))
  const [railCollapsed, setRailCollapsed] = useState(false)
  const [presentation, setPresentation] = useState(false)
  const [force2D, setForce2D] = useState(false)
  const commands = useRef(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const result = demo ? buildDemoGalaxy() : await service.get(id)
        if (cancelled) return
        if (!result) {
          setError('This galaxy does not exist, or it belongs to another explorer.')
        } else {
          setGalaxy(result)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [demo, id, service])

  const architecture = galaxy?.architecture_data ?? null
  const layout = useMemo(() => (architecture ? buildGalaxyLayout(architecture) : null), [architecture])

  const use3D = supportsWebGL() && !isMobile && !force2D

  const focusCategory = useCallback((category) => {
    setFocus({ level: 2, categoryKey: category.key, nodeId: null, nodeLabel: null })
    setSelection({ kind: 'category', id: category.id })
    setVisibleCategories((current) => {
      if (current.has(category.key)) return current
      const next = new Set(current)
      next.add(category.key)
      return next
    })
  }, [])

  const handleSelect = useCallback(
    (payload) => {
      if (!layout) return

      if (payload.kind === 'core') {
        setFocus({ level: 1, categoryKey: null, nodeId: null, nodeLabel: null })
        setSelection({ kind: 'core' })
        return
      }

      if (payload.kind === 'category') {
        const category = layout.categories.find((item) => item.id === payload.id)
        if (category) focusCategory(category)
        return
      }

      const category = layout.categories.find((item) => item.key === payload.categoryKey)
      const child = category?.children.find((item) => item.id === payload.id)
      if (!child) return
      setFocus({ level: 3, categoryKey: category.key, nodeId: child.id, nodeLabel: child.name })
      setSelection({ kind: 'child', id: child.id })
    },
    [focusCategory, layout],
  )

  const handleNavigate = useCallback((next) => {
    if (next.level === 1) {
      setFocus({ level: 1, categoryKey: null, nodeId: null, nodeLabel: null })
      setSelection(null)
      return
    }
    setFocus({ level: 2, categoryKey: next.categoryKey, nodeId: null, nodeLabel: null })
  }, [])

  const toggleVisibility = useCallback((key) => {
    setVisibleCategories((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const resetView = useCallback(() => {
    setFocus({ level: 1, categoryKey: null, nodeId: null, nodeLabel: null })
    setSelection(null)
    setVisibleCategories(new Set(ALL_CATEGORY_KEYS))
  }, [])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        if (presentation) setPresentation(false)
        else if (focus.level > 1) handleNavigate({ level: 1 })
        else setSelection(null)
      }
      if (event.key.toLowerCase() === 'p' && !event.metaKey && !event.ctrlKey) {
        const tag = document.activeElement?.tagName
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') setPresentation((value) => !value)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focus.level, handleNavigate, presentation])

  if (loading) return <LoadingState label="Opening your galaxy…" />

  if (error || !architecture || !layout) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <ErrorState
          title="Galaxy unavailable"
          message={error ?? 'We could not read this architecture.'}
          action={
            <button type="button" className="btn-primary" onClick={() => navigate('/galaxies')}>
              Back to My Galaxies
            </button>
          }
        />
      </div>
    )
  }

  const hoveredNode =
    hoveredId && hoveredId !== 'core'
      ? layout.categories
          .flatMap((category) => [category, ...category.children])
          .find((node) => node.id === hoveredId)
      : null

  return (
    <div className="relative h-screen w-full overflow-hidden bg-void-900">
      <div className="absolute inset-0">
        <Suspense fallback={<LoadingState label="Rendering the universe…" />}>
          {use3D ? (
            <SpaceCanvas
              tier={tier}
              className="h-full w-full"
              onDegrade={() => {
                if (tier === 'low') setForce2D(true)
              }}
            >
              <GalaxyScene
                architecture={architecture}
                layout={layout}
                focus={focus}
                hoveredId={hoveredId}
                visibleCategories={visibleCategories}
                presentation={presentation}
                tier={tier}
                reducedMotion={reducedMotion}
                onSelect={handleSelect}
                onHover={setHoveredId}
                commands={commands}
                onFitRequest={resetView}
              />
            </SpaceCanvas>
          ) : (
            <GalaxyFlow
              architecture={architecture}
              layout={layout}
              focus={focus}
              visibleCategories={visibleCategories}
              onSelect={handleSelect}
              commands={commands}
            />
          )}
        </Suspense>
      </div>

      {/* hover tooltip */}
      <AnimatePresence>
        {hoveredNode && !presentation && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="glass pointer-events-none absolute bottom-20 left-1/2 z-30 -translate-x-1/2 rounded-xl px-3 py-2 text-xs text-slate-200"
          >
            <span className="text-slate-400">{CATEGORY_BY_KEY[hoveredNode.categoryKey ?? hoveredNode.key]?.label}</span>
            <span className="mx-1.5 text-slate-600">·</span>
            {hoveredNode.name ?? hoveredNode.label}
          </motion.div>
        )}
      </AnimatePresence>

      {!presentation && (
        <>
          <GalaxyToolbar
            projectName={architecture.projectName}
            focus={focus}
            layout={layout}
            onNavigate={handleNavigate}
            onSelect={handleSelect}
            onPresent={() => setPresentation(true)}
            right={
              <div className="hidden items-center gap-2 sm:flex">
                <button
                  type="button"
                  className="btn-ghost px-2.5 py-1.5 text-xs"
                  onClick={() => {
                    setForce2D((value) => !value)
                    toast(force2D ? 'Switched to 3D galaxy' : 'Switched to 2D map')
                  }}
                  title="Toggle 2D / 3D"
                >
                  <Layers3 className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">{use3D ? '2D map' : '3D galaxy'}</span>
                </button>
                <Link to="/galaxies" className="btn-ghost px-2.5 py-1.5 text-xs">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">Galaxies</span>
                </Link>
              </div>
            }
          />

          <CategoryRail
            layout={layout}
            focus={focus}
            collapsed={railCollapsed}
            visibleCategories={visibleCategories}
            onToggleCollapse={() => setRailCollapsed((value) => !value)}
            onFocusCategory={focusCategory}
            onToggleVisibility={toggleVisibility}
          />

          <NodeInspector
            selection={selection}
            architecture={architecture}
            layout={layout}
            onClose={() => setSelection(null)}
            onSelectChild={(child) => handleSelect({ kind: 'child', id: child.id, categoryKey: child.categoryKey })}
          />

          <ViewControls
            onZoomIn={() => commands.current?.zoomIn()}
            onZoomOut={() => commands.current?.zoomOut()}
            onFit={() => {
              resetView()
              commands.current?.fit()
            }}
            onReset={() => {
              resetView()
              commands.current?.fit()
            }}
            hint={use3D ? 'Drag to orbit · scroll to zoom · click a planet to explore' : 'Drag nodes · scroll to zoom'}
          />

          {!selection && (
            <button
              type="button"
              onClick={() => setSelection({ kind: 'core' })}
              className="glass-strong pointer-events-auto absolute right-3 top-20 z-30 rounded-xl px-3 py-2 text-xs text-slate-200 hover:text-white sm:right-4"
            >
              <Sparkles className="mr-1.5 inline h-3.5 w-3.5 text-violet-300" />
              Architecture summary
            </button>
          )}
        </>
      )}

      {presentation && (
        <div className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-between p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="label-muted">DevGalaxy presentation</p>
              <h1 className="font-display text-2xl text-white sm:text-3xl">{architecture.projectName}</h1>
            </div>
            <button
              type="button"
              onClick={() => setPresentation(false)}
              className="btn-ghost pointer-events-auto px-2.5 py-1.5 text-xs"
            >
              <X className="h-3.5 w-3.5" /> Exit
            </button>
          </div>
          <div className="pointer-events-auto flex flex-wrap justify-center gap-2">
            {layout.categories.map((category) => (
              <button
                key={category.key}
                type="button"
                onClick={() => focusCategory(category)}
                className={`chip transition ${focus.categoryKey === category.key ? 'border-white/40 text-white' : ''}`}
                style={{ borderColor: focus.categoryKey === category.key ? `${category.color}88` : undefined }}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: category.color }} />
                {category.label}
              </button>
            ))}
            <button type="button" onClick={() => handleNavigate({ level: 1 })} className="chip">
              Whole galaxy
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
