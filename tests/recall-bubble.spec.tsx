/**
 * The recall hover bubble: viewport maths and static rendering.
 *
 * `bubblePos` is the only logic here, and it is the whole reason the bubble can
 * live at all — the summary tab scrolls, so an unclamped box would be cut off
 * at the pane border exactly when the hovered row sits near one. The render
 * tests pin what a reader asked for: the FULL body, not the two clamped lines.
 */
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { RecallBubble, bubblePos } from '../src/client/summary/RecallBubble'
import type { MemoryRecallItem } from '../src/client/summary/memory-recall'
import { zh } from '../src/client/locales'

const t = (key: string): string => (zh as Record<string, string>)[key] ?? key

describe('bubblePos', () => {
  it('pushes the box back inside a right edge it would overflow', () => {
    // Row at the far right of a 1900px window: left + 8 + 360 would spill over.
    const p = bubblePos({ top: 300, left: 1700 }, 1900, 1000)
    expect(p.left).toBe(1900 - 360 - 8)
    expect(p.left + 360).toBeLessThanOrEqual(1900 - 8)
  })

  it('lifts the box when it would run past the bottom edge', () => {
    const p = bubblePos({ top: 900, left: 40 }, 1000, 1000)
    expect(p.top).toBe(1000 - 220 - 8)
    expect(p.top + 220).toBeLessThanOrEqual(1000 - 8)
  })

  it('never goes negative, however far off-screen the anchor is', () => {
    expect(bubblePos({ top: -500, left: -500 }, 1000, 1000)).toEqual({ top: 8, left: 8 })
    // A viewport smaller than the box: the gutter still wins over a negative origin.
    const tiny = bubblePos({ top: 100, left: 100 }, 200, 200)
    expect(tiny.top).toBe(8)
    expect(tiny.left).toBe(8)
  })

  it('leaves a comfortably placed box where the anchor put it', () => {
    expect(bubblePos({ top: 200, left: 300 }, 1400, 900)).toEqual({ top: 200, left: 308 })
  })
})

const BASE: MemoryRecallItem = {
  id: 'm1',
  type: 'work_fact',
  title: '上行必须走官方地址',
  priority: 80,
}

function render(item: MemoryRecallItem): string {
  return renderToStaticMarkup(createElement(RecallBubble, { item, pos: { top: 40, left: 60 }, t }))
}

describe('RecallBubble', () => {
  it('shows the whole body, not the clamped first line', () => {
    const markup = render({ ...BASE, body: '上行必须走官方地址\n因为镜像有同步延迟，裸 publish 会打错仓' })
    expect(markup).toContain('因为镜像有同步延迟，裸 publish 会打错仓')
    expect(markup).toContain('work_fact')
    expect(markup).toContain('P80')
    expect(markup).toContain('top:40')
    expect(markup).toContain('left:60')
  })

  it('says so when the frame carries no body, instead of passing off the title as everything', () => {
    const markup = render(BASE)
    expect(markup).toContain(BASE.title)
    expect(markup).toContain(zh['recall.noBody'])
  })

  it('stays out of the mouse way and floats above the pane', () => {
    const markup = render({ ...BASE, body: 'x' })
    expect(markup).toContain('pointer-events:none')
    expect(markup).toContain('position:fixed')
    expect(markup).toContain('z-index:1000')
    // It must not be interactive: a bubble with a control would steal the row.
    expect(markup).not.toContain('<button')
  })

  it('carries the scenario line and marks a retired record without hiding it', () => {
    const markup = render({ ...BASE, body: 'x', scenario: ['改 profile 配置时', '重启服务前'], retired: true })
    expect(markup).toContain('改 profile 配置时 · 重启服务前')
    expect(markup).toContain('line-through')
    expect(markup).toContain(zh['recall.obsoleted'])
  })

  it('shows an existing relevance mark, and never one it does not have', () => {
    expect(render({ ...BASE, body: 'x', rating: 4 })).toContain(zh['recall.rated'].replace('{count}', '4'))
    expect(render({ ...BASE, body: 'x' })).not.toContain(zh['recall.rated'].replace('{count}', ''))
  })
})
