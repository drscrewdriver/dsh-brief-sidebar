/**
 * 「引用」节：技能与记忆并列、可左右切换。
 *
 * 这里钉住的是三件容易做错的事：
 * 1. **父节与子节门控一致**——不能出现"点了就空的页签"，也不能两个能力都在时少一个页签；
 * 2. **未选中页保活**——记忆页带着人的操作状态（选中行、评分 pending、历史展开），
 *    切走必须只是"看不见"而不是"被重建"，所以断言它在 markup 里但被 hidden；
 * 3. **无能力即整节隐藏**，与空态区分开（技能投影存在但列表空 ≠ 节不存在）。
 */
import { describe, expect, it } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Context } from '@deepseek-ai/cordis'
import { ReferenceSection } from '../src/client/summary/ReferenceSection'
import { SKILL_USAGE_KEY } from '../src/projection/keys'
import { MEMORY_RECALL_KEY } from '../src/client/summary/memory-recall'
import { MEMORY_SLOTS_KEY } from '../src/client/summary/memory-slots'
import { zh } from '../src/client/locales'
import type { BriefClientConfig } from '../src/client/scope-face'

const SESSION = 'sess-references'
const t = (key: string): string => (zh as Record<string, string>)[key] ?? key

const SKILL_VIEW = {
  latest: { turn: 2, names: ['docx'] },
  session: [{ name: 'docx', count: 1, lastTurn: 2 }],
  sessionTotal: 1,
  callTotal: 1,
  available: ['pdf'],
  availableCount: 1,
}

const RECALL_VIEW = {
  rev: 3,
  sessionId: SESSION,
  count: 1,
  items: [{ id: 'm1', type: 'work_fact', title: '召回条目甲', priority: 80 }],
}

const SLOTS_VIEW = {
  rev: 1,
  count: 1,
  openCount: 1,
  slots: [{ id: 's1', title: '永远中文回复', kind: 'rule', status: 'open', priority: 90 }],
}

/**
 * A context serving projection faces and one config snapshot.
 * The snapshot object is hoisted per call on purpose: `useConfigFlag` reads it
 * through `useSyncExternalStore`, and a fresh object per read is a render loop.
 */
function ctxWith(
  values: Record<string, unknown>,
  config?: { value?: BriefClientConfig; status?: 'ready' | 'unavailable'; present?: boolean },
): Context {
  const snapshot = {
    status: config?.status ?? 'ready',
    value: config?.value,
    revision: 1,
    writable: true,
  }
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
  const configForms = config?.present === false
    ? undefined
    : {
      get: () => ({
        getSnapshot: () => snapshot,
        subscribe: () => () => {},
        set: async () => true,
        unset: async () => true,
      }),
    }
  return {
    get: (name: string) => (name === 'sessions' ? sessions : name === 'configForms' ? configForms : undefined),
  } as unknown as Context
}

function render(ctx: Context): string {
  return renderToStaticMarkup(createElement(ReferenceSection, { t, ctx, scope: { sessionId: SESSION } }))
}

