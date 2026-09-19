import type { Context } from '@deepseek-ai/cordis';
import type { TodoItem } from './board';
/** The projection key registered by `dsh-tool-todo`. */
export declare const TODOS_KEY = "todos";
/**
 * Subscribe to one session's todo list.
 *
 * @param ctx - the client root context.
 * @param sessionId - the session whose projection is shown.
 * @returns the list, `[]` for a present-but-empty projection, or `undefined`
 *   while the capability is absent.
 */
export declare function useTodos(ctx: Context | undefined, sessionId: string | undefined): readonly TodoItem[] | undefined;
