/**
 * The spirit-echo tab: read-side narrowing + what a reader actually sees.
 *
 * Contracts worth pinning after the v0.8.3 source switch:
 * - `undefined` = capability absent (spirit not composed) → nothing painted;
 * - `segments: []` = honest empty state (a fresh session recalled nothing yet);
 * - the list is **this session's recalled passages** (durable), never a gate log;
 * - `星图 →` / `条目 →` ride the same deep-link event with different targets, and a
 *   refused ack lands as readable copy instead of a dead click.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Context } from '@deepseek-ai/cordis'
import { readSpiritEcho, SPIRIT_ECHO_KEY } from '../src/client/spirit-echo'
import { SpiritEchoSection } from '../src/client/summary/SpiritEchoSection'
import { SPIRIT_OPEN_EVENT } from '../src/client/spirit-open'
import { setOpenTab } from '../src/client/memory-tab'
import { zh } from '../src/client/locales'

const t = (key: string): string => (zh as Record<string, string>)[key] ?? key
const SESSION = 'session-1'

const SEGMENT = { excerpt: '那次在机房调端口，最后发现是网关挡住', firstTs: 1_700_000_000_000, lastTs: 1_700_000_900_000, times: 2 }
const STEP = { id: 'echo-1700000900000', at: 1_700_000_900_000, kind: 'injected' as const, reason: 'injected', preview: '状态：平常 · 线程：plugin-9lang' }
const VIEW = {
  token: 3_000_002,
  total: 8,
  segments: [SEGMENT],
  steps: [STEP],
  lastStep: STEP,
}

/** Projection context answering stable references (useSyncExternalStore). */
function ctxWith(values: Record<string, unknown>): Context {
  const faces = new Map<string, unknown>()
  const faceFor = (key: string): unknown => {
    if (!faces.has(key)) faces.set(key, { getSnapshot: () => values[key], subscribe: () => () => {} })
    return faces.get(key)
  }
  const binding = { session: { projections: { faceOf: (key: string) => faceFor(key) } } }
  const sessions = { binding: (id: string) => (id === SESSION ? binding : undefined) }
  return { get: (name: string) => (name === 'sessions' ? sessions : undefined) } as unknown as Context
}

function renderSection(values: Record<string, unknown>): string {
  return renderToStaticMarkup(
    createElement(SpiritEchoSection, { t, ctx: ctxWith(values), scope: { sessionId: SESSION } }),
  )
}

describe('readSpiritEcho narrowing', () => {
  it('absent or malformed-beyond-repair values narrow to undefined', () => {
    for (const raw of [undefined, null, 'nonsense', 42, [], {}, { token: 1 }, { token: -1, total: 0, segments: [] }]) {
      expect(readSpiritEcho(raw)).toBeUndefined()
    }
  })

  it('an empty segment list IS the empty state, not an absence', () => {
    expect(readSpiritEcho({ token: 1, total: 0, segments: [], steps: [] })).toEqual({ token: 1, total: 0, segments: [], steps: [] })
  })

  it('drops malformed segments, keeps well-formed ones, keeps lastStep when valid', () => {
    const view = readSpiritEcho({
      token: 9,
      total: 3,
      segments: [
        { excerpt: '一段', firstTs: 1, lastTs: 2, times: 1 },
        { excerpt: '', firstTs: 1, lastTs: 2, times: 1 },
        { excerpt: '缺字段' },
        'nope',
      ],
      lastStep: { at: 5, kind: 'skipped', reason: 'unchanged', preview: '' },
      steps: [{ at: 5, kind: 'skipped', reason: 'unchanged', preview: '' }, { at: 1, kind: 'other' }],
    })
    expect(view?.segments).toHaveLength(1)
    expect(view?.segments[0]).toEqual({ excerpt: '一段', firstTs: 1, lastTs: 2, times: 1 })
    expect(view?.steps).toEqual([{ id: 'echo-5', at: 5, kind: 'skipped', reason: 'unchanged', preview: '' }])
    expect(view?.lastStep).toEqual({ id: 'echo-5', at: 5, kind: 'skipped', reason: 'unchanged', preview: '' })
  })

  it('drops a bad lastStep without dropping the whole view', () => {
    const view = readSpiritEcho({
      token: 1,
      total: 0,
      segments: [],
      steps: [],
      lastStep: { at: 1, kind: 'other', reason: '' },
    })
    expect(view).toEqual({ token: 1, total: 0, segments: [], steps: [] })
  })
})

