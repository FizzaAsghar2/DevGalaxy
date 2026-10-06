import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { ArrowLeft, LayoutTemplate, Layers3, Orbit, Sparkles, X } from 'lucide-react'
import { CATEGORIES, CATEGORY_BY_KEY } from '../lib/categories'
import { buildGalaxyLayout, slug } from '../services/galaxyLayout'
import { requestUi, UI_MODE_ACTION } from '../services/uiService'
import { normaliseUiSpec } from '../services/uiSchema'
import { useSession } from '../auth/AuthProvider'
import { useAccount } from '../account/AccountProvider'
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
const UiPreview = lazy(() => import('../components/ui-preview/UiPreview'))

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
  const { getToken, isSignedIn } = useSession()
  const accountApi = useAccount()
  const [view, setView] = useState('galaxy')
  const [uiSpec, setUiSpec] = useState(null)
  const [uiPageId, setUiPageId] = useState(null)
  const [uiBusy, setUiBusy] = useState(false)

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
          setUiSpec(result.ui_data ? normaliseUiSpec(result.ui_data, result.architecture_data) : null)
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

  const runUi = useCallback(
    async (mode, options = {}) => {
      if (!galaxy) return false
      const action = UI_MODE_ACTION[mode]
      // The public demo galaxy is generated in the browser and never counts against a plan.
      if (!demo && !accountApi.ensure(action)) return false
      setUiBusy(true)
      try {
        const result = await requestUi({ mode, galaxy, current: uiSpec, getToken, offlineOnly: demo || !isSignedIn, ...options })
        setUiSpec(result.ui)
        if (!demo) {
          await service.saveUi(galaxy.id, result.ui)
          if (accountApi.account?.mode === 'demo') accountApi.recordDemoUsage(action)
          else accountApi.refresh()
        }
        if (!uiPageId || !result.ui.uiPages.some((p) => p.id === uiPageId)) setUiPageId(result.ui.uiPages[0]?.id ?? null)
        if (mode === 'customize') toast.success(result.changes?.length ? `Applied: ${result.changes.slice(0, 3).join(', ')}` : 'Customisation applied')
        else toast.success(mode === 'variation' ? 'New design direction ready' : 'UI preview ready')
        return true
      } catch (err) {
        if (err.code === 'upgrade_required') accountApi.showUpgrade(err.action ?? action)
        else toast.error(err.message)
        return false
      } finally {
        setUiBusy(false)
      }
    },
    [accountApi, demo, galaxy, getToken, isSignedIn, service, uiPageId, uiSpec],
  )

  const viewUiForPage = useCallback(
    (pageName) => {
      setView('ui')
      setSelection(null)
      const target = uiSpec?.uiPages.find((p) => p.architecturePage === pageName || p.name === pageName)
      if (target) setUiPageId(target.id)
      else if (uiSpec) toast('This page has no UI yet — regenerate the UI to include it.')
    },
    [uiSpec],
  )

  const viewPageInArchitecture = useCallback(
    (uiPage) => {
      if (!uiPage || !layout) return
      const pages = layout.categories.find((c) => c.key === 'pages')
      const child = pages?.children.find((c) => c.id === `pages:${slug(uiPage.architecturePage)}` || c.name === uiPage.architecturePage)
      setView('galaxy')
      if (child) {
        setFocus({ level: 3, categoryKey: 'pages', nodeId: child.id, nodeLabel: child.name })
        setSelection({ kind: 'child', id: child.id })
      } else if (pages) focusCategory(pages)
    },
    [focusCategory, layout],
  )

  const lockedActions = useMemo(() => {
    if (demo) return {}
    return Object.fromEntries(Object.keys(UI_MODE_ACTION).map((mode) => [UI_MODE_ACTION[mode], !accountApi.entitlement(UI_MODE_ACTION[mode]).allowed]))
  }, [accountApi, demo])

  const resetView = useCallback(() => {
    setFocus({ level: 1, categoryKey: null, nodeId: null, nodeLabel: null })
    setSelection(null)
    setVisibleCategories(new Set(ALL_CATEGORY_KEYS))
  }, [])

  useEffect(() => {
    const onKey = (event) => {
      if (view === 'ui') return
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
  }, [focus.level, handleNavigate, presentation, view])

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

      {view === 'ui' && (
        <div className="absolute inset-0 z-20 bg-void-900/85 backdrop-blur-sm">
          <Suspense fallback={<LoadingState label="Loading UI preview…" />}>
            <UiPreview
              galaxy={galaxy}
              spec={uiSpec}
              busy={uiBusy}
              pageId={uiPageId}
              onPageChange={setUiPageId}
              onRun={runUi}
              onViewArchitecture={viewPageInArchitecture}
              locked={lockedActions}
              projectName={architecture.projectName}
            />
          </Suspense>
        </div>
      )}

      {/* hover tooltip */}
      <AnimatePresence>
        {hoveredNode && !presentation && view === 'galaxy' && (
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
            onPresent={() => {
              setView('galaxy')
              setPresentation(true)
            }}
            hideSearch={view === 'ui'}
            right={
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-lg border border-white/10 bg-void-900/60 p-0.5" role="tablist" aria-label="Workspace view">
                  {[
                    ['galaxy', 'Galaxy', Orbit],
                    ['ui', 'UI Preview', LayoutTemplate],
                  ].map(([key, label, Icon]) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={view === key}
                      onClick={() => {
                        setView(key)
                        if (key === 'ui') setSelection(null)
                      }}
                      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition ${view === key ? 'bg-violet-500/25 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className={`btn-ghost hidden px-2.5 py-1.5 text-xs sm:inline-flex ${view === 'ui' ? 'sm:hidden' : ''}`}
                  onClick={() => {
                    setForce2D((value) => !value)
                    toast(force2D ? 'Switched to 3D galaxy' : 'Switched to 2D map')
                  }}
                  title="Toggle 2D / 3D"
                >
                  <Layers3 className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">{use3D ? '2D map' : '3D galaxy'}</span>
                </button>
                <Link to={demo ? '/' : '/galaxies'} className="btn-ghost hidden px-2.5 py-1.5 text-xs sm:inline-flex">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">Galaxies</span>
                </Link>
              </div>
            }
          />

          {view === 'galaxy' && (
          <>
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
            onViewUi={viewUiForPage}
            hasUi={Boolean(uiSpec)}
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
