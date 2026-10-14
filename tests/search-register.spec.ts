/**
 * The search unit's registration contract — specifically its `stateVersion`.
 *
 * Why this is pinned rather than trusted: the host persists each unit's fold as a
 * checkpoint row `(sessionId, key, ver, seq, val)` and `restore` only discards it
 * when `ver` differs (session-projection/src/index.ts:88-92, :122-126). A state
 * shape change that keeps `stateVersion` therefore does NOT get a fresh replay —
 * the old row is forward-applied through the new schema, and any field the schema
 * defaults away silently empties. That is exactly how 0.9.7 shipped the bug where
 * every cluster header counted results while expanding it showed nothing: the
 * persisted sources had lost their `queries` membership.
 *
 * So the two facts are asserted together: the shape really differs from the
 * pre-cluster row, AND the version says so.
 */
import { describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { registerSearchRefProjection } from '../src/projection/register'
import { SEARCH_REFS_KEY } from '../src/projection/keys'

interface Captured {
  key: string
  stateVersion: number
  stateSchema: { parse(value: unknown): unknown }
}

/** A context whose projection registry just records what was registered. */
function ctxCapturingRegistry(): { ctx: Context; defs: Captured[] } {
  const defs: Captured[] = []
  const registry = {
    register: (definition: Captured) => {
      defs.push(definition)
      return () => {}
    },
  }
  const ctx = {
    inject: (_names: string[], fn: (injected: unknown) => void) => {
      fn({ sessionProjections: registry })
    },
  } as unknown as Context
  return { ctx, defs }
}

describe('search unit registration', () => {
  it('registers the search key with a stateVersion past the pre-cluster row', () => {
    const { ctx, defs } = ctxCapturingRegistry()
    registerSearchRefProjection(ctx)
    const unit = defs.find(d => d.key === SEARCH_REFS_KEY)
    expect(unit, `no registration under ${SEARCH_REFS_KEY}`).toBeDefined()
    // 0 was the pre-cluster version; replaying a version-0 row through the
    // cluster shape is the bug, so the number itself is the regression guard.
    // 2 is 0.9.10's capacity raise: a checkpoint written under 20/20/20 has
    // already dropped sources, and only a discarded row gets re-folded.
    expect(unit?.stateVersion).toBe(2)
  })

  it('would empty a pre-cluster checkpoint row, which is why the version had to move', () => {
    const { ctx, defs } = ctxCapturingRegistry()
    registerSearchRefProjection(ctx)
    const unit = defs.find(d => d.key === SEARCH_REFS_KEY)!
    const legacy = {
      turn: 1,
      calls: { c1: { turn: 1, query: 'q1' } },
      latest: { turn: 1, urls: ['https://a.org'] },
      items: [{ url: 'https://a.org', host: 'a.org', query: 'q1', count: 1, lastTurn: 1 }],
      queries: [{ query: 'q1', turn: 1, hits: 1 }],
      sourceTotal: 1,
      queryTotal: 1,
    }
    const parsed = unit.stateSchema.parse(legacy) as {
      items: { queries: readonly string[] }[]
      calls: Record<string, { queries: readonly string[] }>
    }
    // Membership links are gone: defaults do not resurrect data the old shape
    // stored under a different field name.
    expect(parsed.items[0]?.queries).toEqual([])
    expect(parsed.calls['c1']?.queries).toEqual([])
  })
})
