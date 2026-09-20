/**
 * Tab glyph for the task board.
 *
 * Skin contract: plugin-drawn glyphs take their colour from the `--dsw-alias-*`
 * tokens — no colour literals anywhere in this file.
 */
import type { ReactNode } from 'react'

/**
 * A checklist mark: three rows with ticks and text rails — the same status
 * vocabulary the board paints.
 * @param size - square edge in px (the host passes its own tab-icon size).
 */
export function BriefIcon(size: number): ReactNode {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block', flex: 'none' }}
    >
      <rect
        x={1.6}
        y={2.4}
        width={12.8}
        height={11.2}
        rx={2}
        stroke="var(--dsw-alias-label-tertiary)"
        strokeWidth={1.2}
      />
      <path
        d="M4.2 6.1l1 1 1.8-2"
        stroke="var(--dsw-alias-state-success-primary)"
        strokeWidth={1.3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.2 10.6l1 1 1.8-2"
        stroke="var(--dsw-alias-label-tertiary)"
        strokeWidth={1.3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.4 6.4h4M8.4 10.9h4"
        stroke="var(--dsw-alias-label-tertiary)"
        strokeWidth={1.2}
        strokeLinecap="round"
      />
    </svg>
  )
}
