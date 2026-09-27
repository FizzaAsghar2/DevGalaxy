import { useEffect, useMemo, useRef } from 'react'
import { Html, OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import Nebula from '../three/Nebula'
import Starfield from '../three/Starfield'
import { Connection, OrbitRing } from '../three/Connections'
import { Planet, ProjectCore } from '../three/Orbs'
import { useHtmlPortal } from '../three/htmlPortal'
import { qualityFor } from '../../hooks/useDeviceProfile'

const CORE_POSITION = [0, 0, 0]

function focusTarget(layout, focus) {
  if (focus.level === 1 || !focus.categoryKey) return { target: CORE_POSITION, distance: 21, height: 6 }

  const category = layout.categories.find((item) => item.key === focus.categoryKey)
  if (!category) return { target: CORE_POSITION, distance: 21, height: 6 }

  if (focus.level === 3 && focus.nodeId) {
    const child = category.children.find((item) => item.id === focus.nodeId)
    if (child) return { target: child.position, distance: 4.6, height: 1.6 }
  }
  return { target: category.position, distance: 13, height: 4 }
}

/** Smoothly flies the camera to whatever the user focused, with gentle pointer parallax. */
function CameraRig({ layout, focus, presentation, reducedMotion, commands, onFitRequest }) {
  const controls = useRef()
  const { camera } = useThree()
  const desired = useMemo(() => focusTarget(layout, focus), [layout, focus])
  const targetVec = useRef(new THREE.Vector3(...CORE_POSITION))
  const posVec = useRef(new THREE.Vector3())
  // Once the viewer orbits, pans or dollies, the rig stops steering until the focus changes.
  const manual = useRef(false)

  useEffect(() => {
    if (!commands) return undefined

    const dolly = (factor) => {
      const controlsTarget = controls.current?.target ?? new THREE.Vector3()
      const offset = camera.position.clone().sub(controlsTarget)
      const distance = THREE.MathUtils.clamp(offset.length() * factor, 3, 48)
      camera.position.copy(controlsTarget.clone().add(offset.setLength(distance)))
      manual.current = true
      controls.current?.update()
    }

    const api = {
      zoomIn: () => dolly(0.78),
      zoomOut: () => dolly(1.28),
      fit: () => {
        manual.current = false
        onFitRequest?.()
      },
    }
    commands.current = api
    return () => {
      // Only clear our own registration: the other renderer may already own the ref.
      if (commands.current === api) commands.current = null
    }
  }, [camera, commands, onFitRequest])

  useEffect(() => {
    manual.current = false
  }, [desired])

  useEffect(() => {
    if (!reducedMotion) return
    const { target, distance, height } = desired
    camera.position.set(target[0] + distance * 0.35, target[1] + height, target[2] + distance)
    controls.current?.target.set(...target)
    controls.current?.update()
  }, [camera, desired, reducedMotion])

  useFrame((state, delta) => {
    if (!controls.current) return
    const { target, distance, height } = desired
    targetVec.current.set(...target)

    const parallaxX = presentation ? 0 : state.pointer.x * 1.4
    const parallaxY = presentation ? 0 : state.pointer.y * 0.9
    const angle = presentation ? state.clock.elapsedTime * 0.06 : 0

    posVec.current.set(
      target[0] + Math.sin(angle) * distance + parallaxX,
      target[1] + height + parallaxY,
      target[2] + Math.cos(angle) * distance,
    )

    const lerp = Math.min(1, delta * (reducedMotion ? 12 : 2.2))

    // Only steer while flying to a new focus or auto-orbiting, so the viewer keeps
    // full manual control once the transition has settled or they took over.
    const settled = camera.position.distanceTo(posVec.current) < 0.25
    if (presentation || (!manual.current && !settled)) {
      controls.current.target.lerp(targetVec.current, lerp)
      camera.position.lerp(posVec.current, lerp)
    }

    controls.current.update()
  })

  return (
    <OrbitControls
      ref={controls}
      enablePan={!presentation}
      enableDamping
      dampingFactor={0.08}
      onStart={() => {
        manual.current = true
      }}
      rotateSpeed={0.55}
      zoomSpeed={0.7}
      minDistance={3}
      maxDistance={48}
      maxPolarAngle={Math.PI * 0.85}
      makeDefault
    />
  )
}

function NodeLabel({ position, children, color, muted = false, size = 'base' }) {
  const portal = useHtmlPortal()
  return (
    <Html
      portal={portal}
      position={position}
      center
      distanceFactor={14}
      zIndexRange={[20, 0]}
      style={{ pointerEvents: 'none' }}
    >
      <div
        className={`whitespace-nowrap rounded-full border px-2.5 py-1 font-display backdrop-blur-sm transition-opacity ${
          size === 'lg' ? 'text-[13px]' : 'text-[11px]'
        } ${muted ? 'opacity-40' : 'opacity-100'}`}
        style={{
          borderColor: `${color}55`,
          background: 'rgba(7, 11, 26, 0.72)',
          color: '#e2e8f0',
          boxShadow: `0 0 18px -8px ${color}`,
        }}
      >
        {children}
      </div>
    </Html>
  )
}

export default function GalaxyScene({
  architecture,
  layout,
  focus,
  hoveredId,
  visibleCategories,
  presentation = false,
  tier = 'high',
  reducedMotion = false,
  onSelect,
  onHover,
  commands,
  onFitRequest,
}) {
  const quality = qualityFor(tier)
  const animate = !reducedMotion

  const isVisible = (key) => visibleCategories.has(key)
  const expandedCategory = focus.level >= 2 ? focus.categoryKey : null

  return (
    <>
      <CameraRig
        layout={layout}
        focus={focus}
        presentation={presentation}
        reducedMotion={reducedMotion}
        commands={commands}
        onFitRequest={onFitRequest}
      />
      <Starfield count={quality.stars} />
      <Nebula />
      <OrbitRing radius={8.6} color="#8b5cf6" opacity={0.12} segments={quality.orbitDetail * 2} />
      <OrbitRing radius={10.2} color="#22d3ee" opacity={0.08} segments={quality.orbitDetail * 2} />

      <group>
        <ProjectCore
          color="#8b5cf6"
          animate={animate}
          detail={quality.orbitDetail}
          onClick={(event) => {
            event.stopPropagation()
            onSelect({ kind: 'core' })
          }}
          onPointerOver={(event) => {
            event.stopPropagation()
            onHover('core')
          }}
          onPointerOut={() => onHover(null)}
        />
        <NodeLabel position={[0, 2.9, 0]} color="#c4b5fd" size="lg">
          ◉ {architecture.projectName}
        </NodeLabel>

        {layout.categories.map((category, index) => {
          const visible = isVisible(category.key)
          const active = expandedCategory === category.key
          const hovered = hoveredId === category.id
          const dimmed = !visible || (expandedCategory !== null && !active)

          return (
            <group key={category.id}>
              <Connection
                from={CORE_POSITION}
                to={category.position}
                color={category.color}
                active={active || hovered}
                dimmed={dimmed}
                animated={quality.particles && (active || hovered)}
                seed={index * 0.17}
              />
              {visible && (
                <group position={category.position}>
                  <Planet
                    color={category.color}
                    radius={0.85}
                    hovered={hovered}
                    active={active}
                    dimmed={dimmed}
                    animate={animate}
                    seed={index}
                    onClick={(event) => {
                      event.stopPropagation()
                      onSelect({ kind: 'category', id: category.id, categoryKey: category.key })
                    }}
                    onPointerOver={(event) => {
                      event.stopPropagation()
                      onHover(category.id)
                    }}
                    onPointerOut={() => onHover(null)}
                  />
                  <NodeLabel position={[0, 1.6, 0]} color={category.color} muted={dimmed}>
                    {category.glyph} {category.label} · {category.count}
                  </NodeLabel>
                </group>
              )}

              {visible &&
                active &&
                category.children.map((child, childIndex) => {
                  const childHovered = hoveredId === child.id
                  const childActive = focus.nodeId === child.id
                  return (
                    <group key={child.id}>
                      <Connection
                        from={category.position}
                        to={child.position}
                        color={category.color}
                        active={childHovered || childActive}
                        animated={quality.particles && childActive}
                        seed={childIndex * 0.23}
                      />
                      <group position={child.position}>
                        <Planet
                          color={category.color}
                          radius={0.38}
                          hovered={childHovered}
                          active={childActive}
                          animate={animate}
                          seed={childIndex}
                          onClick={(event) => {
                            event.stopPropagation()
                            onSelect({ kind: 'child', id: child.id, categoryKey: category.key })
                          }}
                          onPointerOver={(event) => {
                            event.stopPropagation()
                            onHover(child.id)
                          }}
                          onPointerOut={() => onHover(null)}
                        />
                        {(childHovered || childActive || category.children.length <= 10 || presentation) && (
                          <NodeLabel position={[0, 0.85, 0]} color={category.color}>
                            {child.name}
                          </NodeLabel>
                        )}
                      </group>
                    </group>
                  )
                })}
            </group>
          )
        })}

        {expandedCategory === 'database' &&
          layout.relationshipEdges.map((edge) => (
            <Connection
              key={edge.id}
              from={edge.from.position}
              to={edge.to.position}
              color="#6ee7b7"
              active
              animated={quality.particles}
              speed={0.18}
            />
          ))}
      </group>
    </>
  )
}