describe('ReferenceSection tabs', () => {
  it('shows only the skills tab when prime-memory is not in the composition', () => {
    const markup = render(ctxWith({ [SKILL_USAGE_KEY]: SKILL_VIEW }))
    expect(markup).toContain('data-dsh-brief-sidebar="references-section"')
    expect(markup).toContain(t('section.references'))
    expect(markup).toContain('data-dsh-brief-sidebar="reference-tab-skills"')
    expect(markup).not.toContain('data-dsh-brief-sidebar="reference-tab-memory"')
    expect(markup).not.toContain('data-dsh-brief-sidebar="reference-pane-memory"')
  })

  it('hides the whole section when neither capability answers', () => {
    expect(render(ctxWith({}))).toBe('')
  })

  it('keeps the skills pane as the default and the memory pane mounted but hidden', () => {
    const markup = render(ctxWith({ [SKILL_USAGE_KEY]: SKILL_VIEW, [MEMORY_RECALL_KEY]: RECALL_VIEW }))
    expect(markup).toContain('data-dsh-brief-sidebar="reference-tab-memory"')
    // 保活：未选中的记忆页仍在 DOM 里，但带 hidden + display:none。
    expect(markup).toContain('data-dsh-brief-sidebar="memory-recall-section"')
    expect(markup).toContain('display:none')
    expect(markup).toContain('aria-selected="true"')
  })

  it('drops the memory tab when the recall switch is off and no slots are open', () => {
    const markup = render(ctxWith(
      { [SKILL_USAGE_KEY]: SKILL_VIEW, [MEMORY_RECALL_KEY]: RECALL_VIEW, [MEMORY_SLOTS_KEY]: SLOTS_VIEW },
      { value: { showMemoryRecall: false } },
    ))
    expect(markup).not.toContain('data-dsh-brief-sidebar="reference-tab-memory"')
  })

  it('offers the memory tab for slots alone, and slots stay off by default', () => {
    const off = render(ctxWith({ [MEMORY_SLOTS_KEY]: SLOTS_VIEW }, { value: {} }))
    expect(off).toBe('')
    const on = render(ctxWith(
      { [MEMORY_SLOTS_KEY]: SLOTS_VIEW },
      { value: { showMemorySlots: true } },
    ))
    expect(on).toContain('data-dsh-brief-sidebar="reference-tab-memory"')
    // 技能能力缺席时不该有个技能页签。
    expect(on).not.toContain('data-dsh-brief-sidebar="reference-tab-skills"')
  })

  it('switches panes on click and keeps the previous pane mounted', () => {
    let root: Root | undefined
    const host = document.createElement('div')
    document.body.append(host)
    try {
      act(() => {
        root = createRoot(host)
        root.render(createElement(ReferenceSection, {
          t,
          ctx: ctxWith({ [SKILL_USAGE_KEY]: SKILL_VIEW, [MEMORY_RECALL_KEY]: RECALL_VIEW }),
          scope: { sessionId: SESSION },
        }))
      })
      const memoryTab = host.querySelector('[data-dsh-brief-sidebar="reference-tab-memory"]')
      expect(memoryTab).not.toBeNull()
      const skillsPane = host.querySelector('[data-dsh-brief-sidebar="reference-pane-skills"]')
      const memoryPane = host.querySelector('[data-dsh-brief-sidebar="reference-pane-memory"]')
      expect(skillsPane?.getAttribute('aria-hidden')).toBeNull()
      expect((memoryPane as HTMLElement | null)?.style.display).toBe('none')
      act(() => {
        memoryTab?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      })
      expect((skillsPane as HTMLElement | null)?.style.display).toBe('none')
      expect((memoryPane as HTMLElement | null)?.style.display).toBe('')
      expect(host.textContent).toContain('召回条目甲')
      // 保活的直接证据：切页后技能页仍在 DOM 里。
      expect(host.querySelector('[data-dsh-brief-sidebar="skill-usage-section"]')).not.toBeNull()
    } finally {
      act(() => { root?.unmount() })
      host.remove()
    }
  })

  it('switches panes with the left and right arrow keys', () => {
    let root: Root | undefined
    const host = document.createElement('div')
    document.body.append(host)
    try {
      act(() => {
        root = createRoot(host)
        root.render(createElement(ReferenceSection, {
          t,
          ctx: ctxWith({ [SKILL_USAGE_KEY]: SKILL_VIEW, [MEMORY_RECALL_KEY]: RECALL_VIEW }),
          scope: { sessionId: SESSION },
        }))
      })
      const tabs = host.querySelector('[data-dsh-brief-sidebar="reference-tabs"]')
      expect(tabs).not.toBeNull()
      const memoryPane = host.querySelector('[data-dsh-brief-sidebar="reference-pane-memory"]')
      act(() => {
        tabs?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }))
      })
      expect((memoryPane as HTMLElement | null)?.style.display).toBe('')
      act(() => {
        tabs?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }))
      })
      expect((memoryPane as HTMLElement | null)?.style.display).toBe('none')
    } finally {
      act(() => { root?.unmount() })
      host.remove()
    }
  })

  it('drops the pane header inside the tab, since the tab already names it', () => {
    const markup = render(ctxWith({ [SKILL_USAGE_KEY]: SKILL_VIEW }))
    expect(markup).not.toContain(t('section.skillUsage'))
    // 但独立渲染时标题照旧（其他调用方与既有用例不受影响）。
    expect(markup).toContain(t('skillUsage.invokedGroup').replace('{count}', '1'))
  })
})
