/**
 * Rendered-output contract of the memory-slots section.
 *
 * The pure-function tests cover the narrowing; this file covers what a reader
 * actually sees, and in particular the gating — the feature that makes this
 * section optional twice over:
 *
 * - the switch OFF must will the section away even while the projection is
 *   live (an empty state would claim prime-memory answered when the user
 *   closed the section);
 * - the switch DEFAULT (configForms absent or unavailable) is ON — a host
 *   without the config seam must not lose the section;
 * - the projection ABSENT must hide the section entirely, like the optional
 *   deliverables section.
 *
 * Rendering goes through `react-dom/server` on purpose (same harness as
 * `summary.spec.tsx`): the section is a plain function of its props, so a
 * static render proves the output without a DOM test harness.
 */
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Context } from '@deepseek-ai/cordis'
import { MemorySlotsSection } from '../src/client/summary/MemorySlotsSection'
import { MEMORY_SLOTS_KEY } from '../src/client/summary/memory-slots'
import { SummaryTab } from '../src/client/SummaryTab'
import { DELIVERABLES_KEY } from '../src/projection/keys'
import { zh as zhDict } from '../src/client/locales'
import { zh } from '../src/client/locales'
import type { BriefClientConfig } from '../src/client/scope-face'

/** A translate stub backed by the REAL shipped dictionary. */
const t = (key: string): string => (zh as Record<string, string>)[key] ?? key

/** The session id every fixture is scoped to. */
const SESSION = 'session-1'

/** One well-formed open slot (the wire minimum). */
const OPEN_SLOT = { id: 's1', title: '永远是中文回复', kind: 'rule', status: 'open', priority: 90 }
/** One well-formed settled slot. */
const DONE_SLOT = { id: 's2', title: '旧锚点', kind: 'anchor', status: 'done', priority: 10 }

/** A configForms scope snapshot fixture. */
function scopeFixture(value: BriefClientConfig | undefined, status: 'ready' | 'unavailable' = 'ready') {
  return {
    getSnapshot: () => ({ status, value, revision: 1, writable: true }),
    subscribe: () => () => {},
    set: async () => true,
    unset: async () => true,
  }
}

/**
 * A context whose `sessions` service resolves the given raw projection values
 * by key and whose `configForms` service serves the given config snapshot.
 */
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

/** Render the section standalone with the standard fixture wiring. */
function renderSection(ctx: Context): string {
  return renderToStaticMarkup(
    createElement(MemorySlotsSection, { t, ctx, scope: { sessionId: SESSION } }),
  )
}

/** Render the whole summary tab (the section is its third child). */
function renderTab(ctx: Context): string {
  return renderToStaticMarkup(
    createElement(SummaryTab, { t, ctx, scope: { sessionId: SESSION } }),
  )
}

describe('MemorySlotsSection gating', () => {
  it('renders nothing while the switch is off, even with a live view', () => {
    const ctx = ctxWith(
      { [MEMORY_SLOTS_KEY]: { rev: 1, count: 1, openCount: 1, slots: [OPEN_SLOT] } },
      { value: { showMemorySlots: false } },
    )
    expect(renderSection(ctx)).toBe('')
  })

  it('renders nothing when the projection is absent, switch notwithstanding', () => {
    expect(renderSection(ctxWith({}))).toBe('')
    expect(renderSection(ctxWith({ [MEMORY_SLOTS_KEY]: 'nonsense' }))).toBe('')
  })

  it('defaults to on when configForms is absent or unavailable', () => {
    const view = { rev: 1, count: 1, openCount: 1, slots: [OPEN_SLOT] }
    const absent = ctxWith({ [MEMORY_SLOTS_KEY]: view }, { present: false })
    expect(renderSection(absent)).toContain(OPEN_SLOT.title)
    const unavailable = ctxWith({ [MEMORY_SLOTS_KEY]: view }, { status: 'unavailable' })
    expect(renderSection(unavailable)).toContain(OPEN_SLOT.title)
  })

  it('shows the empty state (not the list) when no slot is active', () => {
    const ctx = ctxWith({ [MEMORY_SLOTS_KEY]: { rev: 1, count: 0, openCount: 0, slots: [] } })
    const markup = renderSection(ctx)
    expect(markup).toContain(zh['slots.empty'])
    expect(markup).toContain(zh['slots.emptyHint'])
    expect(markup).not.toContain(OPEN_SLOT.title)
  })
})