describe('SpiritEchoSection rendering', () => {
  it('renders nothing when the capability is absent', () => {
    expect(renderSection({})).toBe('')
  })

  it('空态（本会话还没跑过轮）文案 + 仍保留两个跳转', () => {
    const html = renderSection({ [SPIRIT_ECHO_KEY]: { token: 0, total: 0, segments: [], steps: [] } })
    expect(html).toContain(zh['echo.empty'])
    expect(html).toContain(zh['echo.emptyHint'])
    expect(html).toContain('data-dsh-brief-sidebar="spirit-echo-goto"')
    expect(html).toContain('data-dsh-brief-sidebar="spirit-echo-goto-graph"')
  })

  it('渲染条目列表：条数 + 注入摘要 + 想起一行 + 两个跳转', () => {
    const html = renderSection({ [SPIRIT_ECHO_KEY]: VIEW })
    expect(html).toContain('本会话 1 条回响')
    expect(html).toContain(STEP.preview)
    expect(html).toContain(SEGMENT.excerpt)
    expect(html).toContain(zh['echo.goto'])
    expect(html).toContain(zh['echo.gotoGraph'])
  })

  it('行文字内容优先：有 title 用 title（如线程任务名），不再显示 echo-<ts>', () => {
    const titled = { ...STEP, title: 'plugin-9lang-five-dim' }
    const html = renderSection({ [SPIRIT_ECHO_KEY]: { token: 1, total: 0, segments: [], steps: [titled], lastStep: titled } })
    expect(html).toContain('plugin-9lang-five-dim')
    // 用户实报：以前侧栏拿 `echo-…127843` 当条目名，现在不得出现那个短编号
    expect(html).not.toContain('echo-…')
  })

  it('老帧没有 title 时退回 preview（不编造内容名）', () => {
    const html = renderSection({ [SPIRIT_ECHO_KEY]: { token: 1, total: 0, segments: [], steps: [STEP], lastStep: STEP } })
    expect(html).toContain('状态：平常')
    expect(html).not.toContain('echo-…')
  })

  it('records 行（v7）：标题=内容、副行带 echo 短号+记录时间+×N', () => {
    const records = [{
      echoId: 'echo-3f9a2b7c-1d4e-4a5b-8c9d-0e1f2a3b4c5d',
      sessionId: SESSION,
      kind: 'task',
      memId: 'task-a',
      title: 'plugin-9lang-five-dim',
      times: 3,
      recordTs: 1_700_000_000_000,
      firstTs: 1_700_000_100_000,
      lastTs: 1_700_000_900_000,
      lastRecallId: 'recall-9f8e7d6c-5b4a-4321-8765-0a1b2c3d4e5f',
    }]
    const html = renderSection({ [SPIRIT_ECHO_KEY]: { token: 1, total: 1, segments: [], steps: [], records } })
    expect(html).toContain('plugin-9lang-five-dim')
    // 副行：echo 短号 + 记录时间 + 次数
    expect(html).toContain('echo-3f9a2b7c1d4e')
    expect(html).toContain('×3')
    // 不再出现旧版短编号 `echo-…127843`
    expect(html).not.toContain('echo-…')
    // 全 UUID 只进 tooltip
    expect(html).toContain('title="echo-3f9a2b7c-1d4e-4a5b-8c9d-0e1f2a3b4c5d"')
    // 「最近」行也以记录为准（title + echo 短号）
    expect(html).toContain(`${zh['echo.latest']}plugin-9lang-five-dim · echo-3f9a2b7c1d4e`)
  })

  it('records 为空数组时退回 steps 行为（不伪装新形状）', () => {
    const html = renderSection({ [SPIRIT_ECHO_KEY]: { token: 1, total: 0, segments: [], steps: [{ ...STEP, title: 'plugin-9lang-five-dim' }] } })
    expect(html).toContain('plugin-9lang-five-dim')
  })

  it('跳过不逐条列：只给「另有 N 轮未注入（门名）」汇总', () => {
    const html = renderSection({
      [SPIRIT_ECHO_KEY]: {
        token: 2,
        total: 0,
        segments: [],
        steps: [
          { id: 'echo-10', at: 10, kind: 'skipped', reason: 'unchanged', preview: '' },
          { id: 'echo-9', at: 9, kind: 'skipped', reason: 'no-new-user', preview: '' },
        ],
      },
    })
    expect(html).toContain('另有 2 轮未注入')
    expect(html).toContain('unchanged')
    expect(html).toContain('no-new-user')
    // 跳过行不能冒充成一条回响。
    expect(html).toContain(zh['echo.empty'])
  })

  it('没有摘要的旧版注入行不占位置', () => {
    const html = renderSection({
      [SPIRIT_ECHO_KEY]: {
        token: 2,
        total: 0,
        segments: [],
        steps: [{ id: 'echo-10', at: 10, kind: 'injected', reason: 'injected', preview: '' }],
      },
    })
    expect(html).toContain(zh['echo.empty'])
    expect(html).not.toContain(zh['echo.injectedEmpty'])
  })

  it('旧版未清洗的摘要（<system-reminder> 开头）也能剥成一句', () => {
    const html = renderSection({
      [SPIRIT_ECHO_KEY]: {
        token: 1,
        total: 0,
        segments: [],
        steps: [
          {
            id: 'echo-1',
            at: 1,
            kind: 'injected',
            reason: 'injected',
            preview: '<system-reminder> （角色体验快照 · 取代先前快照） 以下是角色自己的体验记录：不是客观事实 状态：平常 · 线程：plugin-9lang',
          },
        ],
      },
    })
    expect(html).not.toContain('system-reminder')
    expect(html).toContain('状态：平常')
  })

  it('注入行被 5 条跳过挤出 steps 时，从 lastStep 兑回来（不报假空态）', () => {
    const html = renderSection({
      [SPIRIT_ECHO_KEY]: {
        token: 6,
        total: 0,
        segments: [],
        steps: [
          { id: 'echo-6', at: 6, kind: 'skipped', reason: 'no-new-user', preview: '' },
          { id: 'echo-5', at: 5, kind: 'skipped', reason: 'no-new-user', preview: '' },
          { id: 'echo-4', at: 4, kind: 'skipped', reason: 'unchanged', preview: '' },
          { id: 'echo-3', at: 3, kind: 'skipped', reason: 'no-new-user', preview: '' },
          { id: 'echo-2', at: 2, kind: 'skipped', reason: 'unchanged', preview: '' },
        ],
        lastStep: { id: 'echo-1', at: 1, kind: 'injected', reason: 'injected', preview: '状态：平常 · 线程：plugin-9lang' },
      },
    })
    expect(html).not.toContain(zh['echo.empty'])
    expect(html).toContain('状态：平常')
  })

  it('truncates a very long passage so the sidebar stays one line', () => {
    const long = '很'.repeat(200)
    const html = renderSection({
      [SPIRIT_ECHO_KEY]: {
        token: 1,
        total: 1,
        segments: [{ excerpt: long, firstTs: 1, lastTs: 1, times: 1 }],
        steps: [{ id: 'echo-1', at: 1, kind: 'injected', reason: 'injected', preview: long }],
      },
    })
    expect(html).toContain('…')
  })
})

