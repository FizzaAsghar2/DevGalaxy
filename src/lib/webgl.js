let cached = null

/** One-time WebGL capability probe — decides between the 3D and 2D galaxies. */
export function supportsWebGL() {
  if (cached !== null) return cached
  try {
    const canvas = document.createElement('canvas')
    cached = Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    cached = false
  }
  return cached
}
