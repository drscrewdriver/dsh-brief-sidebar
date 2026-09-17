/**
 * Reading the live `todos` projection from the client Session Controller.
 *
 * better-sidebar tab bodies are NOT rendered inside a DSH slot, so the
 * framework's `useProjection` standard prop is not available to them. The
 * equivalent face is reachable directly: the client Session Controller is a
 * cordis service on the root context, and each session binding exposes its
 * projections store (`SessionFace.projections.faceOf(key)`), which is the very
 * observable `useProjection` resolves. Since it is a bare
 * `{ getSnapshot, subscribe }` source, `useSyncExternalStore` binds it as-is —
 * no local mirror, no folding, and the value reference only changes when the
 * Host pushes a frame.
 *
 * Everything here is resolved defensively: a host without the Session
 * Controller, or a session that is not open any more, degrades to "capability
 * absent" (undefined) rather than throwing inside a render.
 */
import { useCallback, useMemo, useSyncExternalStore } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import { readTodos } from './board'
import type { TodoItem } from './board'

/** The projection key registered by `dsh-tool-todo`. */
export const TODOS_KEY = 'todos'

/** Structural view of a projection face (`ObservableSnapshot<unknown>`). */
export interface ProjectionFace {
  getSnapshot(): unknown
  subscribe(listener: () => void): () => void
}

/** Structural view of one session binding's projection store. */
export interface ProjectionsLike {
  faceOf(key: string): ProjectionFace
}

/** Structural view of the client Session Controller face this plugin uses. */
export interface SessionsLike {
  binding(id: string): { readonly session: { readonly projections: ProjectionsLike } } | undefined
}

/** A no-op unsubscribe, kept as one identity so effects never thrash. */
const NO_SUBSCRIBE = (): void => {}

/** A source that never has a value — the absent-capability face. */
const ABSENT: ProjectionFace = { getSnapshot: () => undefined, subscribe: () => NO_SUBSCRIBE }

/**
 * Whether a value really is a projection face.
 *
 * The store contract promises an identity-stable face for every key, so this
 * never fires against a healthy host. It exists because the fallback is worse
 * than the check: `useSyncExternalStore` would throw on a face-less key, and a
 * thrown render is a blank sidebar rather than a diagnosable "unavailable".
 */
function isFace(value: unknown): value is ProjectionFace {
  if (value === null || typeof value !== 'object') return false
  const face = value as Partial<ProjectionFace>
  return typeof face.getSnapshot === 'function' && typeof face.subscribe === 'function'
}

/**
 * Resolve the `todos` face for one session.
 *
 * `ctx.get('sessions')` is the safe accessor (a direct `ctx.sessions` read can
 * throw on a context that does not carry the service yet).
 *
 * @param ctx - the client root context handed to the tab body.
 * @param sessionId - the tab's session scope; undefined means "no session".
 * @returns the projection face, or {@link ABSENT} when unreachable.
 */
export function resolveTodosFace(ctx: Context | undefined, sessionId: string | undefined): ProjectionFace {
  if (ctx === undefined || sessionId === undefined) return ABSENT
  const sessions = ctx.get('sessions') as SessionsLike | undefined
  if (sessions === undefined || typeof sessions.binding !== 'function') return ABSENT

  const binding = sessions.binding(sessionId)
  const projections = binding?.session?.projections
  if (projections === undefined || typeof projections.faceOf !== 'function') return ABSENT

  const face: unknown = projections.faceOf(TODOS_KEY)
  return isFace(face) ? face : ABSENT
}

/**
 * Read one frame of the `todos` projection without subscribing.
 *
 * The one-shot sibling of {@link useTodos}, for consumers that are not React
 * components — the tab badge is a plain function called on every tab-bar
 * render, so it must neither hold a subscription nor allocate one.
 *
 * @param ctx - the client root context.
 * @param sessionId - the session whose projection is read.
 * @returns the raw snapshot: `undefined` while the capability is absent, `null`
 *   for a present-but-empty projection, else the host's list.
 */
export function todosSnapshot(ctx: Context | undefined, sessionId: string | undefined): unknown {
  return resolveTodosFace(ctx, sessionId).getSnapshot()
}

/**
 * Subscribe to one session's todo list.
 *
 * @param ctx - the client root context.
 * @param sessionId - the session whose projection is shown.
 * @returns the list, `[]` for a present-but-empty projection, or `undefined`
 *   while the capability is absent.
 */
export function useTodos(ctx: Context | undefined, sessionId: string | undefined): readonly TodoItem[] | undefined {
  const face = useMemo(() => resolveTodosFace(ctx, sessionId), [ctx, sessionId])

  const subscribe = useCallback((listener: () => void) => face.subscribe(listener), [face])
  const getSnapshot = useCallback(() => face.getSnapshot(), [face])

  const raw = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return useMemo(() => readTodos(raw), [raw])
}
