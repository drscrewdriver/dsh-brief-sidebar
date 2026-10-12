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
import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Context } from '@deepseek-ai/cordis'
import { readRecall } from '../src/client/summary/memory-recall'
import { MEMORY_RECALL_KEY } from '../src/client/summary/memory-recall'
import { MemoryRecallSection, RatingStrip } from '../src/client/summary/MemoryRecallSection'
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

  it('narrows body and retired: a drifted field is dropped, only true means retired', () => {
    const view = readRecall({
      rev: 1,
      sessionId: SESSION,
      count: 4,
      items: [
        { ...ITEM, body: '上行必须走官方地址\n因为镜像有同步延迟', retired: true },
        { ...ITEM, id: 'm2', body: 42 },
        { ...ITEM, id: 'm3', retired: 'yes' },
        { ...ITEM, id: 'm4', retired: false },
      ],
    })
    expect(view?.items[0]?.body).toBe('上行必须走官方地址\n因为镜像有同步延迟')
    expect(view?.items[0]?.retired).toBe(true)
    // A non-string body must not become "42" shown as the whole record.
    expect(view?.items[1]?.body).toBeUndefined()
    // Anything but the literal true reads back as absent (= alive).
    expect(view?.items[2]?.retired).toBeUndefined()
    expect(view?.items[3]?.retired).toBeUndefined()
    // An old frame without either key still parses — the row just looks plain.
    expect(readRecall({ rev: 1, sessionId: SESSION, count: 1, items: [ITEM] })?.items[0]).toEqual(ITEM)
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

  it('场景行直接渲染，且行上不再挂原生 title（全文归泡泡）', () => {
    const markup = renderSection(ctxWith({ [MEMORY_RECALL_KEY]: LIVE_VIEW }))
    expect(markup).toContain('push 之前')
    // 原生 `title` 会多出一个不受皮肤契约管的深色提示框，与泡泡内容重叠还盖住它。
    // 只钉行标题这一处（打分条上的说明性 tooltip 仍合法）。
    expect(markup).not.toContain(`title="${ITEM.title}`)
    expect(markup).not.toContain('推送前 3 秒自检 — push 之前')
  })

  it('is read-only until asked: no button and no slot affordance in the plain render', () => {
    // The rating strip is mounted only for the selected row, so a static render
    // (nothing selected) must look exactly like the read-only list it used to be.
    const markup = renderSection(ctxWith({ [MEMORY_RECALL_KEY]: LIVE_VIEW }))
    expect(markup).not.toContain('<button')
    expect(markup).not.toContain('checkbox')
    // Pin/activate is the SLOTS vocabulary; recall must never borrow it.
    expect(markup).not.toContain('钉住')
    expect(markup).not.toContain('激活')
    // No hover in a static render, so no bubble either (viewport maths needs a window).
    expect(markup).not.toContain('data-dsh-brief-sidebar="recall-bubble"')
  })

  it('clamps the title to two lines instead of letting a long body stretch the row', () => {
    const markup = renderSection(ctxWith({ [MEMORY_RECALL_KEY]: LIVE_VIEW }))
    // Two lines, whatever React decides about the unit suffix.
    expect(markup).toMatch(/-webkit-line-clamp:\s*2/)
  })

  it('a retired row stays listed, struck through, and gets no controls at all', () => {
    const withStale = {
      rev: 1,
      sessionId: SESSION,
      count: 2,
      items: [
        ITEM,
        { id: 'm9', type: 'work_fact', title: '已被判过时的结论', priority: 60, body: '已被判过时的结论\n细节', retired: true },
      ],
    }
    const markup = renderSection(ctxWith({ [MEMORY_RECALL_KEY]: withStale }))
    // Still in the list — its text is in the model's context until compaction.
    expect(markup).toContain('已被判过时的结论')
    expect(markup).toContain(zh['recall.count'].replace('{count}', '2'))
    expect(markup).toContain('line-through')
    expect(markup).toContain(zh['recall.obsoleted'])
    // And nothing here can be clicked: no strip, no selection.
    expect(markup).not.toContain('<button')
    // Exactly one struck thing: the dead row's title. The live row above it
    // must stay clean — the strike is per row, never a section-wide grey-out.
    expect(markup.match(/line-through/g)).toHaveLength(1)
  })

  it('offers the rating hint when a session is bound, and hides it when not', () => {
    expect(renderSection(ctxWith({ [MEMORY_RECALL_KEY]: LIVE_VIEW }))).toContain(zh['recall.rateHint'])
    // The hint also has to say what a struck row MEANS, now that rows linger.
    expect(renderSection(ctxWith({ [MEMORY_RECALL_KEY]: LIVE_VIEW }))).toContain(zh['recall.strikeHint'])
    const orphan = renderToStaticMarkup(createElement(MemoryRecallSection, { t, ctx: ctxWith({ [MEMORY_RECALL_KEY]: LIVE_VIEW }), scope: {} }))
    expect(orphan).not.toContain(zh['recall.rateHint'])
  })

  it('shows the mark a human already put, and never invents one', () => {
    const rated = {
      rev: 1,
      sessionId: SESSION,
      count: 2,
      items: [
        { ...ITEM, rating: 4 },
        { id: 'm3', type: 'work_fact', title: '已判过时的条目', priority: 70, rating: -1 },
      ],
    }
    const markup = renderSection(ctxWith({ [MEMORY_RECALL_KEY]: rated }))
    expect(markup).toContain(zh['recall.rated'].replace('{count}', '4'))
    expect(markup).toContain(zh['recall.obsoleted'])
    // The unrated render must not show any mark text at all.
    const plain = renderSection(ctxWith({ [MEMORY_RECALL_KEY]: LIVE_VIEW }))
    expect(plain).not.toContain(zh['recall.rated'].replace('{count}', '0'))
    expect(plain).not.toContain(zh['recall.obsoleted'])
  })

  it('readRecall drops a rating outside the -1..5 domain instead of trusting it', () => {
    const view = readRecall({
      rev: 1,
      sessionId: SESSION,
      count: 3,
      items: [
        { ...ITEM, rating: 9 },
        { ...ITEM, id: 'm2', rating: 'high' },
        { ...ITEM, id: 'm3', rating: 3 },
      ],
    })
    expect(view?.items[0]?.rating).toBeUndefined()
    expect(view?.items[1]?.rating).toBeUndefined()
    expect(view?.items[2]?.rating).toBe(3)
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

describe('RatingStrip (the control a selected row gets)', () => {
  const strip = (over: Partial<ComponentProps<typeof RatingStrip>> = {}): string =>
    renderToStaticMarkup(createElement(RatingStrip, {
      current: undefined,
      pending: false,
      armed: false,
      obsoleteLabel: zh['recall.obsolete'],
      confirmLabel: zh['recall.obsoleteConfirm'],
      whyLabel: zh['recall.obsoleteWhy'],
      onScore: () => {},
      ...over,
    } as ComponentProps<typeof RatingStrip>))

  it('offers -1 plus 0..5, seven controls, no more and no less', () => {
    const markup = strip()
    expect(markup.match(/<button/g)).toHaveLength(7)
    for (const n of ['0', '1', '2', '3', '4', '5']) expect(markup).toContain(`>${n}</button>`)
    expect(markup).toContain(zh['recall.obsolete'])
  })

  it('the destructive one explains itself before it arms, and asks after', () => {
    expect(strip()).toContain(zh['recall.obsoleteWhy'])
    expect(strip()).not.toContain(zh['recall.obsoleteConfirm'])
    expect(strip({ armed: true })).toContain(zh['recall.obsoleteConfirm'])
  })

  it('the current mark comes back pressed; -1 never looks like a score of zero', () => {
    expect(strip({ current: 3 })).toContain('aria-pressed="true"')
    expect(strip({ current: 0 })).toContain('aria-pressed="true"')
    expect(strip()).not.toContain('aria-pressed="true"')
  })

  it('a pending write disables every control (no double-submit on one row)', () => {
    expect(strip({ pending: true }).match(/disabled=""/g)).toHaveLength(7)
  })
})
