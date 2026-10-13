/**
 * 技能引用折叠（host 半）：从会话事件里折出「本会话调用过哪些技能」。
 *
 * 数据源是 `tool/call`（`name === 'skill'`，宿主技能工具的注册名——六线源码逐字相同：
 * `packages/skill/tool-skill/src/index.ts:82` 起，`dsh-v0.1.0-rc.8` 到 `dsh-v0.2.0-rc.2`
 * 都有 `name:'skill'` + 唯一参数 `name`）与 `tool/result`（只有成功的才算引用，与产物折叠
 * 同一口径）。**技能工具在六线上都没有 `presentationMeta`**，所以 `tool/result.meta` 这条
 * 捷径对技能不存在——参数里的技能名就是唯一可用真源。
 *
 * 折叠是纯函数（无 cordis / 无 zod / 无 IO），因此可以直接拿手写事件喂。
 */
import { describe, expect, it } from 'vitest'

import {
  applySkillUsageEvent,
  CAPS,
  initSkillUsageState,
  skillNameFromArgs,
} from '../src/projection/skill-usage-fold'
import type { SkillUsageState } from '../src/projection/skill-usage-fold'

/** 一条 `tool/call` 事件（args 传对象时自动序列化，传字符串则原样落 wire）。 */
function callEvent(callId: string, name: string, args: unknown, turn = 1): SkillUsageEventLike {
  return {
    type: 'tool/call',
    data: { turn, step: 1, callId, name, arguments: typeof args === 'string' ? args : JSON.stringify(args) },
  }
}

/** 一条 `tool/result` 事件（isError 默认成功）。 */
function resultEvent(callId: string, isError = false): SkillUsageEventLike {
  return { type: 'tool/result', data: { turn: 1, step: 1, message: { content: [{ isError }], source: { callId } } } }
}

interface SkillUsageEventLike {
  readonly type: string
  readonly data: unknown
}

/** 技能调用成功一轮后的状态（多数用例的共同前奏）。 */
function usedSkill(state: SkillUsageState, callId: string, name: string): SkillUsageState {
  return applySkillUsageEvent(applySkillUsageEvent(state, callEvent(callId, 'skill', { name })), resultEvent(callId))
}

describe('skillNameFromArgs', () => {
  it('只在技能工具与字符串技能名上取名', () => {
    expect(skillNameFromArgs('skill', '{"name":"docx"}')).toBe('docx')
    // 别的工具一律不算技能引用（哪怕参数里有个 name 字段）。
    expect(skillNameFromArgs('write', '{"name":"docx"}')).toBeNull()
    expect(skillNameFromArgs('advanced_search', '{"query":"x"}')).toBeNull()
  })

  it('畸形入参返回 null 而不抛', () => {
    expect(skillNameFromArgs('skill', 'not json')).toBeNull()
    expect(skillNameFromArgs('skill', '[]')).toBeNull()
    expect(skillNameFromArgs('skill', '"docx"')).toBeNull()
    expect(skillNameFromArgs('skill', '{}')).toBeNull()
    expect(skillNameFromArgs('skill', '{"name":123}')).toBeNull()
    expect(skillNameFromArgs('skill', '{"name":"   "}')).toBeNull()
  })
})

describe('initSkillUsageState', () => {
  it('初始就是空账', () => {
    expect(initSkillUsageState()).toEqual({
      turn: 0,
      calls: {},
      latest: null,
      items: [],
      sessionTotal: 0,
      callTotal: 0,
    })
  })
})

