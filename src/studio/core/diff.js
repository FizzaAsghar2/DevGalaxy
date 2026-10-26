// @ts-check
/**
 * Line diff (LCS). Large inputs fall back to a whole-file replace so the UI stays responsive.
 * @param {string} a @param {string} b
 * @returns {{ type: 'same' | 'add' | 'del', text: string }[]}
 */
export function lineDiff(a, b) {
  const x = a.split('\n')
  const y = b.split('\n')
  if (x.length * y.length > 4_000_000) return [...x.map((text) => ({ type: /** @type {const} */ ('del'), text })), ...y.map((text) => ({ type: /** @type {const} */ ('add'), text }))]
  const n = x.length
  const m = y.length
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = x[i] === y[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
  /** @type {{ type: 'same' | 'add' | 'del', text: string }[]} */
  const out = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (x[i] === y[j]) { out.push({ type: 'same', text: x[i] }); i++; j++ }
    else if (dp[i + 1][j] >= dp[i][j + 1]) out.push({ type: 'del', text: x[i++] })
    else out.push({ type: 'add', text: y[j++] })
  }
  while (i < n) out.push({ type: 'del', text: x[i++] })
  while (j < m) out.push({ type: 'add', text: y[j++] })
  return out
}

/**
 * Which files changed between two snapshots.
 * @param {import('./paths.js').ProjectFile[]} before @param {import('./paths.js').ProjectFile[]} after
 */
export function changedFiles(before, after) {
  const a = new Map(before.map((f) => [f.path, f.content]))
  const b = new Map(after.map((f) => [f.path, f.content]))
  /** @type {{ path: string, status: 'added' | 'removed' | 'modified' }[]} */
  const out = []
  for (const [path, content] of b) if (!a.has(path)) out.push({ path, status: 'added' }); else if (a.get(path) !== content) out.push({ path, status: 'modified' })
  for (const path of a.keys()) if (!b.has(path)) out.push({ path, status: 'removed' })
  return out.sort((p, q) => p.path.localeCompare(q.path))
}
