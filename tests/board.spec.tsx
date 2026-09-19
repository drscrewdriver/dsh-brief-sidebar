/**
 * Rendered-output contract of the summary tab.
 *
 * The pure-function tests cover the classification; this file covers what a
 * reader actually sees, and in particular the states that are easy to get
 * wrong in opposite directions:
 *
 * - a hidden tab must render NOTHING (a live view that keeps painting while it
 *   is off screen re-renders on every projection frame);
 * - an absent todos capability must say so rather than showing an empty board,
 *   since "no tasks" and "no data" are different statements;
 * - an absent deliverables capability must hide its section entirely, because
 *   it is an optional enhancement, not the plugin's main duty.
 *
 * Rendering goes through `react-dom/server` on purpose: the tab body is a plain
 * function of its props, so a static render proves the output without shipping a
 * DOM test harness or a second React renderer.
 */
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Context } from '@deepseek-ai/cordis'
import { SummaryTab } from '../src/client/SummaryTab'
import { TodoSection } from '../src/client/TodoBoardTab'
import { DeliverablesSection } from '../src/client/summary/DeliverablesSection'
import { zh } from '../src/client/locales'
import type { TodoItem } from '../src/client/todo/board'

/** A translate stub backed by the REAL shipped dictionary. */
const t = (key: string): string => (zh as Record<string, string>)[key] ?? key

/** The session id every fixture is scoped to. */
const SESSION = 'session-1'

/** URLs the fixture sidebar service has been asked to open (per test). */
const OPENED_URLS: string[] = []

/** A context whose `sessions` service resolves the given raw projection values by key. */
function ctxWithProjections(values: Record<string, unknown>, options?: { sidebar?: boolean }): Context {
  const sessions = {
    binding: (id: string) =>
      id === SESSION
        ? {
          session: {
            projections: {
              faceOf: (key: string) => ({
                getSnapshot: () => values[key],
                subscribe: () => () => {},
              }),
            },
          },
        }
        : undefined,
    list: { getSnapshot: () => ({ byId: { [SESSION]: { cwd: 'E:\\w' } } }) },
  }
  const sidebarRight = options?.sidebar === false
    ? undefined
    : { openResource: (url: string) => { OPENED_URLS.push(url) } }
  return {
    get: (name: string) =>
      name === 'sessions' ? sessions : name === 'sidebarRight' ? sidebarRight : undefined,
  } as unknown as Context
}

/** A context carrying no sessions service at all. */
const CTX_WITHOUT_SESSIONS: Context = {
  get: () => undefined,
} as unknown as Context

/** The todos-only fixture context (the `todos` key set, nothing else). */
function ctxWithTodos(value: unknown): Context {
  return ctxWithProjections({ todos: value })
}

/** Render the summary tab with the standard fixture wiring. */
function render(props: { ctx?: Context; sessionId?: string; visible?: boolean }): string {
  return renderToStaticMarkup(
    createElement(SummaryTab, {
      t,
      ctx: props.ctx,
      scope: { sessionId: props.sessionId ?? SESSION },
      visible: props.visible ?? true,
    }),
  )
}

describe('SummaryTab visibility', () => {
  it('renders nothing while the tab is not the active one', () => {
    const ctx = ctxWithTodos([{ content: 'hidden work', status: 'pending' }])
    expect(render({ ctx, visible: false })).toBe('')
  })

  it('renders the sections while visible', () => {
    const ctx = ctxWithTodos([{ content: 'shown work', status: 'pending' }])
    expect(render({ ctx, visible: true })).toContain('shown work')
  })

  it('tags the root so the tab can be identified in the DOM', () => {
    expect(render({ ctx: ctxWithTodos([]) })).toContain('data-dsh-todo-sidebar="board"')
  })

  it('marks the scroll container separately from the full-height root', () => {
    const markup = render({ ctx: ctxWithTodos([]) })
    // The root declares the height contract; overflow lives on an inner div, so
    // the tab never scrolls the whole page.
    expect(markup).toContain('height:100%')
    expect(markup).toContain('overflow:auto')
  })
})

