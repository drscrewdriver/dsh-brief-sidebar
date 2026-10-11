/**
 * The summary tab body: the session's at-a-glance state, composed of sections.
 *
 * Section order: 进展 (the todos board) → 产物 (produced files, codeplan
 * artifacts marked inline) → 本会话召回 (what prime-memory injected into this
 * session and compaction has not overwritten) → 记忆槽位 (hand-pinned resident
 * conventions, off by default). Each section owns its own data chain and its
 * own gating contract; this component owns only the shell.
 *
 * Two better-sidebar contracts are honoured:
 *
 * 1. **Height contract.** The tab body mounts inside a full-height column flex
 *    host whose `.paneBody` is a definite-height BLOCK scroll container. The
 *    root declares `height: 100%` + `min-height: 0`, and the scrolling element
 *    is an inner div — not the root. Sections are non-scrolling slices with a
 *    bottom border; the inner div scrolls them all.
 * 2. **`visible` pause.** Nothing is drawn while the tab is not the active
 *    one, so a hidden tab does not re-render on every projection frame.
 */
import { createElement } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import { TodoSection } from './TodoBoardTab'
import type { TodoScope } from './TodoBoardTab'
import { DeliverablesSection } from './summary/DeliverablesSection'
import { MemorySlotsSection } from './summary/MemorySlotsSection'
import { MemoryRecallSection } from './summary/MemoryRecallSection'

export interface SummaryTabProps {
  /** The DSH locale lookup, passed down from `apply`. */
  t: (key: string) => string
  /** The client root context (the tab body's only way to reach services). */
  ctx?: Context
  /** The session this tab is scoped to. */
  scope?: TodoScope
  /** Whether the tab is the active one AND the panel is open. */
  visible?: boolean
}

const ROOT_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0,
  background: 'var(--dsw-alias-bg-layer-1)',
  color: 'var(--dsw-alias-label-primary)',
  font: 'inherit',
  fontSize: 13,
}

const SCROLL_STYLE: CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto' }

/**
 * The summary tab.
 * @param props - translation, client context, session scope, visibility.
 */
export function SummaryTab(props: SummaryTabProps): ReactNode {
  const { t, ctx, scope, visible = true } = props

  // A hidden tab renders NOTHING — not even the shell — so it never
  // re-renders on a projection frame while it is off screen.
  if (!visible) return null

  return createElement(
    'div',
    { style: ROOT_STYLE, 'data-dsh-brief-sidebar': 'board' },
    createElement('div', { style: SCROLL_STYLE },
      createElement(TodoSection, { key: 'progress', t, ctx, scope }),
      createElement(DeliverablesSection, { key: 'deliverables', t, ctx, scope }),
      // 本会话召回（固定最底）：入口开关（configForms `showMemoryRecall`，默认开）
      // 与能力存在（dsh-prime-memory 的 `memoryRecall` 投影）缺一即整段隐藏。
      // 这是"模型此刻看到哪些记忆"的诚实视图：非常驻，压缩后即清空。
      createElement(MemoryRecallSection, { key: 'memory-recall', t, ctx, scope }),
      // 记忆槽位分区：手动 pin 的常驻约定（`memorySlots` 投影），默认关。
      createElement(MemorySlotsSection, { key: 'memory-slots', t, ctx, scope }),
    ),
  )
}
