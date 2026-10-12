/**
 * The hover bubble for one recalled memory — the whole body, straight off the
 * projection frame, no second round-trip.
 *
 * Two shapes are load-bearing here:
 *
 * - **Stateless.** The section owns when a bubble opens and which row it shows;
 *   this only draws what it is handed. No hooks, no buttons, no timers.
 * - **`position: fixed`.** The summary tab body is `overflow: auto`, so a box
 *   absolutely positioned inside a row gets clipped by the scroller's border as
 *   soon as the row sits near an edge. Fixed positioning plus `bubblePos`
 *   clamping keeps the bubble inside the viewport instead.
 *
 * `pointerEvents: 'none'` is not decoration: a bubble that captures the mouse
 * would strand the very row it hovers over and leave the section unable to
 * receive the click that selects it.
 *
 * Colours come from `--dsw-alias-*` tokens only (skin contract, asserted by
 * `tests/purity.spec.ts`). There is no shadow token in that family, so the
 * bubble separates from the list by border and background layer rather than by
 * elevation — a literal `box-shadow` colour would break the contract.
 */
import { createElement } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { MemoryRecallItem } from './memory-recall'
import { expandCount } from '../locales'

/** Bubble box size, mirrored by `bubblePos`'s defaults (keep the two in sync). */
const BUBBLE_W = 360
const BUBBLE_H = 220
/** Viewport gutter kept on every side when clamping. */
const EDGE = 8

/**
 * Clamp the bubble into the viewport.
 *
 * The anchor is the hovered row's rect. The bubble opens to its right and one
 * notch down, then gets pushed back inside the window: never further right than
 * `vw - w - 8`, never below `vh - h - 8`, and never into negative coordinates.
 * Pure and total — callers can pass a zero-size rect and get a usable box.
 *
 * @param r - the hovered row's bounding rect (only `top`/`left` are read).
 * @param vw - viewport width (`window.innerWidth`).
 * @param vh - viewport height (`window.innerHeight`).
 * @param w - bubble width.
 * @param h - bubble height.
 * @returns fixed-position coordinates for the bubble.
 */
export function bubblePos(
  r: { top: number; left: number },
  vw: number,
  vh: number,
  w = BUBBLE_W,
  h = BUBBLE_H,
): { top: number; left: number } {
  return {
    left: Math.max(EDGE, Math.min(r.left + 8, vw - w - EDGE)),
    top: Math.max(EDGE, Math.min(r.top, vh - h - EDGE)),
  }
}

const BUBBLE_STYLE: CSSProperties = {
  position: 'fixed',
  pointerEvents: 'none',
  zIndex: 1000,
  maxWidth: BUBBLE_W,
  maxHeight: '45vh',
  overflow: 'hidden',
  padding: '8px 10px',
  borderRadius: 6,
  background: 'var(--dsw-alias-bg-layer-3)',
  border: '1px solid var(--dsw-alias-border-l2)',
  color: 'var(--dsw-alias-label-primary)',
  fontSize: 12,
  lineHeight: '17px',
}

const TYPE_STYLE: CSSProperties = {
  display: 'inline-block',
  marginBottom: 4,
  color: 'var(--dsw-alias-label-tertiary)',
  border: '1px solid var(--dsw-alias-label-tertiary)',
  borderRadius: 999,
  padding: '0 6px',
  fontSize: 11,
  lineHeight: '16px',
}

const BODY_STYLE: CSSProperties = {
  minWidth: 0,
  overflowWrap: 'anywhere',
  whiteSpace: 'pre-wrap',
  color: 'var(--dsw-alias-label-primary)',
}

const SCENARIO_STYLE: CSSProperties = {
  marginTop: 4,
  minWidth: 0,
  overflowWrap: 'anywhere',
  color: 'var(--dsw-alias-label-tertiary)',
  fontSize: 11,
  lineHeight: '16px',
}

const FOOTER_STYLE: CSSProperties = {
  marginTop: 4,
  color: 'var(--dsw-alias-label-tertiary)',
  fontSize: 11,
  lineHeight: '16px',
}

/** A retired record stays readable in the bubble, just marked. */
const STALE_BODY_STYLE: CSSProperties = { ...BODY_STYLE, textDecoration: 'line-through' }

/**
 * The bubble itself.
 *
 * @param props - the item to show, the clamped coordinates, and the lookup.
 * @returns the bubble element.
 */
export function RecallBubble(props: {
  item: MemoryRecallItem
  pos: { top: number; left: number }
  t: (key: string) => string
}): ReactNode {
  const { item, pos, t } = props
  const scenario = item.scenario === undefined ? undefined : item.scenario.join(' · ')
  const stale = item.retired === true
  const rated = item.rating !== undefined && Number.isInteger(item.rating) && item.rating >= 0 && item.rating <= 5
  const foot = [
    `P${item.priority}`,
    rated ? expandCount(t('recall.rated'), item.rating) : undefined,
    stale ? t('recall.obsoleted') : undefined,
  ].filter((s): s is string => s !== undefined).join(' · ')
  return createElement(
    'div',
    {
      style: { ...BUBBLE_STYLE, top: pos.top, left: pos.left },
      'data-dsh-brief-sidebar': 'recall-bubble',
      role: 'tooltip',
    },
    createElement('span', { style: TYPE_STYLE }, item.type),
    createElement(
      'div',
      { style: stale ? STALE_BODY_STYLE : BODY_STYLE },
      // No body on this frame (an older prime-memory): say so rather than
      // quietly showing only the first line as if it were everything.
      item.body ?? `${item.title}\n${t('recall.noBody')}`,
    ),
    scenario !== undefined && createElement('div', { style: SCENARIO_STYLE }, scenario),
    createElement('div', { style: FOOTER_STYLE }, foot),
  )
}
