/**
 * The session-recall section: read-side narrowing and rendered contract.
 *
 * Mirrors the slots-section arrangement (pure tests for the narrowing, a
 * `react-dom/server` static render for what a reader sees) and pins the three
 * things that make this section the summary pane's DEFAULT memory view:
 *
 * - the switch defaults ON (absent config seam must not hide the one honest
 *   "what is the model seeing" surface);
 * - the projection ABSENT hides it entirely (no prime-memory → nothing painted);
 * - `items: []` is the honest empty state, not a hidden section.
 */
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Context } from '@deepseek-ai/cordis'
import { readRecall } from '../src/client/summary/memory-recall'
import { MEMORY_RECALL_KEY } from '../src/client/summary/memory-recall'
import { MemoryRecallSection } from '../src/client/summary/MemoryRecallSection'
import { SummaryTab } from '../src/client/SummaryTab'
import { DELIVERABLES_KEY } from '../src/projection/keys'
import { zh } from '../src/client/locales'
import type { BriefClientConfig } from '../src/client/scope-face'

const t = (key: string): string => (zh as Record<string, string>)[key] ?? key

const SESSION = 'session-1'

/** One well-formed recalled memory (the wire minimum). */
const ITEM = { id: 'm1', type: 'work_fact', title: '上行必须走官方地址', priority: 80 }

describe('readRecall', () => {
  it('absent or malformed-beyond-repair values narrow to undefined', () => {
    for (const raw of [undefined, null, 'nonsense', 42, [], {}]) {
      expect(readRecall(raw)).toBeUndefined()
    }
    // Shape drift on the required counters/keys is a capability miss, not an empty set.
    expect(readRecall({ rev: 1, sessionId: SESSION, count: 1 })).toBeUndefined()
    expect(readRecall({ rev: 1, sessionId: SESSION, items: [] })).toBeUndefined()
    expect(readRecall({ rev: -1, sessionId: SESSION, count: 0, items: [] })).toBeUndefined()
    expect(readRecall({ rev: 1, count: 0, items: [] })).toBeUndefined()
  })

  it('an empty item list IS the empty state (present but nothing recalled)', () => {
    const view = readRecall({ rev: 3, sessionId: SESSION, count: 0, items: [] })
    expect(view).toBeDefined()
    expect(view?.items).toEqual([])
    expect(view?.rev).toBe(3)
  })

  it('keeps well-formed items, drops malformed ones', () => {
    const view = readRecall({
      rev: 1,
      sessionId: SESSION,
      count: 3,
      items: [ITEM, { id: '', type: 'x', title: 'y', priority: 1 }, { id: 'm2', type: 'work_method' }, null],
    })
    expect(view?.items).toEqual([ITEM])
    expect(view?.count).toBe(3)
  })

  it('narrows the optional scenario phrases opportunistically', () => {
    const withScenarios = readRecall({
      rev: 1,
      sessionId: SESSION,
      count: 2,
      items: [
        { ...ITEM, scenario: ['改 profile 配置时', '', 42, '重启服务前'] },
        { ...ITEM, id: 'm2', scenario: [] },
      ],
    })
    expect(withScenarios?.items[0]?.scenario).toEqual(['改 profile 配置时', '重启服务前'])
    // An empty/garbage scenario list must not materialise the field at all.
    expect(withScenarios?.items[1]?.scenario).toBeUndefined()
  })
})

/** A configForms scope snapshot fixture. */
function scopeFixture(value: BriefClientConfig | undefined, status: 'ready' | 'unavailable' = 'ready') {
  return {
    getSnapshot: () => ({ status, value, revision: 1, writable: true }),
    subscribe: () => () => {},
    set: async () => true,
    unset: async () => true,
  }
}

/** A context serving the given projection values and config snapshot. */
function ctxWith(
  values: Record<string, unknown>,
  config?: { value?: BriefClientConfig; status?: 'ready' | 'unavailable'; present?: boolean },
): Context {
  const sessions = {
    binding: (id: string) =>
      id === SESSION
        ? {
          session: {
            projections: {
              faceOf: (key: string) => ({
                getSnapshot: () => values[key],
                subscribe: () => () => {},
              }),
            },
          },
        }
        : undefined,
  }
  const configForms = config?.present === false ? undefined : { get: () => scopeFixture(config?.value, config?.status) }
  return {
    get: (name: string) => (name === 'sessions' ? sessions : name === 'configForms' ? configForms : undefined),
  } as unknown as Context
}

const LIVE_VIEW = { rev: 7, sessionId: SESSION, count: 2, items: [ITEM, { id: 'm2', type: 'work_method', title: '推送前 3 秒自检', priority: 65, scenario: ['push 之前'] }] }

