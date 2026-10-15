/**
 * The recall section under REAL clicks (jsdom + react-dom/client).
 *
 * The static-render suite cannot see this class of bug at all: it only checks
 * what one frame looks like, never what a gesture does to the frame. This file
 * exists because of a shipped defect: the rating strip is rendered INSIDE the
 * row, the row's `onClick` toggles the selection, and the strip's buttons did
 * not stop propagation — so pressing `声明过时` deselected the row, unmounted
 * the strip, and the confirmation state was painted onto a node that was
 * already gone. The user saw a dead button: no confirm, no request, no strike.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { Context } from '@deepseek-ai/cordis'
import { MemoryRecallSection } from '../src/client/summary/MemoryRecallSection'
import { MEMORY_RECALL_KEY } from '../src/client/summary/memory-recall'
import type { FeedbackFetch } from '../src/client/summary/recall-feedback'
import { zh } from '../src/client/locales'

const t = (key: string): string => (zh as Record<string, string>)[key] ?? key
const SESSION = 'session-1'

const ITEM_A = { id: 'm1', type: 'work_fact', title: '上行必须走官方地址', priority: 80 }
const ITEM_B = { id: 'm2', type: 'work_task', title: '用户需将插件升级到 v2', priority: 90 }
const VIEW = { rev: 3, sessionId: SESSION, count: 2, items: [ITEM_A, ITEM_B] }

/**
 * A context whose faces answer with STABLE references.
 *
 * Both `useProjectionValue` and `useConfigFlag` sit on `useSyncExternalStore`,
 * which re-renders forever if `getSnapshot` hands back a fresh object each call
 * ("Maximum update depth exceeded"). Everything below is therefore built once
 * per mount and reused.
 */
function ctxWith(values: Record<string, unknown>): Context {
  const faces = new Map<string, unknown>()
  const faceFor = (key: string) => {
    if (!faces.has(key)) {
      faces.set(key, { getSnapshot: () => values[key], subscribe: () => () => {} })
    }
    return faces.get(key)
  }
  const binding = {
    session: {
      projections: { faceOf: (key: string) => faceFor(key) },
    },
  }
  const sessions = { binding: (id: string) => (id === SESSION ? binding : undefined) }
  const snapshot = { status: 'ready', value: undefined, revision: 1, writable: true }
  const scope = {
    getSnapshot: () => snapshot,
    subscribe: () => () => {},
    set: async () => true,
    unset: async () => true,
  }
  const configForms = { get: () => scope }
  return { get: (name: string) => (name === 'sessions' ? sessions : name === 'configForms' ? configForms : undefined) } as unknown as Context
}

/** One recorded rating request. */
interface Sent {
  body: { sessionId: string; id: string; score: number }
}

/** A transport that answers like a current prime-memory does. */
function transport(sent: Sent[], retired = true): FeedbackFetch {
  return async (_url: string, init: { body: string }) => {
    sent.push({ body: JSON.parse(init.body) as Sent['body'] })
    const score = sent[sent.length - 1].body.score
    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        value: {
          id: 'm1', score,
          rating: { last: score, rated: 1, mean: score < 0 ? 0 : score, obsolete: score === -1 ? 1 : 0 },
          retired: score === -1 ? retired : false,
          announced: false,
        },
      }),
    }
  }
}

let host: HTMLDivElement
let root: Root

function mount(fetchImpl: FeedbackFetch): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  const ctx = ctxWith({ [MEMORY_RECALL_KEY]: VIEW })
  act(() => {
    root.render(createElement(MemoryRecallSection, { t, ctx, scope: { sessionId: SESSION }, fetchImpl }))
  })
}

