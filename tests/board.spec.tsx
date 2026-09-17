/**
 * Rendered-output contract of the board tab.
 *
 * The pure-function tests cover the classification; this file covers what a
 * reader actually sees, and in particular the two states that are easy to get
 * wrong in opposite directions:
 *
 * - a hidden tab must render NOTHING (a live view that keeps painting while it
 *   is off screen re-renders on every projection frame);
 * - an absent capability must say so rather than showing an empty board, since
 *   "no tasks" and "no data" are different statements.
 *
 * Rendering goes through `react-dom/server` on purpose: the tab body is a plain
 * function of its props, so a static render proves the output without shipping a
 * DOM test harness or a second React renderer.
 */
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Context } from '@deepseek-ai/cordis'
import { TodoBoardTab } from '../src/client/TodoBoardTab'
import { zh } from '../src/client/locales'
import type { TodoItem } from '../src/client/todo/board'

/** A translate stub backed by the REAL shipped dictionary. */
const t = (key: string): string => (zh as Record<string, string>)[key] ?? key

/** The session id every fixture is scoped to. */
const SESSION = 'session-1'

/** A context whose `sessions` service resolves the given raw projection value. */
function ctxWithTodos(value: unknown): Context {
  const face = { getSnapshot: () => value, subscribe: () => () => {} }
  const sessions = {
    binding: (id: string) =>
      id === SESSION ? { session: { projections: { faceOf: () => face } } } : undefined,
  }
  return { get: (name: string) => (name === 'sessions' ? sessions : undefined) } as unknown as Context
}

/** A context carrying no sessions service at all. */
const CTX_WITHOUT_SESSIONS: Context = {
  get: () => undefined,
} as unknown as Context

/** Render the tab with the standard fixture wiring. */
function render(props: {
  ctx?: Context
  sessionId?: string
  visible?: boolean
}): string {
  return renderToStaticMarkup(
    createElement(TodoBoardTab, {
      t,
      ctx: props.ctx,
      scope: { sessionId: props.sessionId ?? SESSION },
      visible: props.visible ?? true,
    }),
  )
}

describe('TodoBoardTab visibility', () => {
  it('renders nothing while the tab is not the active one', () => {
    const ctx = ctxWithTodos([{ content: 'hidden work', status: 'pending' }])
    expect(render({ ctx, visible: false })).toBe('')
  })

  it('renders the board while visible', () => {
    const ctx = ctxWithTodos([{ content: 'shown work', status: 'pending' }])
    expect(render({ ctx, visible: true })).toContain('shown work')
  })
})

describe('TodoBoardTab non-list states', () => {
  it('says the capability is absent instead of showing an empty board', () => {
    const markup = render({ ctx: CTX_WITHOUT_SESSIONS })
    expect(markup).toContain(zh['board.unavailable'])
    expect(markup).not.toContain(zh['board.empty'])
  })

  it('treats a missing session scope as capability-absent', () => {
    const ctx = ctxWithTodos(null)
    const markup = renderToStaticMarkup(
      createElement(TodoBoardTab, { t, ctx, scope: {}, visible: true }),
    )
    expect(markup).toContain(zh['board.unavailable'])
  })

  it('shows the empty state for a present-but-empty projection', () => {
    // `null` is the host's "registered key, no list yet" value.
    const markup = render({ ctx: ctxWithTodos(null) })
    expect(markup).toContain(zh['board.empty'])
    expect(markup).not.toContain(zh['board.unavailable'])
  })

  it('shows the empty state for an empty array too', () => {
    expect(render({ ctx: ctxWithTodos([]) })).toContain(zh['board.empty'])
  })
})

describe('TodoBoardTab list', () => {
  const todos: readonly TodoItem[] = [
    { content: 'write the spec', status: 'completed' },
    { content: 'build the board', status: 'in_progress' },
    { content: 'ship it', status: 'pending' },
  ]

  it('renders one row per entry, with its own status label', () => {
    const markup = render({ ctx: ctxWithTodos(todos) })
    for (const item of todos) expect(markup).toContain(item.content)
    expect(markup).toContain(zh['status.completed'])
    expect(markup).toContain(zh['status.inProgress'])
    expect(markup).toContain(zh['status.pending'])
  })

  it('renders the progress summary above the list', () => {
    const markup = render({ ctx: ctxWithTodos(todos) })
    expect(markup).toContain('已完成 1/3')
    expect(markup).toContain('进行中 1')
    expect(markup).toContain('待处理 1')
  })

  it('omits the zero-count segments', () => {
    const markup = render({
      ctx: ctxWithTodos([{ content: 'done', status: 'completed' }]),
    })
    expect(markup).toContain('已完成 1/1')
    expect(markup).not.toContain('进行中')
    expect(markup).not.toContain('待处理')
  })

  it('drops malformed entries from the rendered list', () => {
    const markup = render({
      ctx: ctxWithTodos([{ content: 'good', status: 'pending' }, { status: 'pending' }, null]),
    })
    expect(markup).toContain('good')
    expect(markup).toContain('已完成 0/1')
  })

  it('marks the scroll container separately from the full-height root', () => {
    const markup = render({ ctx: ctxWithTodos(todos) })
    // The root declares the height contract; overflow lives on an inner div, so
    // the tab never scrolls the whole page.
    expect(markup).toContain('height:100%')
    expect(markup).toContain('overflow:auto')
  })

  it('tags the root so the tab can be identified in the DOM', () => {
    expect(render({ ctx: ctxWithTodos(todos) })).toContain('data-dsh-todo-sidebar="board"')
  })
})
