/**
 * 技能引用分区：读侧收敛与渲染契约。
 *
 * 三条必须钉住的事：
 * - 投影缺席（宿主没装/本插件 host 半没注册）⇒ 整段隐藏，缺席不是错误态；
 * - `session: []` 是诚实空态（技能工具六线都在，只是这轮没用）；
 * - 行内不挂原生 `title`——那是 brief 在召回分区上刚踩过的坑（深色提示框不受皮肤契约管，
 *   还会盖住自己的泡泡）。
 */
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Context } from '@deepseek-ai/cordis'

import { readSkillUsage } from '../src/client/summary/skill-usage'
import { SkillUsageSection } from '../src/client/summary/SkillUsageSection'
import { SKILL_USAGE_KEY } from '../src/projection/keys'
import { SummaryTab } from '../src/client/SummaryTab'
import { zh } from '../src/client/locales'

const t = (key: string): string => (zh as Record<string, string>)[key] ?? key
const SESSION = 'session-1'

/** 只服务投影面的一根桩：`sessions.binding(id).session.projections.faceOf(key)`。 */
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
  return { get: (name: string) => (name === 'sessions' ? sessions : undefined) } as unknown as Context
}

const LIVE = {
  latest: { turn: 3, names: ['docx'] },
  session: [
    { name: 'docx', count: 2, lastTurn: 3 },
    { name: 'pdf', count: 1, lastTurn: 1 },
  ],
  sessionTotal: 2,
  callTotal: 3,
}

function renderSection(ctx: Context): string {
  return renderToStaticMarkup(createElement(SkillUsageSection, { t, ctx, scope: { sessionId: SESSION } }))
}

describe('readSkillUsage', () => {
  it('缺席或坏到不可修复都收敛成 undefined', () => {
    for (const raw of [undefined, null, 'nonsense', 42, [], {}]) {
      expect(readSkillUsage(raw)).toBeUndefined()
    }
    // 计数器形状漂移 = 能力未对齐，不是空集。
    expect(readSkillUsage({ session: [], sessionTotal: 0 })).toBeUndefined()
    expect(readSkillUsage({ session: [], callTotal: -1 })).toBeUndefined()
    expect(readSkillUsage({ session: 'docx', sessionTotal: 1, callTotal: 1 })).toBeUndefined()
  })

  it('空列表是诚实空态，不是隐藏', () => {
    const view = readSkillUsage({ session: [], sessionTotal: 0, callTotal: 0 })
    expect(view).toBeDefined()
    expect(view?.session).toEqual([])
    expect(view?.latest).toBeNull()
  })

  it('坏条目丢掉，好条目留下（不整段作废）', () => {
    const view = readSkillUsage({
      session: [
        { name: 'docx', count: 2, lastTurn: 1 },
        { name: '', count: 1, lastTurn: 1 },
        { name: 'pdf' },
        null,
        'x',
      ],
      sessionTotal: 5,
      callTotal: 9,
    })
    expect(view?.session).toEqual([{ name: 'docx', count: 2, lastTurn: 1 }])
    expect(view?.sessionTotal).toBe(5)
    expect(view?.callTotal).toBe(9)
  })

  it('本轮桶只认 turn 为数且 names 为数组的形状，否则读作无桶', () => {
    const good = readSkillUsage({ ...LIVE })
    expect(good?.latest).toEqual({ turn: 3, names: ['docx'] })
    const drifted = readSkillUsage({ ...LIVE, latest: { turn: 'three', names: ['docx'] } })
    expect(drifted?.latest).toBeNull()
    const notArray = readSkillUsage({ ...LIVE, latest: { turn: 3, names: 'docx' } })
    expect(notArray?.latest).toBeNull()
  })
})

describe('SkillUsageSection gating', () => {
  it('投影缺席时什么都不画', () => {
    expect(renderSection(ctxWith({}))).toBe('')
    expect(renderSection(ctxWith({ [SKILL_USAGE_KEY]: 'nonsense' }))).toBe('')
    // 没有会话绑定也画不出来（face 走的是 session.binding）。
    expect(renderToStaticMarkup(createElement(SkillUsageSection, { t, ctx: ctxWith({ [SKILL_USAGE_KEY]: LIVE }), scope: {} }))).toBe('')
  })

  it('空账走空态文案，不画列表', () => {
    const markup = renderSection(ctxWith({ [SKILL_USAGE_KEY]: { session: [], sessionTotal: 0, callTotal: 0 } }))
    expect(markup).toContain('data-dsh-brief-sidebar="skill-usage-section"')
    expect(markup).toContain(zh['section.skillUsage'])
    expect(markup).toContain(zh['skillUsage.empty'])
    expect(markup).not.toContain('docx')
  })
})

describe('SkillUsageSection rendering', () => {
  it('技能名、次数与页脚计数都在，本轮的挂标签', () => {
    const markup = renderSection(ctxWith({ [SKILL_USAGE_KEY]: LIVE }))
    expect(markup).toContain('docx')
    expect(markup).toContain('pdf')
    expect(markup).toContain(zh['skillUsage.uses'].replace('{count}', '2'))
    expect(markup).toContain(zh['skillUsage.count'].replace('{count}', '3').replace('{total}', '2'))
    expect(markup).toContain(zh['skillUsage.latestTag'])
  })

  it('顺序由视图给（最近在上），渲染不重排', () => {
    const markup = renderSection(ctxWith({ [SKILL_USAGE_KEY]: LIVE }))
    expect(markup.indexOf('docx')).toBeLessThan(markup.indexOf('pdf'))
  })

  it('行内不挂原生 title（全文归泡泡/本区不需要）', () => {
    const markup = renderSection(ctxWith({ [SKILL_USAGE_KEY]: LIVE }))
    expect(markup).not.toContain('title="docx"')
    expect(markup).not.toContain('title="pdf"')
  })

  it('只读：静态渲染里没有按钮、没有勾选框', () => {
    const markup = renderSection(ctxWith({ [SKILL_USAGE_KEY]: LIVE }))
    expect(markup).not.toContain('<button')
    expect(markup).not.toContain('checkbox')
  })

  it('上限之外仍报真总数', () => {
    const many = {
      session: Array.from({ length: 20 }, (_, i) => ({ name: `skill-${i}`, count: 1, lastTurn: i + 1 })),
      sessionTotal: 60,
      callTotal: 61,
    }
    const markup = renderSection(ctxWith({ [SKILL_USAGE_KEY]: many }))
    expect(markup).toContain(zh['skillUsage.count'].replace('{count}', '61').replace('{total}', '60'))
  })
})

describe('SummaryTab wiring', () => {
  it('概要 tab 里带上技能引用分区', () => {
    const markup = renderToStaticMarkup(
      createElement(SummaryTab, { t, ctx: ctxWith({ [SKILL_USAGE_KEY]: LIVE }), scope: { sessionId: SESSION } }),
    )
    expect(markup).toContain('data-dsh-brief-sidebar="skill-usage-section"')
    expect(markup).toContain('docx')
  })
})
