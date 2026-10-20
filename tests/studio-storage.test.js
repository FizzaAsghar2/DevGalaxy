import { describe, expect, it } from 'vitest'
import { addVersion, createProject, currentVersion, duplicateProject, restoreVersion, stepVersion } from '../src/studio/storage.js'
import { planOffline } from '../src/studio/core/spec.js'

const spec = planOffline('A cosy bakery website with a cream and brown palette and an online menu')
const make = () => createProject({ userId: 'u1', spec, files: [{ path: 'a.ts', content: '1' }], summary: 'Initial', source: 'offline' })

describe('project versions', () => {
  it('adds immutable versions and moves the pointer for undo/redo', () => {
    let p = make()
    const v1 = currentVersion(p)
    p = addVersion(p, { summary: 'Two', spec, files: [{ path: 'a.ts', content: '2' }], buildStatus: 'unknown', source: 'manual' })
    expect(p.versions).toHaveLength(2)
    expect(p.versions[0]).toBe(v1)
    p = stepVersion(p, -1)
    expect(currentVersion(p).summary).toBe('Initial')
    expect(stepVersion(p, -1)).toBe(p)
    p = stepVersion(p, 1)
    expect(currentVersion(p).summary).toBe('Two')
  })
  it('restore copies a version to the top without deleting newer ones', () => {
    let p = make()
    const first = p.versions[0].id
    p = addVersion(p, { summary: 'Two', spec, files: [], customFiles: [{ path: 'src/x.ts', content: 'x' }], buildStatus: 'ok', source: 'manual' })
    p = addVersion(p, { summary: 'Three', spec, files: [], buildStatus: 'ok', source: 'manual' })
    p = restoreVersion(p, p.versions[1].id)
    expect(p.versions.map((v) => v.summary)).toEqual(['Initial', 'Two', 'Three', 'Restored “Two”'])
    expect(currentVersion(p).customFiles).toEqual([{ path: 'src/x.ts', content: 'x' }])
    expect(p.versions[0].id).toBe(first)
  })
  it('duplicates into a new independent project', () => {
    const p = { ...make(), favorite: true }
    const d = duplicateProject(p)
    expect(d.id).not.toBe(p.id)
    expect(d.name).toMatch(/copy$/)
    expect(d.favorite).toBe(false)
    expect(d.versions).toHaveLength(1)
  })
})
