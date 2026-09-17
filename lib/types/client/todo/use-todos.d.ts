import type { Context } from '@deepseek-ai/cordis';
import type { TodoItem } from './board';
/** The projection key registered by `dsh-tool-todo`. */
export declare const TODOS_KEY = "todos";
/** Structural view of a projection face (`ObservableSnapshot<unknown>`). */
export interface ProjectionFace {
    getSnapshot(): unknown;
    subscribe(listener: () => void): () => void;
}
/** Structural view of one session binding's projection store. */
export interface ProjectionsLike {
    faceOf(key: string): ProjectionFace;
}
/** Structural view of the client Session Controller face this plugin uses. */
export interface SessionsLike {
    binding(id: string): {
        readonly session: {
            readonly projections: ProjectionsLike;
        };
    } | undefined;
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
export declare function resolveTodosFace(ctx: Context | undefined, sessionId: string | undefined): ProjectionFace;
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
export declare function todosSnapshot(ctx: Context | undefined, sessionId: string | undefined): unknown;
/**
 * Subscribe to one session's todo list.
 *
 * @param ctx - the client root context.
 * @param sessionId - the session whose projection is shown.
 * @returns the list, `[]` for a present-but-empty projection, or `undefined`
 *   while the capability is absent.
 */
export declare function useTodos(ctx: Context | undefined, sessionId: string | undefined): readonly TodoItem[] | undefined;
