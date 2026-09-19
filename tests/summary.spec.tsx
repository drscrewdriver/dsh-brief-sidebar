/**
 * Pure-function contract of the deliverables read side.
 *
 * These tests pin the read-side semantics of the `dshSummaryDeliverables`
 * projection: `undefined` means the capability is absent (the section hides),
 * and a view means the projection is live — an all-zero view IS the empty
 * state, because the unit publishes as soon as it registers. The codeplan
 * classifier must accept both separator spellings, since produced paths keep
 * the exact spelling the tool received.
 */
import { describe, expect, it } from 'vitest'
import { basename, isCodeplanPath, readDeliverables, splitCodeplanPath } from '../src/client/summary/deliverables'

describe('readDeliverables', () => {
  it('treats an absent value as capability-absent', () => {
    expect(readDeliverables(undefined)).toBeUndefined()
    expect(readDeliverables(null)).toBeUndefined()
  })

  it('treats shape drift as capability-absent instead of throwing', () => {
    expect(readDeliverables('nonsense')).toBeUndefined()
    expect(readDeliverables(42)).toBeUndefined()
    expect(readDeliverables([])).toBeUndefined()
    expect(readDeliverables({})).toBeUndefined()
    expect(readDeliverables({ latest: null })).toBeUndefined()
    expect(readDeliverables({ latest: 7, sessionPaths: [], sessionTotal: 0 })).toBeUndefined()
  })

  it('keeps a well-formed view, including the all-zero empty state', () => {
    expect(readDeliverables({ latest: null, sessionPaths: [], sessionTotal: 0 })).toEqual({
      latest: null,
      sessionPaths: [],
      sessionTotal: 0,
    })
  })

  it('keeps paths verbatim and drops malformed list entries', () => {
    expect(
      readDeliverables({
        latest: { turn: 3, paths: ['a.md', 42, null] },
        sessionPaths: ['a.md', {}, 'b.md'],
        sessionTotal: 2,
      }),
    ).toEqual({
      latest: { turn: 3, paths: ['a.md', 42, null] },
      sessionPaths: ['a.md', 'b.md'],
      sessionTotal: 2,
    })
  })
})

describe('codeplan classification', () => {
  it('recognizes both separator spellings', () => {
    expect(isCodeplanPath('E:\\w\\.agents\\plans\\task-a\\spec.md')).toBe(true)
    expect(isCodeplanPath('E:/w/.agents/plans/task-a/spec.md')).toBe(true)
    expect(isCodeplanPath('out/report.html')).toBe(false)
    expect(isCodeplanPath('E:\\w\\.agents\\plans-other\\x.md')).toBe(false)
  })

  it('splits task name and file name from either spelling', () => {
    expect(splitCodeplanPath('E:\\w\\.agents\\plans\\my-task\\spec.md')).toEqual({
      task: 'my-task',
      file: 'spec.md',
    })
    expect(splitCodeplanPath('E:/w/.agents/plans/my-task/nested/findings.md')).toEqual({
      task: 'my-task',
      file: 'nested/findings.md',
    })
  })

  it('rejects paths without a task folder or a file beneath it', () => {
    expect(splitCodeplanPath('out/report.html')).toBeNull()
    expect(splitCodeplanPath('.agents/plans/')).toBeNull()
    expect(splitCodeplanPath('E:\\w\\.agents\\plans\\task-only\\')).toBeNull()
  })

  it('returns the basename under either separator', () => {
    expect(basename('E:\\w\\.agents\\plans\\t\\tasks.md')).toBe('tasks.md')
    expect(basename('out/report.html')).toBe('report.html')
    expect(basename('plain')).toBe('plain')
  })
})