describe('MemorySlotsSection rendering', () => {
  it('renders title, kind pill, status label, priority and the open-count footer', () => {
    const ctx = ctxWith({
      [MEMORY_SLOTS_KEY]: { rev: 5, count: 2, openCount: 1, slots: [OPEN_SLOT, DONE_SLOT] },
    })
    const markup = renderSection(ctx)
    expect(markup).toContain(zh['section.memorySlots'])
    expect(markup).toContain('永远是中文回复')
    expect(markup).toContain('rule')
    expect(markup).toContain(zh['slots.status.open'])
    expect(markup).toContain(zh['slots.status.done'])
    expect(markup).toContain('P90')
    expect(markup).toContain('旧锚点')
    expect(markup).toContain(zh['slots.openCount'].replace('{count}', '1'))
  })

  it('truncates a long body to one line and keeps the full text on the tooltip', () => {
    const body = '很长的记忆正文'.repeat(40)
    const ctx = ctxWith({
      [MEMORY_SLOTS_KEY]: {
        rev: 1,
        count: 1,
        openCount: 1,
        slots: [{ ...OPEN_SLOT, body }],
      },
    })
    const markup = renderSection(ctx)
    expect(markup).toContain('…')
    expect(markup).toContain(`title="${OPEN_SLOT.title} — ${body}"`)
    // The tooltip (full body) is the row's first element; the truncated line
    // with the ellipsis paints after it.
    expect(markup.indexOf('…')).toBeGreaterThan(markup.indexOf(`title=`))
  })

  it('renders refs joined when the wire view carries them', () => {
    const ctx = ctxWith({
      [MEMORY_SLOTS_KEY]: {
        rev: 1,
        count: 1,
        openCount: 1,
        slots: [{ ...OPEN_SLOT, refs: ['notes/a.md', 'notes/b.md'] }],
      },
    })
    expect(renderSection(ctx)).toContain('notes/a.md · notes/b.md')
  })

  it('prefers resolved refViews for the refs line and keeps raw refs on the tooltip', () => {
    const ctx = ctxWith({
      [MEMORY_SLOTS_KEY]: {
        rev: 2,
        count: 1,
        openCount: 1,
        slots: [
          {
            ...OPEN_SLOT,
            refs: ['mem_abc', 'notes/a.md'],
            refViews: [{ ref: 'mem_abc', title: '[work_fact] 回复永远是中文' }],
          },
        ],
      },
    })
    const markup = renderSection(ctx)
    expect(markup).toContain('[work_fact] 回复永远是中文')
    expect(markup).not.toContain('mem_abc · notes/a.md')
    expect(markup).toContain('title="mem_abc\nnotes/a.md"')
  })

  it('appears as the third section of the summary tab', () => {
    const ctx = ctxWith({
      // The deliverables section hides when its projection is absent, so the
      // ordering fixture must carry a live (all-empty) deliverables view too.
      [DELIVERABLES_KEY]: { latest: null, sessionPaths: [], sessionTotal: 0 },
      [MEMORY_SLOTS_KEY]: { rev: 1, count: 1, openCount: 1, slots: [OPEN_SLOT] },
    })
    const markup = renderTab(ctx)
    const memory = markup.indexOf('data-dsh-brief-sidebar="memory-slots-section"')
    const deliverables = markup.indexOf('data-dsh-brief-sidebar="deliverables-section"')
    expect(deliverables).toBeGreaterThan(-1)
    expect(memory).toBeGreaterThan(deliverables)
  })
})

describe('产物分层(0.5.0-beta.3)', () => {
  const manyPaths = Array.from({ length: 6 }, (_, i) => 'E:/w/file' + i + '.md')

  it('默认只显示活跃文件,历史收在开关行后(计数=去重后的更早改动)', () => {
    const ctx = ctxWith({
      [DELIVERABLES_KEY]: { latest: { turn: 3, paths: ['E:/w/new.md'] }, sessionPaths: ['E:/w/new.md', ...manyPaths], sessionTotal: 7 },
    })
    const markup = renderTab(ctx)
    expect(markup).toContain(zhDict['deliverables.history'].replace('{count}', '6'))
    expect(markup).toContain('new.md')
    expect(markup).not.toContain('file1.md') // 折叠区默认不渲染历史路径
  })

  it('无更早改动时不出现开关行', () => {
    const ctx = ctxWith({
      [DELIVERABLES_KEY]: { latest: { turn: 3, paths: ['E:/w/new.md'] }, sessionPaths: ['E:/w/new.md'], sessionTotal: 1 },
    })
    expect(renderTab(ctx)).not.toContain(zhDict['deliverables.history'].replace('{count}', '0'))
  })
});