describe('SpiritEchoSection 深链', () => {
  let host: HTMLDivElement
  let root: Root
  let seen: Array<Record<string, unknown>>

  function listen(answer: (detail: Record<string, unknown>, event: Event) => void): () => void {
    const onOpen = (event: Event): void => {
      const detail = (event as CustomEvent<Record<string, unknown>>).detail
      seen.push(detail)
      answer(detail, event)
    }
    window.addEventListener(SPIRIT_OPEN_EVENT, onOpen)
    return () => { window.removeEventListener(SPIRIT_OPEN_EVENT, onOpen) }
  }

  beforeEach(() => {
    (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    seen = []
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    act(() => {
      root.render(createElement(SpiritEchoSection, { t, ctx: ctxWith({ [SPIRIT_ECHO_KEY]: VIEW }), scope: { sessionId: SESSION } }))
    })
  })

  afterEach(() => {
    act(() => { root.unmount() })
    host.remove()
  })

  const click = async (selector: string): Promise<void> => {
    const button = host.querySelector(selector)
    expect(button).not.toBeNull()
    await act(async () => {
      (button as Element).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })
  }

  it('点条目行 → 打开回响原文查看器（path=sessionId|id）', async () => {
    const seeds: Array<{ type: string; path?: string }> = []
    setOpenTab((seed) => { seeds.push(seed) })
    await click('[data-dsh-brief-sidebar="spirit-echo-row-injected"]')
    expect(seeds).toHaveLength(1)
    expect(seeds[0]).toMatchObject({ type: 'dsh-md-echo-viewer:echo', path: `${SESSION}|${STEP.id}` })
  })

  it('「条目 →」派发 target=echo 深链；成功时无降级文案', async () => {
    const off = listen((_detail, event) => { event.preventDefault() })
    await click('[data-dsh-brief-sidebar="spirit-echo-goto"]')
    expect(seen).toHaveLength(1)
    expect(seen[0]).toMatchObject({ target: 'echo' })
    expect(host.textContent).not.toContain(zh['echo.gotoFail'])
    off()
  })

  it('「星图 →」派发 target=graph 深链', async () => {
    const off = listen((_detail, event) => { event.preventDefault() })
    await click('[data-dsh-brief-sidebar="spirit-echo-goto-graph"]')
    expect(seen).toHaveLength(1)
    expect(seen[0]).toMatchObject({ target: 'graph' })
    off()
  })

  it('行内选单：展开后有原文 / 条目 / 星图三项（与 memory 行同款）', async () => {
    await click('[data-dsh-brief-sidebar="echo-view-row-menu"] > button')
    expect(host.querySelector('[data-dsh-brief-sidebar="echo-view-original"]')).not.toBeNull()
    expect(host.querySelector('[data-dsh-brief-sidebar="echo-view-entry"]')).not.toBeNull()
    expect(host.querySelector('[data-dsh-brief-sidebar="echo-view-graph"]')).not.toBeNull()
  })

  it('行内选单「星图」→ 派发 target=graph 深链', async () => {
    const off = listen((_detail, event) => { event.preventDefault() })
    await click('[data-dsh-brief-sidebar="echo-view-row-menu"] > button')
    await click('[data-dsh-brief-sidebar="echo-view-graph"]')
    expect(seen).toHaveLength(1)
    expect(seen[0]).toMatchObject({ target: 'graph' })
    off()
  })

  it('行内选单「条目」→ 派发 target=echo 深链', async () => {
    const off = listen((_detail, event) => { event.preventDefault() })
    await click('[data-dsh-brief-sidebar="echo-view-row-menu"] > button')
    await click('[data-dsh-brief-sidebar="echo-view-entry"]')
    expect(seen).toHaveLength(1)
    expect(seen[0]).toMatchObject({ target: 'echo' })
    off()
  })

  it('行内选单「原文」→ 打开本行对应的查看器', async () => {
    const seeds: Array<{ type: string; path?: string }> = []
    setOpenTab((seed) => { seeds.push(seed) })
    await click('[data-dsh-brief-sidebar="echo-view-row-menu"] > button')
    await click('[data-dsh-brief-sidebar="echo-view-original"]')
    expect(seeds).toHaveLength(1)
    expect(seeds[0]).toMatchObject({ type: 'dsh-md-echo-viewer:echo', path: `${SESSION}|${STEP.id}` })
  })

  it('回执失败时给出降级文案（不是死按钮）', async () => {
    const off = listen((detail) => { detail['ack'] = { ok: false, reason: 'unmounted' } })
    await click('[data-dsh-brief-sidebar="spirit-echo-goto"]')
    expect(host.textContent).toContain(zh['echo.gotoFail'])
    expect(host.textContent).toContain('unmounted')
    off()
  })
})
