/**
 * The progress section: the `todos` projection drawn as one part of the
 * summary tab.
 *
 * The official composer-band panel is shadowed by this plugin (see
 * `brief/dock-shadow.tsx`), so the projection is read here and rendered as an
 * ordinary React view — no Canvas, no cross-package dependency. The full-height
 * shell and the scroll container live on the summary tab (`../SummaryTab`);
 * this component renders only its own slice and is the one section whose
 * absent state must stay VISIBLE: the official dock is hidden while this
 * plugin is mounted, so "unavailable" is a statement the reader needs.
 *
 * Colours come from `--dsw-alias-*` tokens only (skin contract), and the status
 * palette uses tokens that actually exist in the shipping theme:
 * `state-success-primary` / `state-business-primary` / `label-tertiary`.
 */
import { createElement } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import { countTodos, progressLine, statusKey } from './brief/board'
import type { TodoItem, TodoStatus } from './brief/board'
import { useTodos } from './brief/use-todos'

/** The session scope better-sidebar hands a tab body. */
export interface TodoScope {
  readonly sessionId?: string
}

export interface TodoSectionProps {
  /** The DSH locale lookup, passed down from `apply`. */
  t: (key: string) => string
  /** The client root context (the tab body's only way to reach services). */
  ctx?: Context
  /** The session this tab is scoped to. */
  scope?: TodoScope
}

/** Status → token colour for the pill's text and border. */
const STATUS_COLOR: Record<TodoStatus, string> = {
  completed: 'var(--dsw-alias-state-success-primary)',
  in_progress: 'var(--dsw-alias-state-business-primary)',
  pending: 'var(--dsw-alias-label-tertiary)',
}

const SECTION_STYLE: CSSProperties = {
  flexShrink: 0,
  borderBottom: '1px solid var(--dsw-alias-border-secondary)',
}

const HEADER_STYLE: CSSProperties = {
  padding: '10px 12px 0',
  color: 'var(--dsw-alias-label-secondary)',
  fontSize: 12,
  fontWeight: 600,
}

const PROGRESS_STYLE: CSSProperties = {
  padding: '6px 12px 10px',
  color: 'var(--dsw-alias-label-secondary)',
  fontSize: 12,
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
export function Notice(props: { title: string; detail?: string }): ReactNode {
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
 * The progress section. The subscription is unconditional (a plain listener,
 * not IO); the three-state contract of the projection is preserved verbatim.
 * @param props - translation, client context, session scope.
 */
export function TodoSection(props: TodoSectionProps): ReactNode {
  const { t, ctx, scope } = props

  const todos = useTodos(ctx, scope?.sessionId)

  if (todos === undefined) {
    // `undefined` is the store's "capability absent": no session, or the host's
    // todo unit is unmounted. Say so rather than showing an empty board.
    return createElement(
      'div',
      { style: SECTION_STYLE, 'data-dsh-brief-sidebar': 'progress-section' },
      createElement('div', { style: HEADER_STYLE }, t('section.progress')),
      createElement(Notice, { title: t('board.unavailable'), detail: t('board.unavailableHint') }),
    )
  }

  if (todos.length === 0) {
    return createElement(
      'div',
      { style: SECTION_STYLE, 'data-dsh-brief-sidebar': 'progress-section' },
      createElement('div', { style: HEADER_STYLE }, t('section.progress')),
      createElement(Notice, { title: t('board.empty'), detail: t('board.emptyHint') }),
    )
  }

  const counts = countTodos(todos)

  return createElement(
    'div',
    { style: SECTION_STYLE, 'data-dsh-brief-sidebar': 'progress-section' },
    createElement('div', { style: HEADER_STYLE }, t('section.progress')),
    createElement('div', { style: PROGRESS_STYLE }, progressLine(counts, t)),
    createElement(
      'ul',
      { style: LIST_STYLE },
      todos.map((item, index) => createElement(TodoRow, { key: `${index}:${item.content}`, item, t })),
    ),
  )
}

/**
 * Backwards-compatible alias for the pre-summary export name. The component
 * no longer owns the full-height shell — that moved to `SummaryTab` — so the
 * alias exists only to keep import sites honest during the transition.
 */
export const TodoBoardTab = TodoSection
