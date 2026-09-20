/**
 * Reading the live `todos` projection — the thin, todo-specific wrapper around
 * the generic face resolver (`../use-projection`). The projection key is
 * registered by `dsh-tool-todo`; the host pushes finished whole values and the
 * client never folds it. Narrowing lives in `./board` (`readTodos`).
 */
import { useMemo } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import { readTodos } from './board'
import type { TodoItem } from './board'
import { useProjectionValue } from '../use-projection'

/** The projection key registered by `dsh-tool-todo`. */
export const TODOS_KEY = 'todos'

/**
 * Subscribe to one session's todo list.
 *
 * @param ctx - the client root context.
 * @param sessionId - the session whose projection is shown.
 * @returns the list, `[]` for a present-but-empty projection, or `undefined`
 *   while the capability is absent.
 */
export function useTodos(ctx: Context | undefined, sessionId: string | undefined): readonly TodoItem[] | undefined {
  const raw = useProjectionValue(ctx, sessionId, TODOS_KEY)
  return useMemo(() => readTodos(raw), [raw])
}
