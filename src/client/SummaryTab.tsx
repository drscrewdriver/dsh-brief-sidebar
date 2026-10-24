/**
 * The summary tab body: the session's at-a-glance state, composed of sections.
 *
 * Section order: 进展 (the todos board) → 产物 (produced files, codeplan
 * artifacts marked inline) → 引用 (two switchable tabs: 技能 and 记忆).
 * The reference tabs replaced three stacked sections: which skills entered the
 * session, what prime-memory injected and compaction has not overwritten, and
 * the hand-pinned resident slots — all three answer "what is in this session's
 * context", and stacking them pushed the board off a narrow sidebar. Each pane
 * keeps its own data chain and its own gating contract; this component owns
 * only the shell.
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
import type { CtxProbe } from './use-projection'
import { TodoSection } from './TodoBoardTab'
import type { TodoScope } from './TodoBoardTab'
import { DeliverablesSection } from './summary/DeliverablesSection'
import { ReferenceSection } from './summary/ReferenceSection'

export interface SummaryTabProps {
  /** The DSH locale lookup, passed down from `apply`. */
  t: (key: string) => string
  /** The client root context (the tab body's only way to reach services). */
  ctx?: CtxProbe
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
      // 引用：技能页（`dshSummarySkillUsage`，本插件自己的 host 半注册）与记忆页
      // （`memoryRecall` / `memorySlots`，由 dsh-prime-memory 提供，各有开关）并列，
      // 可点击或用左右方向键切换。两个页签都空时整节隐藏（无能力 ≠ 空态）。
      createElement(ReferenceSection, { key: 'references', t, ctx, scope }),
    ),
  )
}
