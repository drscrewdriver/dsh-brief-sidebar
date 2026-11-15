/**
 * Contract tests for the PTC channel: `tool/ptc-dispatch` settle events now
 * fold into the deliverables, skill-usage and search-reference units, exactly
 * as their native `tool/call`+`tool/result` counterparts do.
 *
 * The event shapes here are the host's own, measured on real PTC sessions
 * (9 sessions, 1250 dispatches):
 *
 * - `arguments` is an ALREADY-PARSED object on every successful dispatch (the
 *   host normalizes before logging); the one observed string form was a failed
 *   call with `isError: true`, which these folds skip — but the object entries
 *   must still not crash on it.
 * - the settle carries `meta` like `tool/result` does, so search sources are
 *   readable through the same `readSources` path.
 * - `tool/ptc-dispatch-start` is deliberately NOT folded (the settle is
 *   self-sufficient; folding both would double-count).
 */
import { describe, expect, it } from 'vitest'
import {
  applyDeliverablesEvent,
  initDeliverablesState,
  mutationPath,
  mutationPathOf,
} from '../src/projection/deliverables-fold'
import type { FoldEvent } from '../src/projection/deliverables-fold'
import {
  applySkillUsageEvent,
  initSkillUsageState,
  skillNameFromArgs,
  skillNameOf,
} from '../src/projection/skill-usage-fold'
import {
  applySearchRefEvent,
  CAPS as SEARCH_CAPS,
  initSearchRefState,
  queriesFromArgs,
  queriesOf,
} from '../src/projection/search-ref-fold'
import type { Context } from '@deepseek-ai/cordis'
import {
  registerDeliverablesProjection,
  registerSkillUsageProjection,
  registerSearchRefProjection,
} from '../src/projection/register'
import { DELIVERABLES_KEY, SEARCH_REFS_KEY, SKILL_USAGE_KEY } from '../src/projection/keys'
import { isCodeplanPath, splitCodeplanPath } from '../src/client/summary/deliverables'

interface Captured {
  key: string
  stateVersion: number
}

/** A context whose projection registry just records what was registered. */
function ctxCapturingRegistry(): { ctx: Context; defs: Captured[] } {
  const defs: Captured[] = []
  const registry = {
    register: (definition: Captured) => {
      defs.push(definition)
      return () => {}
    },
  }
  const ctx = {
    inject: (_names: string[], fn: (injected: unknown) => void) => {
      fn({ sessionProjections: registry })
    },
  } as unknown as Context
  return { ctx, defs }
}

/** A PTC dispatch settle event, as the host logs it. */
function dispatch(overrides: {
  name?: string
  arguments?: unknown
  isError?: boolean
  meta?: unknown
  subCallId?: string | null
}): FoldEvent {
  return {
    type: 'tool/ptc-dispatch',
    data: {
      rootCallId: 'root1',
      parentCallId: 'p1',
      subCallId: overrides.subCallId === null ? undefined : (overrides.subCallId ?? 'p1:ptc:1'),
      name: overrides.name ?? 'write',
      arguments: overrides.arguments ?? { file_path: 'a.ts', content: 'x' },
      isError: overrides.isError ?? false,
      content: [{ type: 'text', text: 'ok' }],
      ...(overrides.meta !== undefined ? { meta: overrides.meta } : {}),
    },
  }
}

function turnStart(turn: number): FoldEvent {
  return { type: 'turn/start', data: { turn } }
}

