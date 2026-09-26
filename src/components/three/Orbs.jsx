import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function useGlowTexture(color) {
  return useMemo(() => {
    const size = 128
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    const c = new THREE.Color(color)
    const rgb = `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`
    gradient.addColorStop(0, `rgba(${rgb},0.95)`)
    gradient.addColorStop(0.28, `rgba(${rgb},0.38)`)
    gradient.addColorStop(1, `rgba(${rgb},0)`)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
    return new THREE.CanvasTexture(canvas)
  }, [color])
}

/** Soft additive aura used by every orb — one sprite instead of post-processing. */
export function Aura({ color, scale = 3, opacity = 0.8 }) {
  const texture = useGlowTexture(color)
  return (
    <sprite scale={[scale, scale, 1]}>
      <spriteMaterial
        map={texture}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  )
}

/** The project core: a slowly rotating, pulsing planet at the centre of the galaxy. */
export function ProjectCore({ color = '#8b5cf6', radius = 1.7, animate = true, detail = 48, onClick, onPointerOver, onPointerOut }) {
  const mesh = useRef()
  const shell = useRef()
  const aura = useRef()

  useFrame((state, delta) => {
    if (!animate) return
    const t = state.clock.elapsedTime
    if (mesh.current) mesh.current.rotation.y += delta * 0.12
    if (shell.current) {
      shell.current.rotation.y -= delta * 0.06
      shell.current.rotation.x = Math.sin(t * 0.2) * 0.12
    }
    if (aura.current) {
      const pulse = 1 + Math.sin(t * 0.9) * 0.05
      aura.current.scale.setScalar(pulse)
    }
  })

  return (
    <group onClick={onClick} onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
      <group ref={aura}>
        <Aura color={color} scale={radius * 5.4} opacity={0.65} />
      </group>
      <mesh ref={mesh} castShadow>
        <icosahedronGeometry args={[radius, 4]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.85}
          roughness={0.28}
          metalness={0.35}
        />
      </mesh>
      <mesh ref={shell} scale={1.22}>
        <icosahedronGeometry args={[radius, Math.min(2, Math.round(detail / 24))]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.22} />
      </mesh>
    </group>
  )
}

/** A category / child planet. Hover and focus states are driven from the parent. */
export function Planet({
  color,
  radius = 0.8,
  hovered = false,
  active = false,
  dimmed = false,
  animate = true,
  seed = 0,
  onClick,
  onPointerOver,
  onPointerOut,
}) {
  const mesh = useRef()
  const group = useRef()
  const ring = useRef()

  useFrame((state, delta) => {
    const target = hovered || active ? 1.18 : 1
    if (group.current) {
      group.current.scale.lerp(new THREE.Vector3(target, target, target), Math.min(1, delta * 6))
    }
    if (!animate) return
    if (mesh.current) mesh.current.rotation.y += delta * 0.25
    if (ring.current) ring.current.rotation.z = state.clock.elapsedTime * 0.35 + seed
  })

  const opacity = dimmed ? 0.25 : 1

  return (
    <group
      ref={group}
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onPointerMissed={undefined}
    >
      <Aura color={color} scale={radius * (hovered || active ? 6 : 4.4)} opacity={dimmed ? 0.18 : 0.6} />
      <mesh ref={mesh}>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered || active ? 1.1 : 0.6}
          roughness={0.35}
          metalness={0.25}
          transparent
          opacity={opacity}
        />
      </mesh>
      {(active || hovered) && (
        <mesh ref={ring} rotation={[Math.PI / 2.4, 0, 0]}>
          <torusGeometry args={[radius * 1.7, 0.03, 8, 48]} />
          <meshBasicMaterial color={color} transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  )
}
