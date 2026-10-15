/**
 * 家族容器兜底接管的契约用例。
 *
 * 三条都必须钉住，因为它们各自对应一种真实故障：
 * 1. **无人声明时上位**——这是修好「面板整轮启动不可见且不报错」的那条路；
 * 2. **有人声明时绝不重复注册**——否则两个容器抢同一子席位，宿主直接抛，
 *    而抛错的那家会退化成残废容器（正是本轮删掉的降级）；
 * 3. **声明失败就放弃整节**（declare-or-withdraw）——注册只能发生一次，
 *    不允许出现「不带 children 的第二次尝试」。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  FAMILY_CLAIM_DELAY_MS,
  FAMILY_CLAIM_RANK,
  claimFamilyHostIfOrphaned,
  projectLedger,
} from '../src/client/family-host'
import type { FamilyHostSlots } from '../src/client/family-host'

const CHILD = 'dsh-family.tab'

/** 一个最小槽门面替身：entries/register 可编程，register 可注入抛错。 */
function fakeSlots(options: { entries?: unknown[]; throwOnRegister?: Error } = {}) {
  const registered: { options: Record<string, unknown>; component: unknown }[] = []
  const slots: FamilyHostSlots = {
    inject: () => undefined,
    register: (opts, component) => {
      if (options.throwOnRegister !== undefined) throw options.throwOnRegister
      registered.push({ options: opts, component })
      return () => undefined
    },
    entries: () => (options.entries ?? []) as never,
    subscribe: () => () => undefined,
  }
  return { slots, registered }
}

describe('family host backstop', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('takes the container over when nobody declared the child slot', () => {
    const { slots, registered } = fakeSlots()
    claimFamilyHostIfOrphaned(slots, () => false, () => '起子插件设置', '[test]')
    expect(registered).toHaveLength(0)

    vi.advanceTimersByTime(FAMILY_CLAIM_DELAY_MS + 10)
    expect(registered).toHaveLength(1)
    const opts = registered[0]!.options
    expect(opts['name']).toBe('settings.section')
    expect(opts['id']).toBe('dsh-family')
    // 声明即授权：接管必须带 children，否则坐上的是一个渲染不出任何成员卡的残废节。
    expect(opts['children']).toEqual({ [CHILD]: { kind: 'list', scope: 'root' } })
    // 遮蔽优先级必须高于任何正牌 owner（TL=0 / guard=10），owner 回来时能盖住这行。
    expect(Number(opts['priority'])).toBeGreaterThan(10)
  })

  it('stays a member when the declaration is already held', () => {
    const { slots, registered } = fakeSlots()
    claimFamilyHostIfOrphaned(slots, () => true, () => '起子插件设置', '[test]')
    vi.advanceTimersByTime(FAMILY_CLAIM_DELAY_MS + 10)
    expect(registered).toHaveLength(0)
  })

  it('withdraws instead of seating a childless section when the claim throws', () => {
    const { slots, registered } = fakeSlots({ throwOnRegister: new Error('slot "dsh-family.tab" is already declared') })
    claimFamilyHostIfOrphaned(slots, () => false, () => '起子插件设置', '[test]')
    vi.advanceTimersByTime(FAMILY_CLAIM_DELAY_MS + 10)
    // 只允许一次尝试：第二次「去掉 children 再注册」就是本轮删掉的那个缺陷。
    expect(registered).toHaveLength(0)
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('withdrawing'))
  })

  it('cancels a pending claim when the fiber unloads', () => {
    const { slots, registered } = fakeSlots()
    const dispose = claimFamilyHostIfOrphaned(slots, () => false, () => 'x', '[test]')
    dispose()
    vi.advanceTimersByTime(FAMILY_CLAIM_DELAY_MS * 2)
    expect(registered).toHaveLength(0)
  })

  it('derives its moment from the rank ladder rather than a hardcoded number', () => {
    // 断言形式本身就是派生式：不在此重复写 rank 数字（否则这个用例会成为冻结表的
    // 第三个真源 —— 改 rank 时必须连带改断言，那正是它声称要防的事）。
    expect(FAMILY_CLAIM_DELAY_MS).toBe(200 + FAMILY_CLAIM_RANK * 900)
    // 冻结表（_tools/family-rank.mjs）当前定 brief 为 rank 4。
    expect(FAMILY_CLAIM_RANK).toBe(4)
  })
})

describe('projectLedger', () => {
  it('sorts by order and resolves function labels', () => {
    const { slots } = fakeSlots({
      entries: [
        { options: { id: 'b', order: 20, label: () => '乙' } },
        { options: { id: 'a', order: 10, label: '甲' } },
      ],
    })
    expect(projectLedger(slots)).toEqual([
      { id: 'a', order: 10, label: '甲' },
      { id: 'b', order: 20, label: '乙' },
    ])
  })

  it('degrades a throwing label to the id rather than breaking the section', () => {
    const { slots } = fakeSlots({
      entries: [{ options: { id: 'bad', order: 1, label: () => { throw new Error('locale not bound') } } }],
    })
    expect(projectLedger(slots)).toEqual([{ id: 'bad', order: 1, label: 'bad' }])
  })
})
