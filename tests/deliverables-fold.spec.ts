/**
 * Pure-function contract of the host-side deliverables fold.
 *
 * The fixtures are hand-written session events shaped like the host's durable
 * log (`tool/call` / `tool/result` / `turn/start`), so no host runtime is
 * needed. What is pinned here is exactly the vocabulary the harness's own
 * deliverables row uses — and the two states that are easy to get wrong:
 * a file written and edited in one turn is ONE entry, and a failed call is
 * NOT an entry.
 */
import { describe, expect, it } from 'vitest'
import { applyDeliverablesEvent, CAPS, initDeliverablesState } from '../src/projection/deliverables-fold'
import type { FoldEvent } from '../src/projection/deliverables-fold'

/** Build a `turn/start` fixture. */
const turnStart = (turn: number): FoldEvent => ({ type: 'turn/start', data: { turn } })

/** Build a `tool/call` fixture for a `write` of the given path. */
const writeCall = (callId: string, path: string): FoldEvent => ({
  type: 'tool/call',
  data: { turn: 1, step: 1, callId, name: 'write', arguments: JSON.stringify({ file_path: path, content: 'x' }) },
})

/** Build a `tool/call` fixture for an `edit` of the given path. */
const editCall = (callId: string, path: string): FoldEvent => ({
  type: 'tool/call',
  data: { turn: 1, step: 1, callId, name: 'edit', arguments: JSON.stringify({ file_path: path, old_string: 'a', new_string: 'b' }) },
})

/** Build a successful `tool/result` fixture pairing the callId. */
const result = (callId: string): FoldEvent => ({
  type: 'tool/result',
  data: { turn: 1, step: 1, message: { content: [{ type: 'tool-result', isError: false }], source: { kind: 'tool', callId } } },
})

/** Build a failed `tool/result` fixture pairing the callId. */
const failedResult = (callId: string): FoldEvent => ({
  type: 'tool/result',
  data: { turn: 1, step: 1, message: { content: [{ type: 'tool-result', isError: true }], source: { kind: 'tool', callId } } },
})

/** Fold a whole event list from the initial state. */
function fold(events: readonly FoldEvent[]) {
  return events.reduce(applyDeliverablesEvent, initDeliverablesState())
}

describe('deliverables fold: mutation vocabulary', () => {
  it('collects a written file when its result settles', () => {
    const state = fold([turnStart(1), writeCall('c1', 'out/a.md'), result('c1')])
    expect(state.latest).toEqual({ turn: 1, paths: ['out/a.md'] })
    expect(state.sessionPaths).toEqual(['out/a.md'])
    expect(state.sessionTotal).toBe(1)
  })

  it('contributes nothing before the result settles', () => {
    const state = fold([turnStart(1), writeCall('c1', 'out/a.md')])
    expect(state.latest).toEqual({ turn: 1, paths: [] })
    expect(state.sessionTotal).toBe(0)
  })

  it('does not count a failed result', () => {
    const state = fold([turnStart(1), writeCall('c1', 'out/a.md'), failedResult('c1')])
    expect(state.latest).toEqual({ turn: 1, paths: [] })
    expect(state.sessionTotal).toBe(0)
  })

  it('recognizes the mutating str_replace_editor commands only', () => {
    const mk = (callId: string, command: string, extra: Record<string, unknown>): FoldEvent => ({
      type: 'tool/call',
      data: {
        turn: 1, step: 1, callId, name: 'str_replace_editor',
        arguments: JSON.stringify({ path: 'x.txt', command, ...extra }),
      },
    })
    const state = fold([
      turnStart(1),
      mk('create', 'create', { file_text: 'x' }),
      mk('bad', 'view', {}),
      mk('sr', 'str_replace', { old_str: 'a', new_str: 'b' }),
      mk('emptyOld', 'str_replace', { old_str: '', new_str: 'b' }),
      mk('insert', 'insert', { insert_line: 0, new_str: 'x' }),
      mk('noLine', 'insert', { new_str: 'x' }),
      result('create'), result('bad'), result('sr'), result('emptyOld'), result('insert'), result('noLine'),
    ])
    expect(state.latest?.paths).toEqual(['x.txt'])
  })

  it('ignores read-class and unknown tools entirely', () => {
    const read = (callId: string): FoldEvent => ({
      type: 'tool/call',
      data: { turn: 1, step: 1, callId, name: 'read', arguments: JSON.stringify({ path: 'x.txt' }) },
    })
    const state = fold([turnStart(1), read('r1'), writeCall('w1', 'x.txt'), result('r1'), result('w1')])
    expect(state.latest?.paths).toEqual(['x.txt'])
  })

  it('treats malformed JSON arguments as a non-mutation', () => {
    const call: FoldEvent = {
      type: 'tool/call',
      data: { turn: 1, step: 1, callId: 'c1', name: 'write', arguments: '{not json' },
    }
    const state = fold([turnStart(1), call, result('c1')])
    expect(state.latest).toEqual({ turn: 1, paths: [] })
  })
})