describe('deliverables: PTC dispatch channel', () => {
  it('folds a PTC write whose arguments are an object', () => {
    let state = initDeliverablesState()
    state = applyDeliverablesEvent(state, turnStart(1))
    state = applyDeliverablesEvent(state, dispatch({ name: 'write', arguments: { file_path: 'src/a.ts', content: 'hi' } }))
    expect(state.sessionTotal).toBe(1)
    expect(state.sessionPaths).toEqual(['src/a.ts'])
    expect(state.latest).toEqual({ turn: 1, paths: ['src/a.ts'] })
  })

  it('does not count a failed dispatch (isError: true)', () => {
    let state = initDeliverablesState()
    state = applyDeliverablesEvent(state, turnStart(1))
    state = applyDeliverablesEvent(state, dispatch({ name: 'write', isError: true, arguments: { file_path: 'src/a.ts', content: 'hi' } }))
    expect(state.sessionTotal).toBe(0)
    expect(state.sessionPaths).toEqual([])
  })

  it('does not count a dispatch whose tool is not a mutation', () => {
    let state = initDeliverablesState()
    state = applyDeliverablesEvent(state, turnStart(1))
    state = applyDeliverablesEvent(state, dispatch({ name: 'read', arguments: { file_path: 'src/a.ts' } }))
    expect(state.sessionTotal).toBe(0)
  })

  it('does not fold a dispatch missing subCallId or with a non-string name', () => {
    let state = initDeliverablesState()
    state = applyDeliverablesEvent(state, turnStart(1))
    const before = state
    state = applyDeliverablesEvent(state, dispatch({ subCallId: null, name: 'write' }))
    expect(state).toBe(before)
    state = applyDeliverablesEvent(state, dispatch({ name: 42 as unknown as string }))
    expect(state).toBe(before)
  })

  it('does not fold tool/ptc-dispatch-start (settle is self-sufficient)', () => {
    let state = initDeliverablesState()
    state = applyDeliverablesEvent(state, turnStart(1))
    const before = state
    state = applyDeliverablesEvent(state, { type: 'tool/ptc-dispatch-start', data: { rootCallId: 'r', parentCallId: 'p', subCallId: 'p:ptc:1', name: 'write', arguments: { file_path: 'x.ts', content: 'y' } } })
    expect(state).toBe(before)
  })

  it('does not double-count a path produced by both channels', () => {
    let state = initDeliverablesState()
    state = applyDeliverablesEvent(state, turnStart(1))
    // Native channel: tool/call then a settling tool/result.
    state = applyDeliverablesEvent(state, { type: 'tool/call', data: { turn: 1, step: 0, callId: 'c1', name: 'write', arguments: JSON.stringify({ file_path: 'same.ts', content: 'a' }) } })
    state = applyDeliverablesEvent(state, { type: 'tool/result', data: { turn: 1, step: 1, message: { content: [{ isError: false }], source: { callId: 'c1' } } } })
    // PTC channel: the same path again.
    state = applyDeliverablesEvent(state, dispatch({ name: 'write', arguments: { file_path: 'same.ts', content: 'b' } }))
    expect(state.sessionTotal).toBe(1)
    expect(state.latest?.paths).toEqual(['same.ts'])
  })

  it('parses a codeplan path through splitCodeplanPath classification', () => {
    let state = initDeliverablesState()
    state = applyDeliverablesEvent(state, turnStart(1))
    state = applyDeliverablesEvent(state, dispatch({ name: 'write', arguments: { file_path: 'E:\\test\\rewrite-agently\\.agents\\plans\\my-task\\spec.md', content: 'spec' } }))
    const planPath = state.sessionPaths[0] ?? ''
    expect(planPath.includes('.agents\\plans\\my-task\\spec.md')).toBe(true)
    // The client-side classifier (summary/deliverables.ts) reads the same spelling.
    expect(isCodeplanPath(planPath)).toBe(true)
    expect(splitCodeplanPath(planPath)).toEqual({ task: 'my-task', file: 'spec.md' })
  })

  it('folds a PTC edit and a str_replace_editor create', () => {
    let state = initDeliverablesState()
    state = applyDeliverablesEvent(state, turnStart(1))
    state = applyDeliverablesEvent(state, dispatch({ name: 'edit', arguments: { file_path: 'b.ts', old_string: 'a', new_string: 'b' } }))
    state = applyDeliverablesEvent(state, dispatch({ name: 'str_replace_editor', arguments: { path: 'c.ts', command: 'create', file_text: 'x' } }))
    expect(state.sessionTotal).toBe(2)
    expect(state.sessionPaths).toEqual(['c.ts', 'b.ts'])
  })

  it('native mutationPath still parses the string contract (zero regression)', () => {
    expect(mutationPath('write', JSON.stringify({ file_path: 'x.ts', content: 'y' }))).toBe('x.ts')
    expect(mutationPath('nope', '{}')).toBeNull()
  })
})

