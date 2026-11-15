/**
 * 「详细展示 ▾」 under real clicks (jsdom + react-dom/client).
 *
 * The control is a cross-bundle deep link: it must send exactly one event with
 * the chosen mode and map the owner's synchronous refusal to readable copy.
 * A dead button (click → nothing, no explanation) is the failure mode this file
 * exists to prevent.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryViewMenu } from '../src/client/summary/MemoryViewMenu'
import { MEMORY_OPEN_EVENT } from '../src/client/memory-open'
import { setOpenTab } from '../src/client/memory-tab'
import { zh } from '../src/client/locales'

const t = (key: string): string => (zh as Record<string, string>)[key] ?? key

let host: HTMLDivElement
let root: Root
let seen: Array<Record<string, unknown>>
let offListener: (() => void) | undefined

/** Answer every open request like the panel owner would. */
function answerWith(answer: (detail: Record<string, unknown>, event: Event) => void): void {
  const onOpen = (event: Event): void => {
    const detail = (event as CustomEvent<Record<string, unknown>>).detail
    seen.push(detail)
    answer(detail, event)
  }
  window.addEventListener(MEMORY_OPEN_EVENT, onOpen)
  offListener = () => { window.removeEventListener(MEMORY_OPEN_EVENT, onOpen) }
}

function mount(recordId?: string): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => { root.render(createElement(MemoryViewMenu, { t, ...(recordId === undefined ? {} : { recordId }) })) })
}

function trigger(): HTMLButtonElement {
  const button = Array.from(host.querySelectorAll('button'))
    .find(b => (b.textContent ?? '').includes(zh['memoryView.button']))
  expect(button, '详细展示按钮不存在').toBeTruthy()
  return button as HTMLButtonElement
}

function item(mode: 'entry' | '2d' | '3d'): Element | null {
  return host.querySelector(`[data-dsh-brief-sidebar="memory-view-${mode}"]`)
}

async function press(el: Element | null | undefined): Promise<void> {
  expect(el, '目标元素不存在').toBeTruthy()
  await act(async () => {
    (el as Element).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  })
}

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  seen = []
  mount()
})

afterEach(() => {
  offListener?.()
  offListener = undefined
  act(() => { root.unmount() })
  host.remove()
})

describe('MemoryViewMenu', () => {
  it('默认收起；点按钮展开三项（条目 / 2D / 3D）', async () => {
    expect(item('entry')).toBeNull()
    expect(trigger().getAttribute('aria-expanded')).toBe('false')
    await press(trigger())
    expect(trigger().getAttribute('aria-expanded')).toBe('true')
    expect(item('entry')?.textContent).toBe(zh['memoryView.entry'])
    expect(item('2d')?.textContent).toBe(zh['memoryView.graph2d'])
    expect(item('3d')?.textContent).toBe(zh['memoryView.graph3d'])
  })

  it('三项各自派发对应 mode 的深链事件，成功后收起', async () => {
    answerWith((_detail, event) => { event.preventDefault() })
    for (const mode of ['entry', '2d', '3d'] as const) {
      await press(trigger())
      await press(item(mode))
    }
    expect(seen.map(detail => detail['mode'])).toEqual(['entry', '2d', '3d'])
    expect(seen.every(detail => detail['recordId'] === undefined)).toBe(true)
    expect(item('entry')).toBeNull()
    expect(host.textContent).not.toContain(zh['memoryView.failDisabled'])
  })

  it('回执 disabled 时给出「入口已关闭」文案', async () => {
    answerWith((detail) => { detail['ack'] = { ok: false, reason: 'disabled' } })
    await press(trigger())
    await press(item('2d'))
    expect(host.textContent).toContain(zh['memoryView.failDisabled'])
  })

  it('缺席（无人监听）时给出不可用文案', async () => {
    // No listener at all: the event is neither acked nor prevented.
    await press(trigger())
    await press(item('3d'))
    expect(host.textContent).toContain(zh['memoryView.failAbsent'])
  })

  it('Escape 收起菜单', async () => {
    await press(trigger())
    expect(item('entry')).not.toBeNull()
    await act(async () => {
      trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(item('entry')).toBeNull()
  })

  it('点组件外部收起菜单', async () => {
    await press(trigger())
    expect(item('entry')).not.toBeNull()
    await act(async () => {
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    })
    expect(item('entry')).toBeNull()
  })

  it('带 recordId 时多一项「速览」：回到旧侧栏查看器，不派发深链', async () => {
    // Remount with a row id (the row-level menu).
    act(() => { root.unmount() })
    host.remove()
    mount('mem_1')
    const seeds: Array<{ type: string; path?: string }> = []
    setOpenTab((seed) => { seeds.push(seed) })
    await press(trigger())
    expect(host.querySelector('[data-dsh-brief-sidebar="memory-view-preview"]')?.textContent).toBe(zh['memoryView.preview'])
    await press(host.querySelector('[data-dsh-brief-sidebar="memory-view-preview"]'))
    expect(seeds).toHaveLength(1)
    expect(seeds[0]?.path).toBe('mem_1')
    expect(seen).toHaveLength(0)
  })
})
