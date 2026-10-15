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
 *   clamping keeps the bubble inside the viewport instead, and anchored to the
 *   row's *left* so it never lands on the list it describes.
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
import { createElement, Fragment } from 'react'
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
 * It opens to the **left** of the row on purpose. The sidebar is right-docked
 * and only a few hundred pixels wide, so the old "anchor + 8" placement dropped
 * the box straight onto the row it came from — covering that row's rating strip
 * (the bubble is click-transparent, so the buttons stayed clickable *under* it:
 * blind-clicking a score is not an option). Opening left puts the text over the
 * chat area and leaves the whole list readable.
 *
 * Order of preference: left of the row → right of the row (only when the row
 * sits so far left that the box would run off the window) → clamped inside the
 * viewport. Pure and total.
 *
 * @param r - the hovered row's rect (`top`/`left`/`right` are read).
 * @param vw - viewport width (`window.innerWidth`).
 * @param vh - viewport height (`window.innerHeight`).
 * @param w - bubble width.
 * @param h - bubble height.
 * @returns fixed-position coordinates for the bubble.
 */
export function bubblePos(
  r: { top: number; left: number; right?: number },
  vw: number,
  vh: number,
  w = BUBBLE_W,
  h = BUBBLE_H,
): { top: number; left: number } {
  const right = r.right ?? r.left
  const preferred = r.left - w - EDGE
  const fallback = right + EDGE
  const roomOnLeft = preferred >= EDGE
  const roomOnRight = fallback + w <= vw - EDGE
  const unplaced = Math.min(preferred, fallback)
  const left = roomOnLeft
    ? preferred
    : roomOnRight
      ? fallback
      : unplaced
  return {
    left: Math.max(EDGE, Math.min(left, vw - w - EDGE)),
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

/* ── Lightweight Markdown renderer (no external deps) ──────────────────── */

const MD_H_STYLES: CSSProperties[] = [
  { fontSize: 14, fontWeight: 700, margin: '6px 0 2px', color: 'var(--dsw-alias-label-primary)' },
  { fontSize: 13, fontWeight: 600, margin: '5px 0 2px', color: 'var(--dsw-alias-label-primary)' },
  { fontSize: 12, fontWeight: 600, margin: '4px 0 1px', color: 'var(--dsw-alias-label-secondary)' },
  { fontSize: 12, fontWeight: 600, margin: '4px 0 1px', color: 'var(--dsw-alias-label-secondary)' },
  { fontSize: 11, fontWeight: 600, margin: '3px 0 1px', color: 'var(--dsw-alias-label-secondary)' },
  { fontSize: 11, fontWeight: 600, margin: '3px 0 1px', color: 'var(--dsw-alias-label-tertiary)' },
]

const MD_P_STYLE: CSSProperties = { margin: '2px 0', whiteSpace: 'pre-wrap' }
const MD_LI_STYLE: CSSProperties = { margin: '1px 0 1px 12px', whiteSpace: 'pre-wrap' }
const MD_CODE_STYLE: CSSProperties = {
  fontFamily: 'var(--dsw-alias-font-mono, monospace)',
  fontSize: 11,
  background: 'var(--dsw-alias-fill-tertiary)',
  padding: '0 3px',
  borderRadius: 3,
}

/** Parse inline bold (`**x**`) and code (`` `x` ``) spans. */
function renderInline(text: string, key: string): ReactNode[] {
  const nodes: ReactNode[] = []
  // Split by **bold** or `code`
  const re = /\*\*(.+?)\*\*|`(.+?)`/
  let rest = text
  let i = 0
  while (rest.length > 0) {
    const m = re.exec(rest)
    if (m === null) { nodes.push(rest); break }
    if (m.index > 0) nodes.push(rest.slice(0, m.index))
    if (m[1] !== undefined) {
      nodes.push(createElement('strong', { key: `${key}-b${i++}` }, m[1]))
    } else {
      nodes.push(createElement('code', { key: `${key}-c${i++}`, style: MD_CODE_STYLE }, m[2]))
    }
    rest = rest.slice(m.index + m[0].length)
  }
  return nodes
}

/**
 * Render a markdown string into React nodes.
 * Supports: headings (h1-h6), unordered/ordered lists, bold, inline code, paragraphs.
 */
export function renderMd(md: string): ReactNode {
  const lines = md.split('\n')
  const out: ReactNode[] = []
  let idx = 0
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.length === 0) continue
    // Heading
    const hMatch = /^(#{1,6})\s+(.+)/.exec(trimmed)
    if (hMatch) {
      const level = hMatch[1].length
      out.push(createElement(`h${level}`, { key: `h${idx}`, style: MD_H_STYLES[level - 1] },
        ...renderInline(hMatch[2], `h${idx}`)))
      idx++
      continue
    }
    // Unordered list item
    const ulMatch = /^[-*]\s+(.+)/.exec(trimmed)
    if (ulMatch) {
      out.push(createElement('span', { key: `li${idx}`, style: MD_LI_STYLE },
        '• ', ...renderInline(ulMatch[1], `li${idx}`)))
      idx++
      continue
    }
    // Ordered list item
    const olMatch = /^\d+\.\s+(.+)/.exec(trimmed)
    if (olMatch) {
      out.push(createElement('span', { key: `li${idx}`, style: MD_LI_STYLE },
        trimmed.slice(0, trimmed.indexOf('.') + 2), ...renderInline(olMatch[1], `li${idx}`)))
      idx++
      continue
    }
    // Paragraph
    out.push(createElement('span', { key: `p${idx}`, style: MD_P_STYLE },
      ...renderInline(trimmed, `p${idx}`)))
    idx++
  }
  return createElement(Fragment, null, ...out)
}

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
      // Render markdown body; fallback when absent.
      item.body !== undefined ? renderMd(item.body) : `${item.title}\n${t('recall.noBody')}`,
    ),
    scenario !== undefined && createElement('div', { style: SCENARIO_STYLE }, scenario),
    createElement('div', { style: FOOTER_STYLE }, foot),
  )
}