beforeEach(() => {
  // React 18 refuses `act` outside an act environment.
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(() => {
  act(() => { root.unmount() })
  host.remove()
})

/** Press something the way a pointer does: a bubbling click. */
async function press(el: Element | null | undefined): Promise<void> {
  expect(el, '目标元素不存在').toBeTruthy()
  await act(async () => {
    ;(el as Element).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  })
}

function rows(): HTMLLIElement[] {
  return Array.from(host.querySelectorAll('li'))
}

function buttons(scope: Element): HTMLButtonElement[] {
  return Array.from(scope.querySelectorAll('button'))
}

function buttonByText(scope: Element, text: string): HTMLButtonElement | undefined {
  return buttons(scope).find((b) => (b.textContent ?? '').trim() === text)
}

describe('选中一行才出打分条，且打分条不吃掉选中态', () => {
  it('点行 → 出打分条；打分条还在时行仍是选中态', async () => {
    const sent: Sent[] = []
    mount(transport(sent))
    expect(host.querySelector('[data-dsh-brief-sidebar="recall-rating-strip"]')).toBeNull()

    await press(rows()[0])
    const strip = host.querySelector('[data-dsh-brief-sidebar="recall-rating-strip"]')
    expect(strip).not.toBeNull()
    expect(buttons(strip as Element)).toHaveLength(8)
    // 第 8 枚是「查看详情」跳转，不属于打分档位。
    expect(buttonByText(strip as Element, zh['recall.viewDetail'])).toBeDefined()
  })

  it('点「查看详情」不发打分请求、也不把行取消选中（同 -1 那个 bug 的面）', async () => {
    const sent: Sent[] = []
    mount(transport(sent))
    await press(rows()[0])
    const view = buttonByText(host, zh['recall.viewDetail'])
    expect(view).toBeDefined()

    await press(view)
    expect(sent).toHaveLength(0)
    expect(host.querySelector('[data-dsh-brief-sidebar="recall-rating-strip"]')).not.toBeNull()
  })

  it('回归护栏：点 -1 不再把行取消选中（这条就是那个 bug）', async () => {
    const sent: Sent[] = []
    mount(transport(sent))
    await press(rows()[0])
    const obsolete = buttonByText(host, zh['recall.obsolete'])
    expect(obsolete).toBeDefined()

    await press(obsolete)
    // 打分条必须还在：它一消失就说明点击冒泡到行、选中被翻掉了。
    expect(host.querySelector('[data-dsh-brief-sidebar="recall-rating-strip"]')).not.toBeNull()
    // 而且必须已经变成二次确认那一枚，第一次点击绝不发请求。
    expect(buttonByText(host, zh['recall.obsoleteConfirm'])).toBeDefined()
    expect(sent).toHaveLength(0)
  })
})

describe('声明过时的完整一趟', () => {
  it('第二次点击才发 score=-1，成功后该行划删除线且不再给打分条', async () => {
    const sent: Sent[] = []
    mount(transport(sent))
    await press(rows()[0])
    await press(buttonByText(host, zh['recall.obsolete']))
    await press(buttonByText(host, zh['recall.obsoleteConfirm']))

    expect(sent).toHaveLength(1)
    expect(sent[0].body).toEqual({ sessionId: SESSION, id: 'm1', score: -1 })

    const first = rows()[0]
    expect(first.outerHTML).toContain('line-through')
    expect(first.textContent).toContain(zh['recall.obsoleted'])
    // 一条已判过时的记忆不该还能被继续标注。
    expect(first.querySelector('[data-dsh-brief-sidebar="recall-rating-strip"]')).toBeNull()
    // 条目留在列表里（文本仍在上下文，直到压缩）。
    expect(rows()).toHaveLength(2)
  })

  it('服务端没确认退场（retired=false）时也要划线：本地那一笔就是判过时的意思', async () => {
    const sent: Sent[] = []
    mount(transport(sent, false))
    await press(rows()[0])
    await press(buttonByText(host, zh['recall.obsolete']))
    await press(buttonByText(host, zh['recall.obsoleteConfirm']))
    expect(rows()[0].outerHTML).toContain('line-through')
  })
})

describe('0..5 的相关度标注', () => {
  it('点数字发对应分，且不吃掉选中态、不触发退场', async () => {
    const sent: Sent[] = []
    mount(transport(sent))
    await press(rows()[0])
    await press(buttonByText(host, '4'))

    expect(sent).toHaveLength(1)
    expect(sent[0].body.score).toBe(4)
    expect(host.querySelector('[data-dsh-brief-sidebar="recall-rating-strip"]')).toBeNull() // 打完分收起，符合原设计
    expect(rows()[0].textContent).toContain(zh['recall.rated'].replace('{count}', '4'))
    expect(rows()[0].outerHTML).not.toContain('line-through')
  })
})

describe('行本身仍是唯一的选中入口', () => {
  it('再点一次行文字 → 取消选中，打分条消失', async () => {
    const sent: Sent[] = []
    mount(transport(sent))
    await press(rows()[0])
    expect(host.querySelector('[data-dsh-brief-sidebar="recall-rating-strip"]')).not.toBeNull()
    await press(rows()[0].querySelector('span'))
    expect(host.querySelector('[data-dsh-brief-sidebar="recall-rating-strip"]')).toBeNull()
    expect(sent).toHaveLength(0)
  })
})
