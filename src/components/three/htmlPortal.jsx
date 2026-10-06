import { createContext, useContext, useLayoutEffect, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'

const HtmlPortalContext = createContext(null)

function createLayer() {
  const el = document.createElement('div')
  el.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:none'
  return el
}

/**
 * Owns a plain DOM layer for drei <Html> overlays.
 *
 * drei mounts overlays straight into the R3F container, which React removes
 * while the three.js root is still tearing down; the overlay then fails to
 * clean itself up (`removeChild`). A layer created outside React survives the
 * whole teardown. It is created during render so the overlay target never
 * changes, which would otherwise remount drei's internal React root.
 */
export function HtmlPortalProvider({ children }) {
  const gl = useThree((state) => state.gl)
  const [layer] = useState(createLayer)
  const ref = useRef(layer)

  useLayoutEffect(() => {
    const parent = gl.domElement.parentNode
    parent?.appendChild(layer)
    return () => layer.remove()
  }, [gl, layer])

  return <HtmlPortalContext.Provider value={ref}>{children}</HtmlPortalContext.Provider>
}

export function useHtmlPortal() {
  return useContext(HtmlPortalContext)
}
