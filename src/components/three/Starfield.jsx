import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Distant star shell. Points are cheap, sized by distance, and rotate very
 * slowly so the background reads as depth rather than motion.
 */
export default function Starfield({ count = 1800, radius = 80, speed = 0.012 }) {
  const ref = useRef()

  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const palette = [new THREE.Color('#ffffff'), new THREE.Color('#c4b5fd'), new THREE.Color('#67e8f9')]

    for (let i = 0; i < count; i += 1) {
      const r = radius * (0.55 + Math.random() * 0.45)
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.cos(phi) * 0.7
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)

      const color = palette[Math.floor(Math.random() * palette.length)]
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
      sizes[i] = Math.random() < 0.08 ? 0.5 : 0.22
    }

    return { positions, colors, sizes }
  }, [count, radius])

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * speed
  })

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        size={0.3}
        sizeAttenuation
        transparent
        opacity={0.85}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
