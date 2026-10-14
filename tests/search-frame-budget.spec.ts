/**
 * The search fold's worst-case frame budget.
 *
 * Raising `CAPS` (0.9.10: 20/20/20 → 64/48/64, chosen from measured session
 * distributions) buys visibility with bytes: this unit's view is republished on
 * every committed search event and persisted as the session's projection
 * checkpoint. Without a budget test, "raise the cap" is a one-way ratchet that
 * nobody re-examines.
 *
 * The fixture is deliberately worst-case rather than typical: every query at a
 * realistic length, every source with a long URL, a long title, and a snippet
 * past the cap so the fold has to trim it.
 */
import { describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { registerSearchRefProjection } from '../src/projection/register'
import { SEARCH_REFS_KEY } from '../src/projection/keys'
import { CAPS } from '../src/projection/search-ref-fold'

/** 96 KB: ~2x the measured worst case at these caps. Tightened by CI history. */
const BUDGET_BYTES = 96 * 1024

interface FoldDefinition {
  key: string
  stateVersion: number
  init(): unknown
  apply(state: never, event: { type: string; data: unknown }): unknown
  wire: { view(state: unknown): unknown }
}

function registeredUnit(): FoldDefinition {
  const defs: FoldDefinition[] = []
  const ctx = {
    inject: (_names: string[], fn: (injected: unknown) => void) => {
      fn({ sessionProjections: { register: (d: FoldDefinition) => { defs.push(d); return () => {} } } })
    },
  } as unknown as Context
  registerSearchRefProjection(ctx)
  const unit = defs.find(d => d.key === SEARCH_REFS_KEY)
  if (unit === undefined) throw new Error('search unit not registered')
  return unit
}

/** A long query, a long URL, a long title, a snippet past CAPS.snippet. */
function worstCaseEvents(): { type: string; data: unknown }[] {
  const out: { type: string; data: unknown }[] = [{ type: 'turn/start', data: { turn: 3 } }]
  const hostOf = (i: number) => `s${i}.example-research-domain-with-a-longish-host.name`
  for (let q = 0; q < CAPS.queries; q++) {
    const callId = `c${q}`
    out.push({
      type: 'tool/call',
      data: {
        turn: 3,
        step: q,
        callId,
        name: 'web_search',
        arguments: JSON.stringify({
          queries: [
            `量子纠错与拓扑序参数扫描 research survey ${'长'.repeat(18)} ${q}`,
            `second merged query for call ${q} covering an equally long piece of wording`,
          ],
        }),
      },
    })
    // Three sources per call, so the source cap is what binds first.
    out.push({
      type: 'tool/result',
      data: {
        turn: 3,
        step: q,
        message: {
          content: [{ type: 'text', text: 'ok' }],
          source: { kind: 'tool', callId },
        },
        meta: {
          truncated: false,
          answer: 'x'.repeat(400),
          sources: [0, 1, 2].map((k) => ({
            url: `https://${hostOf(q)}/papers/${q}-${k}/full-text-version-with-a-path-long-enough-to-matter?rev=${q}`,
            title: `研究综述标题 ${(q + 1) * (k + 1)} — a source title long enough to be realistic in a search result list`,
            snippet: 'y'.repeat(400),
            publishedAt: '2026-10-14',
          })),
        },
      },
    })
  }
  return out
}

describe('search frame budget', () => {
  it('stays inside the byte budget at worst-case fill', () => {
    const unit = registeredUnit()
    let state = unit.init()
    for (const event of worstCaseEvents()) {
      state = unit.apply(state as never, event)
    }
    const view = unit.wire.view(state)
    const json = JSON.stringify(view)
    const bytes = Buffer.byteLength(json, 'utf8')
    const parsed = JSON.parse(json) as { sources: unknown[]; queries: unknown[]; latest: { urls: string[] } }
    console.log(
      `BUDGET caps=${CAPS.items}/${CAPS.queries}/${CAPS.latest} `
      + `sources=${parsed.sources.length} queries=${parsed.queries.length} latest=${parsed.latest.urls.length} `
      + `bytes=${bytes} budget=${BUDGET_BYTES}`,
    )
    // The caps must actually bind, or the measurement proves nothing.
    expect(parsed.sources.length).toBe(CAPS.items)
    expect(parsed.queries.length).toBe(CAPS.queries)
    expect(bytes).toBeLessThan(BUDGET_BYTES)
  })

  it('trims snippets to the cap rather than shipping provider-length text', () => {
    const unit = registeredUnit()
    let state = unit.init()
    for (const event of worstCaseEvents()) {
      state = unit.apply(state as never, event)
    }
    const parsed = JSON.parse(JSON.stringify(unit.wire.view(state))) as {
      sources: { snippet?: string; queries: string[] }[]
    }
    const longest = Math.max(...parsed.sources.map(s => s.snippet?.length ?? 0))
    // 160 chars plus the ellipsis the fold appends.
    expect(longest).toBeLessThanOrEqual(CAPS.snippet + 1)
    for (const source of parsed.sources) expect(source.queries.length).toBeLessThanOrEqual(CAPS.queriesPerSource)
  })
})
