/**
 * The 「查看 ▾」 control for one echo row (and the echo section header).
 *
 * Rows used to be a single button straight into the original-card viewer. That
 * answered "what did the card say", but not "where does this live in spirit":
 * the 条目 list and the star map are two different pages there, and the footer
 * links sit far below a long row list. So each row gets the same popover the
 * memory rows already have (速览 / 条目 / 2D·3D), with echo's three targets:
 *
 * - 原文 → this plugin's own viewer tab (`dsh-md-echo-viewer:echo`);
 * - 条目 → spirit 翻阅 → 回响 (`dsh-spirit:open-sea` target=`echo`);
 * - 星图 → spirit 星海星图 (`dsh-spirit:open-sea` target=`graph`).
 *
 * The owner answers synchronously, so a failure lands as readable copy on the
 * trigger's tooltip instead of a dead click.
 *
 * Colours come from `--dsw-alias-*` tokens only (skin contract).
 */
import { createElement, useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'
import { openEchoTab } from '../memory-tab'
import { openSpiritEcho } from '../spirit-open'

export interface EchoViewMenuProps {
  /** The DSH locale lookup, passed down from `apply`. */
  t: (key: string) => string
  /** The session the row belongs to (the viewer tab needs it). */
  sessionId?: string
  /** The echo id this row points at; absent = section-level menu. */
  echoId?: string
  /** Trigger copy; defaults to `echo.viewMenu` + caret. */
  label?: string
}

type MenuEntry = 'original' | 'entry' | 'graph'

/** Menu entries, in reading order. */
const ENTRIES: ReadonlyArray<{ mode: MenuEntry; key: string }> = [
  { mode: 'original', key: 'echo.openOriginal' },
  { mode: 'entry', key: 'echo.goto' },
  { mode: 'graph', key: 'echo.gotoGraph' },
]

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
  whiteSpace: 'nowrap',
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
  whiteSpace: 'nowrap',
}

/**
 * Anchored INSIDE the row wrapper (absolute), not fixed-to-viewport.
 *
 * 实测：主栏带缩放的皮肤下，用按钮的 viewport 坐标去摆 fixed 弹层会落到视口外
 * （量到 trigger(1613,926) 而弹层在 (1692,1730)）。不量坐标就没有这类错位——弹层
 * 跟着行走，唯一代价是贴到面板边缘时可能被裁一点，滚一下就能看全。
 */
const POPOVER_STYLE: CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 4px)',
  right: 0,
  zIndex: 1100,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '6px 8px',
  background: 'var(--dsw-alias-bg-layer-1)',
  border: '1px solid var(--dsw-alias-border-secondary)',
  borderRadius: 8,
}

const WRAP_STYLE: CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  minWidth: 0,
}

/**
 * The echo row menu. All hooks run before any conditional rendering.
 * @param props - translation, session scope, row id.
 */
export function EchoViewMenu(props: EchoViewMenuProps): ReactNode {
  const { t, sessionId, echoId, label } = props
  const [open, setOpen] = useState(false)
  const [fail, setFail] = useState<{ reason: string; detail?: string } | undefined>(undefined)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

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
    setOpen(false)
    if (mode === 'original') {
      openEchoTab(sessionId ?? '', echoId ?? '')
      setFail(undefined)
      return
    }
    // 选单叫「条目」，深链口叫 `echo`（spirit 那边的页面名）——这里就这一处对照。
    const result = openSpiritEcho(mode === 'entry' ? 'echo' : 'graph')
    setFail(result.ok ? undefined : { reason: result.reason ?? 'absent', detail: result.detail })
  }, [echoId, sessionId])

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== 'Escape') return
    setOpen(false)
  }, [])

  /** Open/close. The chips hang off the trigger's own box, so no coordinates are measured. */
  const toggle = useCallback((event: { stopPropagation(): void }): void => {
    // The row's own click opens the viewer; the menu must not trigger it.
    event.stopPropagation()
    setFail(undefined)
    setOpen((value) => !value)
  }, [])

  return createElement(
    'div',
    {
      ref: rootRef,
      style: WRAP_STYLE,
      onKeyDown,
      'data-dsh-brief-sidebar': echoId === undefined ? 'echo-view-menu' : 'echo-view-row-menu',
    },
    createElement(
      'button',
      {
        ref: triggerRef,
        type: 'button' as const,
        style: TRIGGER_STYLE,
        'aria-haspopup': 'menu',
        'aria-expanded': open,
        ...(fail === undefined ? {} : { title: `${t('echo.gotoFail')}（${fail.reason}）${fail.detail ?? ''}` }),
        onClick: toggle,
      },
      `${label ?? t('echo.viewMenu')} ▾`,
    ),
    open && createElement(
      'div',
      {
        role: 'menu',
        style: { ...POPOVER_STYLE, maxWidth: 'calc(100vw - 16px)' },
        'aria-label': t('echo.viewMenu'),
      },
      ...ENTRIES.map(entry => createElement(
        'button',
        {
          key: entry.mode,
          type: 'button' as const,
          role: 'menuitem',
          style: ITEM_STYLE,
          'data-dsh-brief-sidebar': `echo-view-${entry.mode}`,
          onClick: (e: { stopPropagation(): void }) => { e.stopPropagation(); pick(entry.mode) },
        },
        t(entry.key),
      )),
    ),
  )
}
