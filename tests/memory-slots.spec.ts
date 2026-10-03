/**
 * Pure-function contract of the memory-slots read side.
 *
 * These tests pin the read-side semantics of the `memorySlots` projection
 * (registered by dsh-prime-memory): `undefined` means the capability is
 * absent (the section hides), a view means the projection is live — an empty
 * `slots` array IS the empty state, because the unit publishes as soon as it
 * registers. The forward-compat fields (`body`/`refs`) must survive only when
 * well-formed, so a future prime-memory view extension renders here without a
 * brief-sidebar change and a malformed extra field can never blank the row.
 */
import { describe, expect, it } from 'vitest'
import { readSlots, truncateBody } from '../src/client/summary/memory-slots'
import { resolveShowMemorySlots } from '../src/client/scope-face'
import type { SettingsScopeSnapshot } from '../src/client/scope-face'

describe('readSlots', () => {
  it('treats an absent value as capability-absent', () => {
    expect(readSlots(undefined)).toBeUndefined()
    expect(readSlots(null)).toBeUndefined()
  })

  it('treats shape drift as capability-absent instead of throwing', () => {
    expect(readSlots('nonsense')).toBeUndefined()
    expect(readSlots(42)).toBeUndefined()
    expect(readSlots([])).toBeUndefined()
    expect(readSlots({})).toBeUndefined()
    expect(readSlots({ rev: 1, count: 0, openCount: 0 })).toBeUndefined()
    expect(readSlots({ rev: 1, count: 0, openCount: 0, slots: 'no' })).toBeUndefined()
    expect(readSlots({ rev: -1, count: 0, openCount: 0, slots: [] })).toBeUndefined()
    expect(readSlots({ rev: 1.5, count: 0, openCount: 0, slots: [] })).toBeUndefined()
  })

  it('keeps a well-formed view, including the all-empty state', () => {
    expect(readSlots({ rev: 3, count: 0, openCount: 0, slots: [] })).toEqual({
      rev: 3,
      count: 0,
      openCount: 0,
      slots: [],
    })
  })

  it('keeps the wire fields verbatim and drops malformed slot entries', () => {
    expect(
      readSlots({
        rev: 7,
        count: 3,
        openCount: 2,
        slots: [
          { id: 's1', title: 'Keep me', kind: 'rule', status: 'open', priority: 80 },
          { title: 'no id', kind: 'rule', status: 'open', priority: 1 },
          { id: '', title: 'empty id', kind: 'rule', status: 'open', priority: 1 },
          { id: 's2', kind: 'rule', status: 'open', priority: 1 },
          { id: 's3', title: 'no kind', status: 'open', priority: 1 },
          { id: 's4', title: 'no status', kind: 'rule', priority: 1 },
          'nonsense',
          null,
        ],
      }),
    ).toEqual({
      rev: 7,
      count: 3,
      openCount: 2,
      slots: [{ id: 's1', title: 'Keep me', kind: 'rule', status: 'open', priority: 80 }],
    })
  })

  it('keeps forward-compat body/refs only when well-formed', () => {
    expect(
      readSlots({
        rev: 1,
        count: 1,
        openCount: 1,
        slots: [
          {
            id: 's1',
            title: 'Rich slot',
            kind: 'anchor',
            status: 'open',
            priority: 50,
            body: 'the remembered rule',
            refs: ['notes/a.md', 42, '', 'notes/b.md'],
          },
        ],
      }),
    ).toEqual({
      rev: 1,
      count: 1,
      openCount: 1,
      slots: [
        {
          id: 's1',
          title: 'Rich slot',
          kind: 'anchor',
          status: 'open',
          priority: 50,
          body: 'the remembered rule',
          refs: ['notes/a.md', 'notes/b.md'],
        },
      ],
    })
  })

  it('drops an empty-string body and an all-invalid refs list', () => {
    const view = readSlots({
      rev: 1,
      count: 1,
      openCount: 1,
      slots: [
        { id: 's1', title: 'Plain', kind: 'todo', status: 'done', priority: 0, body: '', refs: [7, null] },
      ],
    })
    expect(view?.slots[0]).toEqual({
      id: 's1',
      title: 'Plain',
      kind: 'todo',
      status: 'done',
      priority: 0,
    })
  })
})

describe('truncateBody', () => {
  it('flattens whitespace and passes short bodies through', () => {
    expect(truncateBody('  a\n b\t c  ')).toBe('a b c')
  })

  it('cuts long bodies at the limit with an ellipsis', () => {
    const long = 'x'.repeat(200)
    const cut = truncateBody(long)
    expect(cut).toHaveLength(121)
    expect(cut.endsWith('…')).toBe(true)
  })

  it('honours a custom limit', () => {
    expect(truncateBody('abcdef', 3)).toBe('abc…')
  })
})

describe('resolveShowMemorySlots', () => {
  const snapshot = (value: unknown, status: SettingsScopeSnapshot<unknown>['status'] = 'ready'): SettingsScopeSnapshot<never> =>
    ({ status, value, revision: 1, writable: true }) as SettingsScopeSnapshot<never>

  it('defaults to on wherever the config face cannot answer', () => {
    expect(resolveShowMemorySlots(undefined)).toBe(true)
    expect(resolveShowMemorySlots(snapshot(undefined, 'loading'))).toBe(true)
    expect(resolveShowMemorySlots(snapshot(undefined, 'unavailable'))).toBe(true)
    expect(resolveShowMemorySlots(snapshot(undefined))).toBe(true)
  })

  it('is off only on an explicit false', () => {
    expect(resolveShowMemorySlots(snapshot({ showMemorySlots: false }))).toBe(false)
    expect(resolveShowMemorySlots(snapshot({ showMemorySlots: true }))).toBe(true)
    expect(resolveShowMemorySlots(snapshot({}))).toBe(true)
  })
})