describe('skill-usage: PTC dispatch channel', () => {
  it('folds a PTC skill load (callTotal +1)', () => {
    let state = initSkillUsageState()
    state = applySkillUsageEvent(state, turnStart(1))
    state = applySkillUsageEvent(state, dispatch({ name: 'skill', arguments: { name: 'codeplan' } }))
    expect(state.callTotal).toBe(1)
    expect(state.sessionTotal).toBe(1)
    expect(state.items[0]?.name).toBe('codeplan')
    expect(state.latest?.names).toEqual(['codeplan'])
  })

  it('does not count a failed PTC skill load', () => {
    let state = initSkillUsageState()
    state = applySkillUsageEvent(state, turnStart(1))
    state = applySkillUsageEvent(state, dispatch({ name: 'skill', isError: true, arguments: { name: 'codeplan' } }))
    expect(state.callTotal).toBe(0)
  })

  it('ignores non-skill tools even when they carry a name argument', () => {
    let state = initSkillUsageState()
    state = applySkillUsageEvent(state, turnStart(1))
    state = applySkillUsageEvent(state, dispatch({ name: 'write', arguments: { name: 'codeplan', file_path: 'x', content: 'y' } }))
    expect(state.callTotal).toBe(0)
  })

  it('the user-invocation channel still folds (zero regression)', () => {
    let state = initSkillUsageState()
    state = applySkillUsageEvent(state, turnStart(1))
    state = applySkillUsageEvent(state, { type: 'user/message', data: { source: { kind: 'skill-invocation', name: 'codeplan' } } })
    expect(state.callTotal).toBe(1)
    expect(state.items[0]?.name).toBe('codeplan')
  })
})

describe('search-refs: PTC dispatch channel', () => {
  const sources = [
    { url: 'https://a.example/1', title: 'A', snippet: 'first' },
    { url: 'https://b.example/2', title: 'B', snippet: 'second' },
  ]

  it('folds a PTC web_search with queries AND meta sources', () => {
    let state = initSearchRefState()
    state = applySearchRefEvent(state, turnStart(1))
    state = applySearchRefEvent(state, dispatch({
      name: 'web_search',
      arguments: { queries: ['ptc query'] },
      meta: { sources, truncated: false },
    }))
    expect(state.queryTotal).toBe(1)
    expect(state.sourceTotal).toBe(2)
    expect(state.queries[0]).toMatchObject({ query: 'ptc query', tool: 'web_search', hits: 2 })
    expect(state.items.map(i => i.url)).toEqual(['https://b.example/2', 'https://a.example/1'])
    expect(state.items[0]?.host).toBe('b.example')
    expect(state.items[0]?.title).toBe('B')
  })

  it('folds a PTC advanced_search the same way', () => {
    let state = initSearchRefState()
    state = applySearchRefEvent(state, turnStart(1))
    state = applySearchRefEvent(state, dispatch({
      name: 'advanced_search',
      arguments: { query: 'single' },
      meta: { sources: [sources[0]!], provider: 'bing' },
    }))
    expect(state.queryTotal).toBe(1)
    expect(state.sourceTotal).toBe(1)
    expect(state.queries[0]?.tool).toBe('advanced_search')
  })

  it('caps snippets at CAPS.snippet', () => {
    let state = initSearchRefState()
    state = applySearchRefEvent(state, turnStart(1))
    state = applySearchRefEvent(state, dispatch({
      name: 'web_search',
      arguments: { queries: ['q'] },
      meta: { sources: [{ url: 'https://c.example/3', snippet: 'x'.repeat(SEARCH_CAPS.snippet + 50) }] },
    }))
    expect((state.items[0]?.snippet ?? '').length).toBe(SEARCH_CAPS.snippet + 1) // + ellipsis
    expect(state.items[0]?.snippet?.endsWith('…')).toBe(true)
  })

  it('folds queries with zero sources when the dispatch has no meta', () => {
    let state = initSearchRefState()
    state = applySearchRefEvent(state, turnStart(1))
    const before = state
    state = applySearchRefEvent(state, dispatch({ name: 'web_search', arguments: { queries: ['no meta'] } }))
    expect(state.queryTotal).toBe(1)
    expect(state.sourceTotal).toBe(0)
    expect(state.queries[0]?.hits).toBe(0)
    // The latest reference must be preserved unchanged (Object.is stability).
    expect(state.latest).toBe(before.latest)
  })

  it('ignores tools outside SEARCH_TOOLS (advance_fetch stays unfolded)', () => {
    let state = initSearchRefState()
    state = applySearchRefEvent(state, turnStart(1))
    const before = state
    state = applySearchRefEvent(state, dispatch({ name: 'advance_fetch', arguments: { url: 'https://x.example' }, meta: { sources } }))
    expect(state).toBe(before)
  })

  it('settle preserves the latest reference when urls is empty (Object.is)', () => {
    let state = initSearchRefState()
    state = applySearchRefEvent(state, turnStart(1))
    const before = state
    // A native result that settles nothing (no sources).
    state = applySearchRefEvent(state, { type: 'tool/call', data: { turn: 1, step: 0, callId: 'c9', name: 'web_search', arguments: JSON.stringify({ queries: ['empty'] }) } })
    state = applySearchRefEvent(state, { type: 'tool/result', data: { turn: 1, step: 1, message: { content: [{ isError: false }], source: { callId: 'c9' } }, meta: { sources: [] } } })
    expect(state.queryTotal).toBe(1)
    expect(state.latest).toBe(before.latest)
  })

  it('a failed search dispatch counts nothing', () => {
    let state = initSearchRefState()
    state = applySearchRefEvent(state, turnStart(1))
    state = applySearchRefEvent(state, dispatch({ name: 'web_search', isError: true, arguments: { queries: ['boom'] }, meta: { sources } }))
    expect(state.queryTotal).toBe(0)
    expect(state.sourceTotal).toBe(0)
  })

  it('native queriesFromArgs still parses the string contract (zero regression)', () => {
    expect(queriesFromArgs('web_search', JSON.stringify({ queries: ['a', 'b'] }))).toEqual(['a', 'b'])
    expect(queriesFromArgs('nope', '{}')).toBeNull()
  })
})

