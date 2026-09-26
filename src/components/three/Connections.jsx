import { useMemo, useRef } from 'react'
import { Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function curveBetween(from, to, lift = 0.28) {
  const start = new THREE.Vector3(...from)
  const end = new THREE.Vector3(...to)
  const mid = start.clone().lerp(end, 0.5)
  mid.y += start.distanceTo(end) * lift
  return new THREE.QuadraticBezierCurve3(start, mid, end)
}

/** A single glowing curved connection, optionally with a travelling particle. */
export function Connection({ from, to, color = '#8b5cf6', active = false, dimmed = false, animated = false, speed = 0.25, seed = 0 }) {
  const curve = useMemo(() => curveBetween(from, to), [from, to])
  const points = useMemo(() => curve.getPoints(28), [curve])
  const particle = useRef()

  useFrame((state) => {
    if (!animated || !particle.current) return
    const t = (state.clock.elapsedTime * speed + seed) % 1
    const point = curve.getPointAt(t)
    particle.current.position.copy(point)
  })

  return (
    <group>
      <Line
        points={points}
        color={color}
        lineWidth={active ? 2.2 : 1.1}
        transparent
        opacity={dimmed ? 0.12 : active ? 0.75 : 0.32}
        dashed={false}
      />
      {animated && (
        <mesh ref={particle}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshBasicMaterial color={color} transparent opacity={dimmed ? 0.2 : 0.95} />
        </mesh>
      )}
    </group>
  )
}

/** Faint orbital guide ring in the galaxy plane. */
export function OrbitRing({ radius, color = '#8b5cf6', opacity = 0.14, segments = 64, tilt = 0 }) {
  const points = useMemo(() => {
    const result = []
    for (let i = 0; i <= segments; i += 1) {
      const angle = (i / segments) * Math.PI * 2
      result.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius))
    }
    return result
  }, [radius, segments])

  return <Line points={points} color={color} lineWidth={1} transparent opacity={opacity} rotation={[tilt, 0, 0]} />
}
