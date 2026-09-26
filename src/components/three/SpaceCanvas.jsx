import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr, PerformanceMonitor, Preload } from '@react-three/drei'
import { qualityFor } from '../../hooks/useDeviceProfile'

/**
 * Shared R3F canvas. Pauses rendering when the tab or the canvas is off-screen
 * and drops resolution automatically when frames get expensive.
 */
export default function SpaceCanvas({ tier = 'high', camera, children, className = '', onDegrade }) {
  const quality = qualityFor(tier)
  const [visible, setVisible] = useState(true)
  const [dpr, setDpr] = useState(quality.dpr[1])

  useEffect(() => {
    const onVisibility = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  return (
    <Canvas
      className={className}
      dpr={dpr}
      frameloop={visible ? 'always' : 'never'}
      gl={{ antialias: tier === 'high', powerPreference: 'high-performance', alpha: true }}
      camera={{ fov: 50, near: 0.1, far: 220, position: [0, 3.5, 18], ...camera }}
    >
      <PerformanceMonitor
        onDecline={() => {
          setDpr(quality.dpr[0])
          onDegrade?.()
        }}
        onIncline={() => setDpr(quality.dpr[1])}
      />
      <color attach="background" args={['#04060f']} />
      <fog attach="fog" args={['#04060f', 26, 90]} />
      <ambientLight intensity={0.45} />
      <pointLight position={[0, 0, 0]} intensity={tier === 'low' ? 30 : 60} color="#a78bfa" distance={40} />
      <directionalLight position={[8, 12, 10]} intensity={0.7} color="#93c5fd" />
      <Suspense fallback={null}>{children}</Suspense>
      <AdaptiveDpr pixelated={false} />
      <Preload all />
    </Canvas>
  )
}