describe('progress section non-list states', () => {
  it('says the capability is absent instead of showing an empty board', () => {
    const markup = render({ ctx: CTX_WITHOUT_SESSIONS })
    expect(markup).toContain(zh['board.unavailable'])
    expect(markup).not.toContain(zh['board.empty'])
  })

  it('treats a missing session scope as capability-absent', () => {
    const ctx = ctxWithTodos(null)
    const markup = renderToStaticMarkup(
      createElement(SummaryTab, { t, ctx, scope: {}, visible: true }),
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

describe('progress section list', () => {
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

  it('renders the section header and progress summary above the list', () => {
    const markup = render({ ctx: ctxWithTodos(todos) })
    expect(markup).toContain(zh['section.progress'])
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
})

describe('deliverables section three-state', () => {
  const VIEW = {
    latest: { turn: 1, paths: ['out/report.html'] },
    sessionPaths: ['out/report.html'],
    sessionTotal: 1,
  }

  it('hides entirely when the capability is absent', () => {
    const markup = renderToStaticMarkup(
      createElement(DeliverablesSection, { t, ctx: CTX_WITHOUT_SESSIONS, scope: { sessionId: SESSION } }),
    )
    expect(markup).toBe('')
    expect(markup).not.toContain(zh['section.deliverables'])
  })

  it('shows the empty state when the projection is live but nothing was produced', () => {
    const ctx = ctxWithProjections({
      dshSummaryDeliverables: { latest: null, sessionPaths: [], sessionTotal: 0 },
    })
    const markup = renderToStaticMarkup(
      createElement(DeliverablesSection, { t, ctx, scope: { sessionId: SESSION } }),
    )
    expect(markup).toContain(zh['deliverables.empty'])
    expect(markup).toContain(zh['section.deliverables'])
  })

  it('renders one row per produced path with the session total', () => {
    const ctx = ctxWithProjections({ dshSummaryDeliverables: VIEW })
    const markup = renderToStaticMarkup(
      createElement(DeliverablesSection, { t, ctx, scope: { sessionId: SESSION } }),
    )
    expect(markup).toContain('report.html')
    expect(markup).toContain('本会话共 1 个文件')
  })

  it('marks a codeplan artifact with the pill and the task name in its title', () => {
    const ctx = ctxWithProjections({
      dshSummaryDeliverables: {
        latest: { turn: 1, paths: ['E:\\w\\.agents\\plans\\my-task\\spec.md'] },
        sessionPaths: ['E:\\w\\.agents\\plans\\my-task\\spec.md'],
        sessionTotal: 1,
      },
    })
    const markup = renderToStaticMarkup(
      createElement(DeliverablesSection, { t, ctx, scope: { sessionId: SESSION } }),
    )
    expect(markup).toContain(zh['deliverable.codeplanTag'])
    expect(markup).toContain('my-task')
    expect(markup).toContain('spec.md')
  })

  it('tags the section so it can be identified in the DOM', () => {
    const ctx = ctxWithProjections({ dshSummaryDeliverables: VIEW })
    const markup = renderToStaticMarkup(
      createElement(DeliverablesSection, { t, ctx, scope: { sessionId: SESSION } }),
    )
    expect(markup).toContain('data-dsh-todo-sidebar="deliverables-section"')
  })

  it('renders each path as a button routed to the sidebar preview when available', () => {
    OPENED_URLS.length = 0
    const ctx = ctxWithProjections({ dshSummaryDeliverables: VIEW })
    const markup = renderToStaticMarkup(
      createElement(DeliverablesSection, { t, ctx, scope: { sessionId: SESSION } }),
    )
    expect(markup).toContain('<button')
    // Clicking routes the session-scoped file address through the fixture.
    const button = /<button[^>]*>/.exec(markup)?.[0] ?? ''
    expect(button).toContain('cursor:pointer')
  })

  it('degrades to a plain row when the sidebar service is absent', () => {
    const ctx = ctxWithProjections({ dshSummaryDeliverables: VIEW }, { sidebar: false })
    const markup = renderToStaticMarkup(
      createElement(DeliverablesSection, { t, ctx, scope: { sessionId: SESSION } }),
    )
    expect(markup).not.toContain('<button')
    expect(markup).toContain('report.html')
  })
})

describe('TodoSection standalone rendering', () => {
  it('renders its slice without the full-height shell', () => {
    const markup = renderToStaticMarkup(
      createElement(TodoSection, {
        t,
        ctx: ctxWithTodos([{ content: 'a task', status: 'pending' }]),
        scope: { sessionId: SESSION },
      }),
    )
    expect(markup).toContain('a task')
    expect(markup).not.toContain('height:100%')
  })
})
