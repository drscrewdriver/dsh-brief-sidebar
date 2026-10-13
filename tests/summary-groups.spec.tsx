/**
 * 分组显示断言：产物分「本回合 / 更早改动（全历史）」，记忆分「活跃召回 / 其余历史召回」。
 *
 * 三条契约都在这里钉住：
 * 1. 两组各有自己的计数标题，读者不用猜哪一段是当前 turn；
 * 2. 历史组默认折叠——静态渲染不得出现被折叠的行（既有测试也依赖这点）；
 * 3. 展开后历史行出现，且被取代的召回带自身标记（不靠"看起来灰一点"表达语义）。
 * 另有一条诚实性断言：列表有上限时，标题里的数量必须与"会话真数"区分开。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Context } from '@deepseek-ai/cordis'
import { DeliverablesSection } from '../src/client/summary/DeliverablesSection'
import { MemoryRecallSection } from '../src/client/summary/MemoryRecallSection'
import { MEMORY_RECALL_KEY } from '../src/client/summary/memory-recall'
import { DELIVERABLES_KEY } from '../src/projection/keys'
import { zh } from '../src/client/locales'

const SESSION = 'sess-groups'

/** The locale lookup the tab passes down: dictionary hit, key fallback. */
const t = (key: string): string => (zh as Record<string, string>)[key] ?? key

/** Interpolate a dictionary template the way the section does. */
function label(key: string, count: number | string): string {
  return (zh as Record<string, string>)[key].replace('{count}', String(count))
}

function labelTotal(key: string, total: number | string): string {
  return (zh as Record<string, string>)[key].replace('{total}', String(total))
}

/** A context serving projection faces; config stays unanswered (= default on). */
// The snapshot object must be referentially stable: `useConfigFlag` reads it
// through `useSyncExternalStore`, and a fresh object per read is an infinite
// render loop, not a config answer.
const UNREACHABLE_CONFIG = { status: 'unavailable', value: undefined, revision: 1, writable: true }

function ctxWith(values: Record<string, unknown>): Context {
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
  const configForms = {
    get: () => ({
      getSnapshot: () => UNREACHABLE_CONFIG,
      subscribe: () => () => {},
      set: async () => true,
      unset: async () => true,
    }),
  }
  return {
    get: (name: string) => (name === 'sessions' ? sessions : name === 'configForms' ? configForms : undefined),
  } as unknown as Context
}

const DELIVERABLES = {
  latest: { turn: 3, paths: ['now.md'] },
  sessionPaths: ['now.md', 'old-a.md', 'old-b.md'],
  sessionTotal: 3,
}

describe('DeliverablesSection turn/history grouping', () => {
  it('labels the current turn group with its own count', () => {
    const markup = renderToStaticMarkup(
      createElement(DeliverablesSection, { t, ctx: ctxWith({ [DELIVERABLES_KEY]: DELIVERABLES }), scope: { sessionId: SESSION } }),
    )
    expect(markup).toContain(label('deliverables.currentTurn', 1))
    expect(markup).toContain('now.md')
  })

  it('labels the earlier-change group and keeps its rows collapsed by default', () => {
    const markup = renderToStaticMarkup(
      createElement(DeliverablesSection, { t, ctx: ctxWith({ [DELIVERABLES_KEY]: DELIVERABLES }), scope: { sessionId: SESSION } }),
    )
    expect(markup).toContain(label('deliverables.history', 2))
    expect(markup).not.toContain('old-a.md')
  })

  it('reveals the collapsed paths when the group is opened', () => {
    let root: Root | undefined
    const host = document.createElement('div')
    document.body.append(host)
    try {
      act(() => {
        root = createRoot(host)
        root.render(createElement(DeliverablesSection, {
          t,
          ctx: ctxWith({ [DELIVERABLES_KEY]: DELIVERABLES }),
          scope: { sessionId: SESSION },
        }))
      })
      const toggle = host.querySelector('[data-dsh-brief-sidebar="deliverables-history-toggle"]')
      expect(toggle).not.toBeNull()
      expect(host.textContent).not.toContain('old-a.md')
      act(() => {
        toggle?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      })
      expect(host.textContent).toContain('old-a.md')
      expect(host.textContent).toContain('old-b.md')
    } finally {
      act(() => { root?.unmount() })
      host.remove()
    }
  })

  it('separates the capped list length from the real session total', () => {
    const capped = {
      latest: { turn: 9, paths: ['now.md'] },
      sessionPaths: ['now.md', 'a.md', 'b.md'],
      sessionTotal: 140,
    }
    const markup = renderToStaticMarkup(
      createElement(DeliverablesSection, { t, ctx: ctxWith({ [DELIVERABLES_KEY]: capped }), scope: { sessionId: SESSION } }),
    )
    expect(markup).toContain(label('deliverables.history', 2))
    expect(markup).toContain(labelTotal('deliverables.historyCapped', 140))
  })

  it('says nothing about a cap when the list holds everything', () => {
    const markup = renderToStaticMarkup(
      createElement(DeliverablesSection, { t, ctx: ctxWith({ [DELIVERABLES_KEY]: DELIVERABLES }), scope: { sessionId: SESSION } }),
    )
    expect(markup).not.toContain((zh as Record<string, string>)['deliverables.historyCapped'])
  })

  it('draws no history group when the turn produced everything', () => {
    const allActive = {
      latest: { turn: 4, paths: ['x.md', 'y.md'] },
      sessionPaths: ['x.md', 'y.md'],
      sessionTotal: 2,
    }
    const markup = renderToStaticMarkup(
      createElement(DeliverablesSection, { t, ctx: ctxWith({ [DELIVERABLES_KEY]: allActive }), scope: { sessionId: SESSION } }),
    )
    expect(markup).not.toContain((zh as Record<string, string>)['deliverables.history'].split('·')[0])
  })
})

