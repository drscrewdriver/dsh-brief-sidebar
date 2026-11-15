/**
 * The 「详细展示 ▾」 control for the memory pane.
 *
 * The sidebar does not redraw prime-memory's 2D/3D graphs: the panel owner does,
 * with its own G6/canvas implementation. This control only asks it to open the
 * 记忆库 page in one of three modes (条目 / 2D / 3D) through the same deep-link
 * event its own sidebar row uses. The owner answers synchronously, so a failure
 * (entry disabled, host without a main page) lands as readable copy here instead
 * of a dead click.
 *
 * Colours come from `--dsw-alias-*` tokens only (skin contract).
 */
import { createElement, useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'
import { openMemoryLibrary } from '../memory-open'
import type { MemoryOpenMode } from '../memory-open'
import { openMemoryTab } from '../memory-tab'

export interface MemoryViewMenuProps {
  /** The DSH locale lookup, passed down from `apply`. */
  t: (key: string) => string
  /** Optional memory id to focus; row-level menus pass the row's id. */
  recordId?: string
  /** Trigger copy; defaults to `memoryView.button` + caret. */
  label?: string
  /** Compact = inline text-link trigger for a row's rating strip. */
  compact?: boolean
}

/** Owner reason → locale key. Unknown reasons fall back to the absent copy. */
const REASON_KEY: Record<string, string> = {
  absent: 'memoryView.failAbsent',
  disabled: 'memoryView.failDisabled',
  unmounted: 'memoryView.failUnmounted',
  unregistered: 'memoryView.failUnregistered',
}

/** Menu entries, in reading order. `preview` is the pre-existing sidebar viewer. */
type MenuEntry = MemoryOpenMode | 'preview'
const MODES: ReadonlyArray<{ mode: MenuEntry; key: string }> = [
  { mode: 'preview', key: 'memoryView.preview' },
  { mode: 'entry', key: 'memoryView.entry' },
  { mode: '2d', key: 'memoryView.graph2d' },
  { mode: '3d', key: 'memoryView.graph3d' },
]

const BAR_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 6,
  padding: '8px 12px 0',
}

/** Row-strip variant: hangs at the right edge, no section padding. */
const COMPACT_BAR_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 4,
  marginLeft: 'auto',
}

const TRIGGER_STYLE: CSSProperties = {
  padding: '1px 8px',
  border: '1px solid var(--dsw-alias-border-secondary)',
  borderRadius: 4,
  background: 'none',
  font: 'inherit',
  fontSize: 11,
  lineHeight: '18px',
  color: 'var(--dsw-alias-label-secondary)',
  cursor: 'pointer',
}

const MENU_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
}

const ITEM_STYLE: CSSProperties = {
  padding: '1px 8px',
  border: '1px solid var(--dsw-alias-label-tertiary)',
  borderRadius: 999,
  background: 'none',
  font: 'inherit',
  fontSize: 11,
  lineHeight: '18px',
  color: 'var(--dsw-alias-label-primary)',
  cursor: 'pointer',
}

/** Compact trigger mirrors the strip's other buttons. */
const COMPACT_TRIGGER_STYLE: CSSProperties = {
  ...ITEM_STYLE,
  color: 'var(--dsw-alias-label-secondary)',
  border: '1px solid var(--dsw-alias-border-secondary)',
  borderRadius: 4,
  minWidth: 0,
  whiteSpace: 'nowrap',
}

const FAIL_STYLE: CSSProperties = {
  flexBasis: '100%',
  color: 'var(--dsw-alias-label-tertiary)',
  fontSize: 11,
  lineHeight: '16px',
}

/**
 * Row-strip popover: FIXED so the row's clipped height cannot cut the chips'
 * bottom border, and so a long row list never paints the menu behind the next
 * row. Anchored to the trigger's bottom edge and clamped into the viewport.
 */
const POPOVER_STYLE: CSSProperties = {
  position: 'fixed',
  zIndex: 1100,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '6px 8px',
  background: 'var(--dsw-alias-bg-layer-1)',
  border: '1px solid var(--dsw-alias-border-secondary)',
  borderRadius: 8,
}

