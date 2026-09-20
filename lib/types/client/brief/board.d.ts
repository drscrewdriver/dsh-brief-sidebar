/**
 * The `todos` projection — reading and classifying it.
 *
 * The Host computes this projection (`dsh-tool-todo` registers the key) and
 * pushes finished whole values; the client never folds it. This module is the
 * read side of that contract and is deliberately PURE — no React, no context,
 * no IO — so the mapping can be tested directly.
 */
/** The projection's three-state lifecycle (`TodoItem` in `dsh-tool-todo`). */
export type TodoStatus = 'pending' | 'in_progress' | 'completed';
/** One entry of the `todos` projection. */
export interface TodoItem {
    readonly content: string;
    readonly status: TodoStatus;
}
/** Locale key for one status label. */
export declare function statusKey(status: TodoStatus): string;
/**
 * Narrow a raw projection value into a todo list.
 *
 * Three outcomes are kept apart on purpose, mirroring the store's own contract:
 * - `undefined` — the capability is ABSENT (no session, the host unit is
 *   unmounted, or no baseline/frame has carried the key yet);
 * - `[]` — the projection is present and the list is empty (`null` on the wire);
 * - a list — real entries.
 *
 * A malformed entry is dropped rather than thrown on: the projection is a
 * trusted Host value, but a shape drift must not blank the whole board.
 *
 * @param value - the raw `unknown` snapshot of the `todos` face.
 * @returns the validated list, or `undefined` when the capability is absent.
 */
export declare function readTodos(value: unknown): readonly TodoItem[] | undefined;
/** Per-status counts over one list. */
export interface TodoCounts {
    readonly total: number;
    readonly completed: number;
    readonly inProgress: number;
    readonly pending: number;
}
/** Count a todo list by status. */
export declare function countTodos(todos: readonly TodoItem[]): TodoCounts;
/** How many entries are not finished — the tab badge. */
export declare function unfinishedCount(todos: readonly TodoItem[]): number;
/**
 * The one-line progress summary, composed from parts so no interpolation
 * machinery is needed (the locale binder is a plain key → string lookup).
 * Mirrors the official dock's own label.
 */
export declare function progressLine(counts: TodoCounts, t: (key: string) => string): string;
