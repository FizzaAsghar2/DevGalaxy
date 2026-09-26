import { useMemo, useRef } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import SpaceCanvas from '../three/SpaceCanvas'
import Starfield from '../three/Starfield'
import Nebula from '../three/Nebula'
import { Connection, OrbitRing } from '../three/Connections'
import { Planet, ProjectCore } from '../three/Orbs'
import { CATEGORIES } from '../../lib/categories'
import { qualityFor } from '../../hooks/useDeviceProfile'

const CORE = [0, 0, 0]

function OrbitingSystem({ tier, reducedMotion }) {
  const group = useRef()
  const quality = qualityFor(tier)

  const nodes = useMemo(
    () =>
      CATEGORIES.map((category, index) => {
        const angle = (index / CATEGORIES.length) * Math.PI * 2
        const radius = 5.4 + (index % 3) * 0.8
        return {
          ...category,
          position: [Math.cos(angle) * radius, Math.sin(index * 1.4) * 0.9, Math.sin(angle) * radius],
        }
      }),
    [],
  )

  useFrame((state, delta) => {
    if (!group.current) return
    if (!reducedMotion) group.current.rotation.y += delta * 0.055

    // Pointer parallax: the whole system tilts slightly toward the cursor.
    const targetX = state.pointer.y * 0.16
    const targetZ = -state.pointer.x * 0.12
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, targetX, delta * 2)
    group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, targetZ, delta * 2)
  })

  return (
    <group ref={group}>
      <OrbitRing radius={5.6} color="#8b5cf6" opacity={0.16} segments={quality.orbitDetail * 2} />
      <OrbitRing radius={7.0} color="#22d3ee" opacity={0.1} segments={quality.orbitDetail * 2} />
      <ProjectCore color="#8b5cf6" radius={1.55} animate={!reducedMotion} detail={quality.orbitDetail} />
      <Html position={[0, 2.6, 0]} center distanceFactor={12} style={{ pointerEvents: 'none' }}>
        <div className="whitespace-nowrap rounded-full border border-violet-300/30 bg-void-900/75 px-3 py-1 font-display text-[12px] text-white backdrop-blur-sm">
          ◉ Your Project
        </div>
      </Html>

      {nodes.map((node, index) => (
        <group key={node.key}>
          <Connection
            from={CORE}
            to={node.position}
            color={node.color}
            animated={quality.particles && index % 2 === 0 && !reducedMotion}
            seed={index * 0.2}
          />
          <group position={node.position}>
            <Planet color={node.color} radius={0.55} animate={!reducedMotion} seed={index} />
            <Html position={[0, 1.05, 0]} center distanceFactor={13} style={{ pointerEvents: 'none' }}>
              <div
                className="whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] text-slate-100 backdrop-blur-sm"
                style={{ borderColor: `${node.color}55`, background: 'rgba(7,11,26,0.7)' }}
              >
                {node.glyph} {node.label}
              </div>
            </Html>
          </group>
        </group>
      ))}
    </group>
  )
}

export default function HeroScene({ tier = 'high', reducedMotion = false }) {
  return (
    <SpaceCanvas tier={tier} camera={{ position: [0, 3.2, 15], fov: 52 }} className="!absolute inset-0">
      <Starfield count={qualityFor(tier).stars} radius={70} />
      <Nebula />
      <OrbitingSystem tier={tier} reducedMotion={reducedMotion} />
    </SpaceCanvas>
  )
}