/**
 * The memory view menu. All hooks run before any conditional rendering.
 * @param props - translation.
 */
export function MemoryViewMenu(props: MemoryViewMenuProps): ReactNode {
  const { t, recordId, label, compact = false } = props
  const [open, setOpen] = useState(false)
  // 失败回执整条留着：owner 的 detail 要能落到 title 上（三个字的 reason 排不了障）。
  const [fail, setFail] = useState<{ reason: string; detail?: string } | undefined>(undefined)
  const [anchor, setAnchor] = useState<{ top: number; left: number } | undefined>(undefined)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  // Section menu keeps the three library views; row menus also offer the
  // pre-existing sidebar quick view (direct viewer tab).
  const entries = recordId === undefined ? MODES.filter(entry => entry.mode !== 'preview') : MODES

  // Close on an outside mousedown while the menu is open.
  useEffect(() => {
    if (!open) return
    const onDocDown = (event: MouseEvent): void => {
      const root = rootRef.current
      if (root !== null && event.target instanceof Node && root.contains(event.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    return () => { document.removeEventListener('mousedown', onDocDown) }
  }, [open])

  const pick = useCallback((mode: MenuEntry): void => {
    if (mode === 'preview') {
      // 速览：旧的侧栏查看器 tab。无 recordId 时开空态（未选记忆），有则直定那条。
      openMemoryTab(recordId ?? '')
      setOpen(false)
      setFail(undefined)
      return
    }
    const result = openMemoryLibrary(mode, recordId)
    setOpen(false)
    setFail(result.ok ? undefined : { reason: result.reason ?? 'absent', detail: result.detail })
  }, [recordId])

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== 'Escape') return
    setOpen(false)
  }, [])

  /** Open/close; compact menus measure the trigger so the fixed chips stay attached. */
  const toggle = useCallback((event: { stopPropagation(): void }): void => {
    // The row's own click toggles selection; the menu must not close the strip.
    event.stopPropagation()
    setFail(undefined)
    if (open) {
      setOpen(false)
      return
    }
    if (compact) {
      const el = triggerRef.current
      if (el !== null) {
        const rect = el.getBoundingClientRect()
        const width = 260
        const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))
        setAnchor({ top: rect.bottom + 4, left })
      }
    }
    setOpen(true)
  }, [compact, open])

  return createElement(
    'div',
    {
      ref: rootRef,
      style: compact ? COMPACT_BAR_STYLE : BAR_STYLE,
      onKeyDown,
      'data-dsh-brief-sidebar': compact ? 'memory-view-row-menu' : 'memory-view-menu',
    },
    createElement(
      'button',
      {
        ref: triggerRef,
        type: 'button' as const,
        style: compact ? COMPACT_TRIGGER_STYLE : TRIGGER_STYLE,
        'aria-haspopup': 'menu',
        'aria-expanded': open,
        onClick: toggle,
      },
      `${label ?? t('memoryView.button')} ▾`,
    ),
    open && createElement(
      'div',
      {
        role: 'menu',
        style: compact && anchor !== undefined
          ? { ...POPOVER_STYLE, top: anchor.top, left: anchor.left, maxWidth: 'calc(100vw - 16px)' }
          : MENU_STYLE,
        'aria-label': t('memoryView.button'),
      },
      ...entries.map(entry => createElement(
        'button',
        {
          key: entry.mode,
          type: 'button' as const,
          role: 'menuitem',
          style: ITEM_STYLE,
          'data-dsh-brief-sidebar': `memory-view-${entry.mode}`,
          onClick: (e: { stopPropagation(): void }) => { e.stopPropagation(); pick(entry.mode) },
        },
        t(entry.key),
      )),
    ),
    fail !== undefined && createElement(
      'div',
      {
        style: FAIL_STYLE,
        'data-dsh-brief-sidebar': 'memory-view-fail',
        ...(fail.detail === undefined ? {} : { title: fail.detail }),
      },
      t(REASON_KEY[fail.reason] ?? 'memoryView.failAbsent'),
    ),
  )
}