describe('applySkillUsageEvent', () => {
  it('与折叠无关的事件返回同一引用（注册表据此零下游工作）', () => {
    const state = initSkillUsageState()
    expect(applySkillUsageEvent(state, { type: 'assistant/message', data: {} })).toBe(state)
    expect(applySkillUsageEvent(state, { type: 'step/start', data: { turn: 1 } })).toBe(state)
  })

  it('成功的技能调用进列表，并开一个本轮桶', () => {
    let state = initSkillUsageState()
    state = applySkillUsageEvent(state, { type: 'turn/start', data: { turn: 1 } })
    state = usedSkill(state, 'c1', 'docx')
    expect(state.items).toEqual([{ name: 'docx', count: 1, lastTurn: 1 }])
    expect(state.latest).toEqual({ turn: 1, names: ['docx'] })
    expect(state.sessionTotal).toBe(1)
    expect(state.callTotal).toBe(1)
  })

  it('失败的结果不算引用', () => {
    let state = initSkillUsageState()
    state = applySkillUsageEvent(state, { type: 'turn/start', data: { turn: 1 } })
    state = applySkillUsageEvent(state, callEvent('c1', 'skill', { name: 'docx' }))
    state = applySkillUsageEvent(state, resultEvent('c1', true))
    expect(state.items).toEqual([])
    expect(state.callTotal).toBe(0)
    expect(state.sessionTotal).toBe(0)
    expect(state.latest).toEqual({ turn: 1, names: [] })
  })

  it('同一技能重复调用累加次数，不新增条目', () => {
    let state = initSkillUsageState()
    state = applySkillUsageEvent(state, { type: 'turn/start', data: { turn: 1 } })
    state = usedSkill(state, 'c1', 'docx')
    state = usedSkill(state, 'c2', 'docx')
    expect(state.items).toEqual([{ name: 'docx', count: 2, lastTurn: 1 }])
    expect(state.sessionTotal).toBe(1)
    expect(state.callTotal).toBe(2)
    // 本轮桶里同一技能只列一次。
    expect(state.latest?.names).toEqual(['docx'])
  })

  it('后引用的技能排在前面（最近在上）', () => {
    let state = initSkillUsageState()
    state = applySkillUsageEvent(state, { type: 'turn/start', data: { turn: 1 } })
    state = usedSkill(state, 'c1', 'docx')
    state = usedSkill(state, 'c2', 'pdf')
    expect(state.items.map((i) => i.name)).toEqual(['pdf', 'docx'])
    expect(state.sessionTotal).toBe(2)
  })

  it('技能名空白或畸形入参不进列表', () => {
    let state = initSkillUsageState()
    state = applySkillUsageEvent(state, { type: 'turn/start', data: { turn: 1 } })
    state = applySkillUsageEvent(state, callEvent('c1', 'skill', '{"name":"  "}'))
    state = applySkillUsageEvent(state, resultEvent('c1'))
    state = applySkillUsageEvent(state, callEvent('c2', 'skill', 'garbage'))
    state = applySkillUsageEvent(state, resultEvent('c2'))
    expect(state.items).toEqual([])
    expect(state.callTotal).toBe(0)
  })

  it('会话条目有上限，但 sessionTotal 说真话', () => {
    let state = initSkillUsageState()
    state = applySkillUsageEvent(state, { type: 'turn/start', data: { turn: 1 } })
    const total = CAPS.session + 10
    for (let i = 0; i < total; i++) state = usedSkill(state, `c${i}`, `skill-${i}`)
    expect(state.items.length).toBe(CAPS.session)
    expect(state.sessionTotal).toBe(total)
    expect(state.callTotal).toBe(total)
    // 上限裁掉的是最旧的，留下的仍按最近在上。
    expect(state.items[0]?.name).toBe(`skill-${total - 1}`)
  })

  it('turn/start 开新桶并裁掉两个回合前的挂账', () => {
    let state = initSkillUsageState()
    state = applySkillUsageEvent(state, { type: 'turn/start', data: { turn: 1 } })
    state = applySkillUsageEvent(state, callEvent('c1', 'skill', { name: 'docx' }, 1))
    state = applySkillUsageEvent(state, { type: 'turn/start', data: { turn: 3 } })
    expect(state.turn).toBe(3)
    expect(state.calls['c1']).toBeUndefined()
    expect(state.latest).toEqual({ turn: 3, names: [] })
    // 迟到的结果不认领旧桶，但技能名仍在会话账上（不谎报本轮用过）。
    // 挂账已在 turn/start 时被裁掉，所以这条结果什么都不能新增。
    state = applySkillUsageEvent(state, {
      type: 'tool/result',
      data: { turn: 3, step: 1, message: { content: [{ isError: false }], source: { callId: 'c1' } } },
    })
    expect(state.latest).toEqual({ turn: 3, names: [] })
    expect(state.items).toEqual([])
  })

  it('同回合内先调用后结果，迟到的结果不改更早的桶', () => {
    let state = initSkillUsageState()
    state = applySkillUsageEvent(state, { type: 'turn/start', data: { turn: 5 } })
    state = applySkillUsageEvent(state, callEvent('c9', 'skill', { name: 'pptx' }, 5))
    state = applySkillUsageEvent(state, resultEvent('c9'))
    expect(state.items).toEqual([{ name: 'pptx', count: 1, lastTurn: 5 }])
    expect(state.latest).toEqual({ turn: 5, names: ['pptx'] })
  })
})
