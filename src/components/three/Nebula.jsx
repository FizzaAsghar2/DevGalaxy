import { useMemo } from 'react'
import * as THREE from 'three'

function radialTexture(inner, outer) {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, inner)
  gradient.addColorStop(0.45, outer)
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}

/** Two huge soft sprites behind the scene: nebula depth for almost no cost. */
export default function Nebula() {
  const violet = useMemo(() => radialTexture('rgba(139,92,246,0.55)', 'rgba(76,29,149,0.16)'), [])
  const cyan = useMemo(() => radialTexture('rgba(34,211,238,0.4)', 'rgba(14,116,144,0.12)'), [])

  return (
    <group position={[0, 0, -34]} renderOrder={-1}>
      <sprite scale={[70, 46, 1]} position={[-16, 8, 0]}>
        <spriteMaterial map={violet} transparent opacity={0.75} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <sprite scale={[58, 40, 1]} position={[20, -6, 6]}>
        <spriteMaterial map={cyan} transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  )
}
