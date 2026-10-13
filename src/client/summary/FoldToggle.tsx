/**
 * The two group chrome pieces the summary sections share: a counted group
 * title, and the toggle that folds a group away.
 *
 * Extracted because the deliverables section (本回合 / 更早改动) and the recall
 * section (活跃召回 / 其余历史召回) now fold a history group the same way. Two
 * private copies of the same button would drift the first time either section
 * touches padding — and the whole point of the split is that a reader can tell
 * "what is live now" from "what the session also contains" without learning a
 * different layout per section.
 *
 * Colours come from `--dsw-alias-*` tokens only (skin contract, enforced by
 * `tests/purity.spec.ts`).
 */
import { createElement } from 'react'
import type { CSSProperties, ReactNode } from 'react'

/** Section-level title under the section header: quieter, same left gutter. */
const GROUP_HEADER_STYLE: CSSProperties = {
  padding: '8px 12px 0',
  color: 'var(--dsw-alias-label-tertiary)',
  fontSize: 11,
  fontWeight: 600,
}

/** The fold switch: full-width hit area, tertiary text, chevron at the end. */
const TOGGLE_STYLE: CSSProperties = {
  background: 'none',
  border: 'none',
  font: 'inherit',
  fontSize: 12,
  color: 'var(--dsw-alias-label-tertiary)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '6px 12px',
  textAlign: 'left',
  width: 'calc(100% - 24px)',
}

/** The note beside a folded group (e.g. how many the capped list left out). */
const CAPTION_STYLE: CSSProperties = {
  padding: '0 12px 6px',
  color: 'var(--dsw-alias-label-tertiary)',
  fontSize: 11,
  lineHeight: '16px',
}

const CHEVRON_STYLE = (open: boolean): CSSProperties => ({
  flexShrink: 0,
  transition: 'transform 0.16s',
  transform: open ? 'rotate(180deg)' : 'none',
})

/**
 * A counted group title. Renders nothing when the group is empty — an empty
 * "活跃召回 · 0" line would ask the reader to explain a heading rather than read
 * a fact.
 * @param props - already-interpolated text, plus an optional DOM marker.
 */
export function GroupHeader(props: { text: string; marker?: string }): ReactNode {
  if (props.text.length === 0) return null
  return createElement(
    'div',
    {
      style: GROUP_HEADER_STYLE,
      'data-dsh-brief-sidebar': props.marker ?? 'group-header',
    },
    props.text,
  )
}

/**
 * The fold switch. `marker` is what tests (and the browser probe) click, so it
 * belongs to the component rather than to either caller's markup.
 * @param props - label, current state, DOM marker, click handler.
 */
export function FoldToggle(props: {
  label: string
  open: boolean
  marker: string
  onToggle(): void
}): ReactNode {
  const { label, open, marker } = props
  return createElement(
    'button',
    {
      type: 'button',
      'aria-expanded': open,
      style: TOGGLE_STYLE,
      'data-dsh-brief-sidebar': marker,
      onClick: () => { props.onToggle() },
    },
    label,
    createElement(
      'svg',
      { width: 10, height: 10, viewBox: '0 0 16 16', 'aria-hidden': true, style: CHEVRON_STYLE(open) },
      createElement('path', {
        d: 'M4 6l4 4 4-4',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.5,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      }),
    ),
  )
}

/** A quiet caption under a group, used for the "the list is capped" note. */
export function GroupCaption(props: { text: string; marker: string }): ReactNode {
  return createElement('div', { style: CAPTION_STYLE, 'data-dsh-brief-sidebar': props.marker }, props.text)
}
