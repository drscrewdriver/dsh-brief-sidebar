/**
 * 折叠层的两条新通道：宿主自标的 `skill-invocation`（用户直接点用，不走 `skill` 工具）
 * 与 `skill-catalog`（本会话可用清单，整表替换语义）。
 *
 * 实测依据（250 个真会话）：有 invocation 而无任何工具调用的会话 10 个，占 invocation
 * 会话的 53% —— 只认工具调用时这些引用一条都不显示。宿主在 catalog 提示词里明确命令
 * 模型"用户点用过的技能不要再调 `skill` 工具"（`tool-skill/src/index.ts:267`），所以
 * 这不是边角，是主路径之一。
 */
import { describe, expect, it } from 'vitest'
import {
  CAPS,
  applySkillUsageEvent,
  initSkillUsageState,
} from '../src/projection/skill-usage-fold'
import type { SkillUsageState } from '../src/projection/skill-usage-fold'

/** `turn/start` for the given turn. */
const turnStart = (turn: number) => ({ type: 'turn/start', data: { turn } })
const skillCall = (callId: string, name: string) => ({
  type: 'tool/call',
  data: { turn: 1, step: 1, callId, name: 'skill', arguments: JSON.stringify({ name }) },
})
const skillResult = (callId: string, isError = false) => ({
  type: 'tool/result',
  data: {
    turn: 1,
    step: 1,
    message: {
      content: isError ? [{ type: 'text', text: 'boom', isError: true }] : [{ type: 'text', text: 'ok' }],
      source: { kind: 'tool', callId },
    },
  },
})
const invocation = (name: unknown) => ({
  type: 'user/message',
  data: { content: [{ type: 'text', text: '<skill_content>…' }], source: { kind: 'skill-invocation', form: 'instructions', name } },
})
const catalog = (entries: unknown, update?: true) => ({
  type: 'user/message',
  data: {
    content: [{ type: 'text', text: '<available_skills>…' }],
    source: { kind: 'skill-catalog', form: 'catalog', ...(update === undefined ? {} : { update }), entries },
  },
})

const OPEN = applySkillUsageEvent(initSkillUsageState(), turnStart(1))

describe('skill-usage fold: skill-invocation channel', () => {
  it('counts a host-marked invocation as a reference even with no tool call', () => {
    const next = applySkillUsageEvent(OPEN, invocation('codeplan'))
    expect(next.items).toEqual([{ name: 'codeplan', count: 1, lastTurn: 1 }])
    expect(next.sessionTotal).toBe(1)
    expect(next.callTotal).toBe(1)
    expect(next.latest?.names).toContain('codeplan')
  })

  it('shares one tally with the tool channel when both fire for the same skill', () => {
    let s = applySkillUsageEvent(OPEN, skillCall('c1', 'docx'))
    s = applySkillUsageEvent(s, skillResult('c1'))
    s = applySkillUsageEvent(s, invocation('docx'))
    const entry = s.items.find(i => i.name === 'docx')
    expect(entry?.count).toBe(2)
    expect(s.sessionTotal).toBe(1)
    expect(s.items).toHaveLength(1)
  })

  it('ignores an invocation whose name is blank, missing or not a string', () => {
    for (const bad of ['   ', '', 42, null, undefined, {}]) {
      expect(applySkillUsageEvent(OPEN, invocation(bad))).toBe(OPEN)
    }
  })

  it('leaves unrelated user messages alone', () => {
    const plain = { type: 'user/message', data: { content: [{ type: 'text', text: 'hi' }], source: { kind: 'user' } } }
    expect(applySkillUsageEvent(OPEN, plain)).toBe(OPEN)
  })

  it('still refuses a failed tool load', () => {
    let s = applySkillUsageEvent(OPEN, skillCall('c1', 'docx'))
    s = applySkillUsageEvent(s, skillResult('c1', true))
    expect(s.items).toHaveLength(0)
    expect(s.callTotal).toBe(0)
  })
})

describe('skill-usage fold: skill-catalog channel', () => {
  it('records the published names and their true count', () => {
    const next = applySkillUsageEvent(OPEN, catalog([{ name: 'docx', description: 'd' }, { name: 'pdf', description: 'd' }]))
    expect(next.catalog).toEqual(['docx', 'pdf'])
    expect(next.catalogCount).toBe(2)
  })

  it('replaces the whole list on a later frame instead of unioning', () => {
    let s = applySkillUsageEvent(OPEN, catalog([{ name: 'a', description: '' }]))
    s = applySkillUsageEvent(s, catalog([{ name: 'b', description: '' }, { name: 'c', description: '' }], true))
    // 宿主注释原文：`update` 标的是"替换式重发"。累加并集会让技能只增不减。
    expect(s.catalog).toEqual(['b', 'c'])
    expect(s.catalogCount).toBe(2)
  })

  it('accepts an empty replacement (no skills available)', () => {
    const first = applySkillUsageEvent(OPEN, catalog([{ name: 'a', description: '' }]))
    const next = applySkillUsageEvent(first, catalog([], true))
    expect(next.catalog).toEqual([])
    expect(next.catalogCount).toBe(0)
  })

  it('caps the stored names but keeps the real count', () => {
    const entries = Array.from({ length: CAPS.available + 30 }, (_, i) => ({ name: `s${i}`, description: '' }))
    const next = applySkillUsageEvent(OPEN, catalog(entries))
    expect(next.catalog).toHaveLength(CAPS.available)
    expect(next.catalogCount).toBe(CAPS.available + 30)
  })

  it('drops malformed entries and frames without voiding the rest', () => {
    const next = applySkillUsageEvent(OPEN, catalog([{ name: 'good', description: '' }, { description: 'no name' }, null, 7]))
    expect(next.catalog).toEqual(['good'])
    expect(next.catalogCount).toBe(1)
    // entries 不是数组的帧整帧忽略（不是清空）。
    const drift = applySkillUsageEvent(OPEN, { type: 'user/message', data: { source: { kind: 'skill-catalog', form: 'catalog', entries: 'nope' } } })
    expect(drift).toBe(OPEN)
  })

  it('does not touch the reference tallies when only a catalog arrived', () => {
    const next = applySkillUsageEvent(OPEN, catalog([{ name: 'docx', description: '' }]))
    expect(next.items).toHaveLength(0)
    expect(next.callTotal).toBe(0)
  })
})

describe('skill-usage fold: state shape', () => {
  it('starts with empty catalog knowledge', () => {
    const s: SkillUsageState = initSkillUsageState()
    expect(s.catalog).toEqual([])
    expect(s.catalogCount).toBe(0)
  })
})