describe('deliverables fold: dedupe and turn scoping', () => {
  it('keeps a file written and then edited in the same turn as ONE entry', () => {
    const state = fold([
      turnStart(1),
      writeCall('c1', 'out/a.md'),
      editCall('c2', 'out/a.md'),
      result('c1'),
      result('c2'),
    ])
    expect(state.latest?.paths).toEqual(['out/a.md'])
    expect(state.sessionTotal).toBe(1)
  })

  it('opens a fresh bucket per turn and keeps the latest one only', () => {
    const t2 = (callId: string, path: string): FoldEvent => ({
      type: 'tool/call',
      data: { turn: 2, step: 1, callId, name: 'write', arguments: JSON.stringify({ file_path: path, content: 'x' }) },
    })
    const r2 = (callId: string): FoldEvent => ({
      type: 'tool/result',
      data: { turn: 2, step: 1, message: { content: [{ isError: false }], source: { kind: 'tool', callId } } },
    })
    const state = fold([
      turnStart(1), writeCall('c1', 'one.md'), result('c1'),
      turnStart(2), t2('c2', 'two.md'), r2('c2'),
    ])
    expect(state.latest).toEqual({ turn: 2, paths: ['two.md'] })
    expect(state.sessionPaths).toEqual(['two.md', 'one.md'])
    expect(state.sessionTotal).toBe(2)
  })

  it('never lets a late old-turn result rewrite the newer bucket', () => {
    const lateResult: FoldEvent = {
      type: 'tool/result',
      data: { turn: 1, step: 1, message: { content: [{ isError: false }], source: { kind: 'tool', callId: 'c1' } } },
    }
    const state = fold([
      turnStart(1), writeCall('c1', 'one.md'),
      turnStart(2),
      lateResult,
    ])
    expect(state.latest).toEqual({ turn: 2, paths: [] })
    // The path still counted session-wide: capability truth, not bucket loss.
    expect(state.sessionPaths).toEqual(['one.md'])
    expect(state.sessionTotal).toBe(1)
  })
})

describe('deliverables fold: caps and no-op discipline', () => {
  it('returns the same state reference for events it does not own', () => {
    const state = fold([turnStart(1), writeCall('c1', 'a.md'), result('c1')])
    const untouched = applyDeliverablesEvent(state, { type: 'assistant/message', data: {} })
    const unchanged = applyDeliverablesEvent(state, { type: 'tool/result', data: {} })
    expect(untouched).toBe(state)
    expect(unchanged).toBe(state)
  })

  it('caps the latest-turn bucket, keeping the most recent paths', () => {
    let events: FoldEvent[] = [turnStart(1)]
    for (let i = 0; i < CAPS.latest + 10; i += 1) {
      events.push(writeCall(`c${i}`, `f${i}.md`), result(`c${i}`))
    }
    const state = fold(events)
    expect(state.latest?.paths.length).toBe(CAPS.latest)
    expect(state.sessionTotal).toBe(CAPS.latest + 10)
  })

  it('counts a re-produced old path once, and keeps the recent-first order', () => {
    const state = fold([
      turnStart(1), writeCall('c1', 'a.md'), result('c1'),
      turnStart(2), writeCall('c2', 'b.md'), result('c2'),
      turnStart(3), writeCall('c3', 'a.md'), result('c3'),
    ])
    expect(state.sessionPaths).toEqual(['a.md', 'b.md'])
    expect(state.sessionTotal).toBe(2)
  })
})