const RECALL = {
  rev: 4,
  sessionId: SESSION,
  count: 3,
  items: [
    { id: 'm1', type: 'work_fact', title: '仍在上下文的召回', priority: 80 },
    { id: 'm2', type: 'work_method', title: '被摘要取代的召回', priority: 60, superseded: true },
    { id: 'm3', type: 'episodic', title: '另一条活跃召回', priority: 50 },
  ],
}

describe('MemoryRecallSection active/history grouping', () => {
  it('labels the active group with the count of recalls still in context', () => {
    const markup = renderToStaticMarkup(
      createElement(MemoryRecallSection, { t, ctx: ctxWith({ [MEMORY_RECALL_KEY]: RECALL }), scope: { sessionId: SESSION } }),
    )
    expect(markup).toContain(label('recall.activeGroup', 2))
    expect(markup).toContain('仍在上下文的召回')
    expect(markup).toContain('另一条活跃召回')
  })

  it('keeps superseded rows out of the default view behind a counted group', () => {
    const markup = renderToStaticMarkup(
      createElement(MemoryRecallSection, { t, ctx: ctxWith({ [MEMORY_RECALL_KEY]: RECALL }), scope: { sessionId: SESSION } }),
    )
    expect(markup).toContain(label('recall.historyGroup', 1))
    expect(markup).not.toContain('被摘要取代的召回')
  })

  it('opens the historical group on demand and tags what left the context', () => {
    let root: Root | undefined
    const host = document.createElement('div')
    document.body.append(host)
    try {
      act(() => {
        root = createRoot(host)
        root.render(createElement(MemoryRecallSection, {
          t,
          ctx: ctxWith({ [MEMORY_RECALL_KEY]: RECALL }),
          scope: { sessionId: SESSION },
        }))
      })
      const toggle = host.querySelector('[data-dsh-brief-sidebar="recall-history-toggle"]')
      expect(toggle).not.toBeNull()
      expect(host.textContent).not.toContain('被摘要取代的召回')
      act(() => {
        toggle?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      })
      expect(host.textContent).toContain('被摘要取代的召回')
      expect(host.innerHTML).toContain((zh as Record<string, string>)['recall.supersededTag'])
      // 标记只属于被取代那一行：活跃行不得被连带染色说明。
      const tagged = host.querySelectorAll('[data-dsh-brief-sidebar="recall-superseded-tag"]')
      expect(tagged).toHaveLength(1)
    } finally {
      act(() => { root?.unmount() })
      host.remove()
    }
  })

  it('draws no historical group when nothing was superseded', () => {
    const live = { rev: 1, sessionId: SESSION, count: 2, items: RECALL.items.filter(i => i.superseded !== true) }
    const markup = renderToStaticMarkup(
      createElement(MemoryRecallSection, { t, ctx: ctxWith({ [MEMORY_RECALL_KEY]: live }), scope: { sessionId: SESSION } }),
    )
    expect(markup).not.toContain((zh as Record<string, string>)['recall.historyGroup'].split('·')[0])
  })

  it('still counts the whole injected set in the footer', () => {
    const markup = renderToStaticMarkup(
      createElement(MemoryRecallSection, { t, ctx: ctxWith({ [MEMORY_RECALL_KEY]: RECALL }), scope: { sessionId: SESSION } }),
    )
    expect(markup).toContain(label('recall.count', 3))
  })
})
