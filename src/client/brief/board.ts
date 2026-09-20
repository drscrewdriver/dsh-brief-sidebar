/**
 * The `todos` projection — reading and classifying it.
 *
 * The Host computes this projection (`dsh-tool-todo` registers the key) and
 * pushes finished whole values; the client never folds it. This module is the
 * read side of that contract and is deliberately PURE — no React, no context,
 * no IO — so the mapping can be tested directly.
 */
/** The projection's three-state lifecycle (`TodoItem` in `dsh-tool-todo`). */
export type TodoStatus = 'pending' | 'in_progress' | 'completed'

/** One entry of the `todos` projection. */
export interface TodoItem {
  readonly content: string
  readonly status: TodoStatus
}

const STATUSES: readonly TodoStatus[] = ['pending', 'in_progress', 'completed']

/** Locale key per status. Kept here so this module owns the vocabulary. */
const STATUS_KEY: Record<TodoStatus, string> = {
  pending: 'status.pending',
  in_progress: 'status.inProgress',
  completed: 'status.completed',
}

/** Locale key for one status label. */
export function statusKey(status: TodoStatus): string {
  return STATUS_KEY[status]
}

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
export function readTodos(value: unknown): readonly TodoItem[] | undefined {
  if (value === null) return []
  if (!Array.isArray(value)) return undefined

  const items: TodoItem[] = []
  for (const raw of value) {
    if (raw === null || typeof raw !== 'object') continue
    const { content, status } = raw as { content?: unknown; status?: unknown }
    if (typeof content !== 'string') continue
    if (typeof status !== 'string' || !isStatus(status)) continue
    items.push({ content, status })
  }
  return items
}

/** Whether a string is one of the three lifecycle values. */
function isStatus(value: string): value is TodoStatus {
  return (STATUSES as readonly string[]).includes(value)
}

/** Per-status counts over one list. */
export interface TodoCounts {
  readonly total: number
  readonly completed: number
  readonly inProgress: number
  readonly pending: number
}

/** Count a todo list by status. */
export function countTodos(todos: readonly TodoItem[]): TodoCounts {
  let completed = 0
  let inProgress = 0
  let pending = 0
  for (const item of todos) {
    if (item.status === 'completed') completed += 1
    else if (item.status === 'in_progress') inProgress += 1
    else pending += 1
  }
  return { total: todos.length, completed, inProgress, pending }
}

/** How many entries are not finished — the tab badge. */
export function unfinishedCount(todos: readonly TodoItem[]): number {
  const counts = countTodos(todos)
  return counts.inProgress + counts.pending
}

/**
 * The one-line progress summary, composed from parts so no interpolation
 * machinery is needed (the locale binder is a plain key → string lookup).
 * Mirrors the official dock's own label.
 */
export function progressLine(counts: TodoCounts, t: (key: string) => string): string {
  const parts = [`${t('status.completed')} ${counts.completed}/${counts.total}`]
  if (counts.inProgress > 0) parts.push(`${t('status.inProgress')} ${counts.inProgress}`)
  if (counts.pending > 0) parts.push(`${t('status.pending')} ${counts.pending}`)
  return parts.join(' · ')
}
