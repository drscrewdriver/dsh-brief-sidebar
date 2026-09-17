/**
 * Pure-function contract of the `todos` read side.
 *
 * These tests pin the THREE-STATE semantics, which is the single easiest thing
 * to get wrong in this plugin: `undefined` means the capability is absent
 * (render "unavailable"), `[]` means the projection is present and empty
 * (render the empty state), and a list means real entries. Collapsing the first
 * two would make a host without the todo unit look like a session with no
 * tasks, which is a silently wrong statement to the reader.
 */
import { describe, expect, it } from 'vitest'
import {
  countTodos,
  progressLine,
  readTodos,
  statusKey,
  unfinishedCount,
} from '../src/client/todo/board'
import type { TodoItem } from '../src/client/todo/board'

/** A translate stub standing in for the real locale binder. */
const t = (key: string): string =>
  ({
    'status.pending': '待处理',
    'status.inProgress': '进行中',
    'status.completed': '已完成',
  })[key] ?? key

describe('readTodos', () => {
  it('treats an absent value as capability-absent, not as an empty list', () => {
    expect(readTodos(undefined)).toBeUndefined()
  })

  it('treats null and [] as a present-but-empty projection', () => {
    expect(readTodos(null)).toEqual([])
    expect(readTodos([])).toEqual([])
  })

  it('treats a non-array, non-null value as capability-absent', () => {
    expect(readTodos('nonsense')).toBeUndefined()
    expect(readTodos({})).toBeUndefined()
    expect(readTodos(0)).toBeUndefined()
  })

  it('keeps well-formed entries verbatim', () => {
    const value = [
      { content: 'write the spec', status: 'completed' },
      { content: 'build the board', status: 'in_progress' },
      { content: 'ship it', status: 'pending' },
    ]
    expect(readTodos(value)).toEqual(value)
  })

  it('drops malformed entries instead of blanking the whole board', () => {
    const value = [
      null,
      42,
      'text',
      {},
      { content: 'no status' },
      { status: 'pending' },
      { content: 7, status: 'pending' },
      { content: 'unknown status', status: 'blocked' },
      { content: 'kept', status: 'pending' },
    ]
    expect(readTodos(value)).toEqual([{ content: 'kept', status: 'pending' }])
  })

  it('does not leak extra fields from the host payload', () => {
    expect(readTodos([{ content: 'a', status: 'pending', id: 'x', priority: 1 }])).toEqual([
      { content: 'a', status: 'pending' },
    ])
  })
})

describe('countTodos / unfinishedCount', () => {
  const todos: readonly TodoItem[] = [
    { content: 'a', status: 'completed' },
    { content: 'b', status: 'completed' },
    { content: 'c', status: 'in_progress' },
    { content: 'd', status: 'pending' },
  ]

  it('counts per status and in total', () => {
    expect(countTodos(todos)).toEqual({ total: 4, completed: 2, inProgress: 1, pending: 1 })
  })

  it('counts an empty list as all zeroes', () => {
    expect(countTodos([])).toEqual({ total: 0, completed: 0, inProgress: 0, pending: 0 })
  })

  it('counts unfinished entries, which is what the tab badge shows', () => {
    expect(unfinishedCount(todos)).toBe(2)
    expect(unfinishedCount([])).toBe(0)
    expect(unfinishedCount([{ content: 'a', status: 'completed' }])).toBe(0)
  })
})

describe('progressLine', () => {
  it('always leads with the completed tally', () => {
    expect(progressLine({ total: 3, completed: 0, inProgress: 0, pending: 3 }, t)).toBe('已完成 0/3 · 待处理 3')
  })

  it('appends the in-progress and pending segments only when non-zero', () => {
    expect(progressLine({ total: 5, completed: 2, inProgress: 1, pending: 2 }, t)).toBe(
      '已完成 2/5 · 进行中 1 · 待处理 2',
    )
    expect(progressLine({ total: 2, completed: 2, inProgress: 0, pending: 0 }, t)).toBe('已完成 2/2')
  })
})

describe('statusKey', () => {
  it('maps each lifecycle value onto its own locale key', () => {
    expect(statusKey('pending')).toBe('status.pending')
    expect(statusKey('in_progress')).toBe('status.inProgress')
    expect(statusKey('completed')).toBe('status.completed')
  })
})
