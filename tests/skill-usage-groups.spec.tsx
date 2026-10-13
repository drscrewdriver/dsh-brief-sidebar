/**
 * 读侧与渲染：「已引用」与「本会话可用」两组。
 *
 * 两条契约值得单独立起来：
 * 1. **旧帧兼容**——宿主半还没升到 0.9.2 时，帧里没有 `available` 字段，读侧必须
 *    读成"不知道可用清单"（空数组）而不是把整节判成能力缺席（那会让已引用列表消失）；
 * 2. **可用不等于引用**——已被引用的名字从可用组里减掉，同一个技能不会在两处各占一行，
 *    也不会让读者误以为"列出来就是用过了"。
 */
import { describe, expect, it } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Context } from '@deepseek-ai/cordis'
import { SKILL_USAGE_KEY, availableExcept, readSkillUsage } from '../src/client/summary/skill-usage'
import { SkillUsageSection } from '../src/client/summary/SkillUsageSection'
import { zh } from '../src/client/locales'

const SESSION = 'sess-skill-groups'
const t = (key: string): string => (zh as Record<string, string>)[key] ?? key

function label(key: string, count: number | string): string {
  return (zh as Record<string, string>)[key].replace('{count}', String(count))
}

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

const VIEW = {
  latest: { turn: 3, names: ['docx'] },
  session: [{ name: 'docx', count: 2, lastTurn: 3 }],
  sessionTotal: 1,
  callTotal: 2,
  available: ['docx', 'pdf', 'xlsx'],
  availableCount: 3,
}

describe('readSkillUsage with the catalog fields', () => {
  it('reads the available list and its true count', () => {
    const view = readSkillUsage(VIEW)
    expect(view?.available).toEqual(['docx', 'pdf', 'xlsx'])
    expect(view?.availableCount).toBe(3)
  })

  it('reads a frame without the fields as "no catalog knowledge", not as absence', () => {
    const legacy = { latest: null, session: [], sessionTotal: 0, callTotal: 0 }
    const view = readSkillUsage(legacy)
    expect(view).toBeDefined()
    expect(view?.available).toEqual([])
    expect(view?.availableCount).toBe(0)
  })

  it('drops malformed available entries', () => {
    const view = readSkillUsage({ ...VIEW, available: ['ok', '', 42, null, 'ok2'] })
    expect(view?.available).toEqual(['ok', 'ok2'])
  })

  it('subtracts the referenced names from the available list', () => {
    expect(availableExcept(['docx', 'pdf', 'xlsx'], ['docx'])).toEqual(['pdf', 'xlsx'])
    expect(availableExcept([], ['docx'])).toEqual([])
  })
})

describe('SkillUsageSection grouping', () => {
  it('labels the referenced group with its own count', () => {
    const markup = renderToStaticMarkup(
      createElement(SkillUsageSection, { t, ctx: ctxWith({ [SKILL_USAGE_KEY]: VIEW }), scope: { sessionId: SESSION } }),
    )
    expect(markup).toContain(label('skillUsage.invokedGroup', 1))
    expect(markup).toContain('docx')
  })

  it('collapses the available group behind a counted toggle', () => {
    const markup = renderToStaticMarkup(
      createElement(SkillUsageSection, { t, ctx: ctxWith({ [SKILL_USAGE_KEY]: VIEW }), scope: { sessionId: SESSION } }),
    )
    // 3 条可用里 docx 已被引用，折叠组只报剩下的 2 条。
    expect(markup).toContain(label('skillUsage.availableGroup', 2))
    expect(markup).not.toContain('pdf')
  })

  it('reveals the available names on demand', () => {
    let root: Root | undefined
    const host = document.createElement('div')
    document.body.append(host)
    try {
      act(() => {
        root = createRoot(host)
        root.render(createElement(SkillUsageSection, {
          t,
          ctx: ctxWith({ [SKILL_USAGE_KEY]: VIEW }),
          scope: { sessionId: SESSION },
        }))
      })
      expect(host.textContent).not.toContain('pdf')
      const toggle = host.querySelector('[data-dsh-brief-sidebar="skill-usage-available-toggle"]')
      expect(toggle).not.toBeNull()
      act(() => {
        toggle?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      })
      expect(host.textContent).toContain('pdf')
      expect(host.textContent).toContain('xlsx')
    } finally {
      act(() => { root?.unmount() })
      host.remove()
    }
  })

  it('draws no available group when the session never published a catalog', () => {
    const legacy = { latest: null, session: [{ name: 'docx', count: 1, lastTurn: 2 }], sessionTotal: 1, callTotal: 1 }
    const markup = renderToStaticMarkup(
      createElement(SkillUsageSection, { t, ctx: ctxWith({ [SKILL_USAGE_KEY]: legacy }), scope: { sessionId: SESSION } }),
    )
    expect(markup).not.toContain((zh as Record<string, string>)['skillUsage.availableGroup'].split('·')[0])
  })

  it('hides the section entirely when the capability is absent', () => {
    const markup = renderToStaticMarkup(
      createElement(SkillUsageSection, { t, ctx: ctxWith({}), scope: { sessionId: SESSION } }),
    )
    expect(markup).toBe('')
  })
})