function renderSection(ctx: Context): string {
  return renderToStaticMarkup(createElement(MemoryRecallSection, { t, ctx, scope: { sessionId: SESSION } }))
}

describe('MemoryRecallSection gating', () => {
  it('renders with a live view wherever the config face cannot answer (default ON)', () => {
    const view = { [MEMORY_RECALL_KEY]: LIVE_VIEW }
    expect(renderSection(ctxWith(view, { present: false }))).toContain(ITEM.title)
    expect(renderSection(ctxWith(view, { status: 'unavailable' }))).toContain(ITEM.title)
    expect(renderSection(ctxWith(view))).toContain(ITEM.title)
  })

  it('renders nothing when the switch is explicitly off, live view notwithstanding', () => {
    const ctx = ctxWith({ [MEMORY_RECALL_KEY]: LIVE_VIEW }, { value: { showMemoryRecall: false } })
    expect(renderSection(ctx)).toBe('')
  })

  it('renders nothing when the projection is absent', () => {
    expect(renderSection(ctxWith({}))).toBe('')
    expect(renderSection(ctxWith({ [MEMORY_RECALL_KEY]: 'nonsense' }))).toBe('')
  })

  it('shows the empty state (not the list) when nothing has been recalled', () => {
    const ctx = ctxWith({ [MEMORY_RECALL_KEY]: { rev: 1, sessionId: SESSION, count: 0, items: [] } })
    const markup = renderSection(ctx)
    expect(markup).toContain(zh['section.memoryRecall'])
    expect(markup).toContain(zh['recall.empty'])
    expect(markup).not.toContain(ITEM.title)
  })
})

describe('MemoryRecallSection rendering', () => {
  it('renders type pill, titles, priorities and the injected-count footer', () => {
    const markup = renderSection(ctxWith({ [MEMORY_RECALL_KEY]: LIVE_VIEW }))
    expect(markup).toContain('work_fact')
    expect(markup).toContain(ITEM.title)
    expect(markup).toContain('推送前 3 秒自检')
    expect(markup).toContain('P80')
    expect(markup).toContain('P65')
    expect(markup).toContain(zh['recall.count'].replace('{count}', '2'))
  })

  it('paints the scenario line and keeps it on the tooltip too', () => {
    const markup = renderSection(ctxWith({ [MEMORY_RECALL_KEY]: LIVE_VIEW }))
    expect(markup).toContain('push 之前')
    expect(markup).toContain('推送前 3 秒自检 — push 之前')
  })

  it('is read-only: no pin/activate affordance leaks into the section', () => {
    const markup = renderSection(ctxWith({ [MEMORY_RECALL_KEY]: LIVE_VIEW }))
    expect(markup).not.toContain('<button')
    expect(markup).not.toContain('checkbox')
  })
})

describe('summary tab composition', () => {
  it('recall renders while the slots section stays hidden by default', () => {
    const ctx = ctxWith({
      // The deliverables section needs a live (all-empty) view to render at all.
      [DELIVERABLES_KEY]: { latest: null, sessionPaths: [], sessionTotal: 0 },
      [MEMORY_RECALL_KEY]: LIVE_VIEW,
      // Slots projection live too — but its section is off by default now.
      memorySlots: { rev: 1, count: 1, openCount: 1, slots: [{ id: 's1', title: '钉住的约定', kind: 'rule', status: 'open', priority: 90 }] },
    })
    const markup = renderToStaticMarkup(createElement(SummaryTab, { t, ctx, scope: { sessionId: SESSION } }))
    expect(markup).toContain('data-dsh-brief-sidebar="memory-recall-section"')
    expect(markup).not.toContain('data-dsh-brief-sidebar="memory-slots-section"')
    expect(markup).not.toContain('钉住的约定')
  })

  it('both sections coexist when slots is explicitly turned on, recall first', () => {
    const ctx = ctxWith(
      {
        [MEMORY_RECALL_KEY]: LIVE_VIEW,
        memorySlots: { rev: 1, count: 1, openCount: 1, slots: [{ id: 's1', title: '钉住的约定', kind: 'rule', status: 'open', priority: 90 }] },
      },
      { value: { showMemorySlots: true } },
    )
    const markup = renderToStaticMarkup(createElement(SummaryTab, { t, ctx, scope: { sessionId: SESSION } }))
    const recall = markup.indexOf('data-dsh-brief-sidebar="memory-recall-section"')
    const slots = markup.indexOf('data-dsh-brief-sidebar="memory-slots-section"')
    expect(recall).toBeGreaterThan(-1)
    expect(slots).toBeGreaterThan(recall)
  })
})
