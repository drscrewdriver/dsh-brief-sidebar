/**
 * The task board tab body: the `todos` projection drawn in the sidebar.
 *
 * This tab is where the todo list lives. The official composer-band panel is
 * shadowed by this plugin (see `todo/dock-shadow.tsx`), so the projection is
 * read here and rendered as an ordinary React view — no Canvas, no cross-package
 * dependency.
 *
 * Two better-sidebar contracts are honoured:
 *
 * 1. **Height contract.** The tab body mounts inside a full-height column flex
 *    host whose `.paneBody` is a definite-height BLOCK scroll container. The
 *    root declares `height: 100%` + `min-height: 0`, and the scrolling element
 *    is an inner div — not the root.
 * 2. **`visible` pause.** Nothing is drawn while the tab is not the active one,
 *    so a hidden tab does not re-render a list on every projection frame.
 *
 * Colours come from `--dsw-alias-*` tokens only (skin contract), and the status
 * palette uses tokens that actually exist in the shipping theme:
 * `state-success-primary` / `state-business-primary` / `label-tertiary`.
 */
import { createElement } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import { countTodos, progressLine, statusKey } from './todo/board'
import type { TodoItem, TodoStatus } from './todo/board'
import { useTodos } from './todo/use-todos'

/** The session scope better-sidebar hands a tab body. */
export interface TodoScope {
  readonly sessionId?: string
}

export interface TodoBoardTabProps {
  /** The DSH locale lookup, passed down from `apply`. */
  t: (key: string) => string
  /** The client root context (the tab body's only way to reach services). */
  ctx?: Context
  /** The session this tab is scoped to. */
  scope?: TodoScope
  /** Whether the tab is the active one AND the panel is open. */
  visible?: boolean
}

/** Status → token colour for the pill's text and border. */
const STATUS_COLOR: Record<TodoStatus, string> = {
  completed: 'var(--dsw-alias-state-success-primary)',
  in_progress: 'var(--dsw-alias-state-business-primary)',
  pending: 'var(--dsw-alias-label-tertiary)',
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

const PROGRESS_STYLE: CSSProperties = {
  padding: '10px 12px',
  borderBottom: '1px solid var(--dsw-alias-border-secondary)',
  color: 'var(--dsw-alias-label-secondary)',
  fontSize: 12,
  flexShrink: 0,
}

const LIST_STYLE: CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: '6px 0',
  display: 'flex',
  flexDirection: 'column',
}

const ROW_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
  padding: '6px 12px',
}

/** Pill style, coloured per status. */
function pillStyle(status: TodoStatus): CSSProperties {
  return {
    flexShrink: 0,
    color: STATUS_COLOR[status],
    border: `1px solid ${STATUS_COLOR[status]}`,
    borderRadius: 999,
    padding: '0 6px',
    fontSize: 11,
    lineHeight: '16px',
    whiteSpace: 'nowrap',
  }
}

/** Task text: finished entries read as done, the working one as active. */
function contentStyle(status: TodoStatus): CSSProperties {
  return {
    minWidth: 0,
    overflowWrap: 'anywhere',
    color:
      status === 'completed'
        ? 'var(--dsw-alias-label-tertiary)'
        : status === 'in_progress'
          ? 'var(--dsw-alias-label-primary)'
          : 'var(--dsw-alias-label-secondary)',
    textDecoration: status === 'completed' ? 'line-through' : 'none',
  }
}

/** Centred message block used by every non-list state. */
function Notice(props: { title: string; detail?: string }): ReactNode {
  return (
    <div
      style={{
        margin: '0 auto',
        padding: 24,
        maxWidth: 460,
        textAlign: 'center',
        color: 'var(--dsw-alias-label-tertiary)',
        lineHeight: 1.7,
        fontSize: 12,
      }}
    >
      <div style={{ marginBottom: 6, color: 'var(--dsw-alias-label-secondary)' }}>{props.title}</div>
      {props.detail === undefined ? null : <div>{props.detail}</div>}
    </div>
  )
}

/** One task row. */
function TodoRow(props: { item: TodoItem; t: (key: string) => string }): ReactNode {
  const { item, t } = props
  return createElement(
    'li',
    { style: ROW_STYLE },
    createElement('span', { style: pillStyle(item.status) }, t(statusKey(item.status))),
    createElement('span', { style: contentStyle(item.status) }, item.content),
  )
}

/**
 * The task board.
 * @param props - translation, client context, session scope, visibility.
 */
export function TodoBoardTab(props: TodoBoardTabProps): ReactNode {
  const { t, ctx, scope, visible = true } = props

  // The subscription is unconditional (a plain listener, not IO), but the body
  // below is only built while the tab is actually on screen.
  const todos = useTodos(ctx, scope?.sessionId)

  if (!visible) return null

  if (todos === undefined) {
    // `undefined` is the store's "capability absent": no session, or the host's
    // todo unit is unmounted. Say so rather than showing an empty board.
    return createElement(
      'div',
      { style: ROOT_STYLE, 'data-dsh-todo-sidebar': 'board' },
      createElement(Notice, { title: t('board.unavailable'), detail: t('board.unavailableHint') }),
    )
  }

  if (todos.length === 0) {
    return createElement(
      'div',
      { style: ROOT_STYLE, 'data-dsh-todo-sidebar': 'board' },
      createElement(Notice, { title: t('board.empty'), detail: t('board.emptyHint') }),
    )
  }

  const counts = countTodos(todos)

  return createElement(
    'div',
    { style: ROOT_STYLE, 'data-dsh-todo-sidebar': 'board' },
    createElement('div', { style: PROGRESS_STYLE }, progressLine(counts, t)),
    createElement(
      'div',
      { style: SCROLL_STYLE },
      createElement(
        'ul',
        { style: LIST_STYLE },
        todos.map((item, index) => createElement(TodoRow, { key: `${index}:${item.content}`, item, t })),
      ),
    ),
  )
}