describe('object-entry boundary guards', () => {
  it('mutationPathOf: non-object, missing fields and string form all return null', () => {
    expect(mutationPathOf('write', undefined)).toBeNull()
    expect(mutationPathOf('write', null)).toBeNull()
    expect(mutationPathOf('write', 'string arguments')).toBeNull()
    expect(mutationPathOf('write', ['array'])).toBeNull()
    expect(mutationPathOf('write', {})).toBeNull()
    expect(mutationPathOf('write', { content: 'no path' })).toBeNull()
    // The observed real failure dispatch: a bare-string arguments on a failed call.
    expect(mutationPathOf('glob', '*')).toBeNull()
    // But a well-formed write with a string-form arguments still parses when
    // routed through the string entry (native channel).
    expect(mutationPathOf('write', { file_path: 'ok.ts', content: 'x' })).toBe('ok.ts')
  })

  it('skillNameOf: boundaries return null, not an exception', () => {
    expect(skillNameOf('skill', undefined)).toBeNull()
    expect(skillNameOf('skill', 'bad')).toBeNull()
    expect(skillNameOf('skill', { name: '' })).toBeNull()
    expect(skillNameOf('skill', { name: '  ' })).toBeNull()
    expect(skillNameOf('skill', { name: 'ok-skill' })).toBe('ok-skill')
    expect(skillNameOf('write', { name: 'ok-skill' })).toBeNull()
    expect(skillNameFromArgs('skill', JSON.stringify({ name: 'via-string' }))).toBe('via-string')
  })

  it('queriesOf: boundaries return null, not an exception', () => {
    expect(queriesOf('web_search', undefined)).toBeNull()
    expect(queriesOf('web_search', 'bad')).toBeNull()
    expect(queriesOf('web_search', {})).toBeNull()
    expect(queriesOf('web_search', { queries: 'not-array' })).toBeNull()
    expect(queriesOf('web_search', { queries: [] })).toBeNull()
    expect(queriesOf('web_search', { queries: ['ok'] })).toEqual(['ok'])
    expect(queriesOf('advanced_search', { query: 'one' })).toEqual(['one'])
    expect(queriesFromArgs('advanced_search', JSON.stringify({ query: 'via-string' }))).toEqual(['via-string'])
  })
})

describe('registration: stateVersion bumps', () => {
  it('asserts deliverables = 1, skillUsage = 2, searchRefs = 3', () => {
    const a = ctxCapturingRegistry()
    registerDeliverablesProjection(a.ctx)
    const b = ctxCapturingRegistry()
    registerSkillUsageProjection(b.ctx)
    const c = ctxCapturingRegistry()
    registerSearchRefProjection(c.ctx)
    expect(a.defs.find(d => d.key === DELIVERABLES_KEY)?.stateVersion).toBe(1)
    expect(b.defs.find(d => d.key === SKILL_USAGE_KEY)?.stateVersion).toBe(2)
    expect(c.defs.find(d => d.key === SEARCH_REFS_KEY)?.stateVersion).toBe(3)
  })
})
