/**
 * Host-side fold of skill-usage facts — the projection unit state for
 * `dshSummarySkillUsage`: which skills this session actually referenced, and
 * which ones it was offered.
 *
 * Two channels feed "referenced", and both are the host's own words:
 *
 * 0. In PTC mode there is no root `tool/call` at all: the loader runs as a
 *    child dispatch, whose single `tool/ptc-dispatch` event carries the
 *    arguments and the outcome together (see the dispatch branch in `apply`).
 * 1. `tool/call` on the skill loader plus a successful `tool/result`. The
 *    loader is registered as `skill` with a single `name` argument, and that
 *    registration is byte-identical on every supported line — verified per tag
 *    (`name: 'skill'` + `The exact skill name` present from `dsh-v0.1.0-rc.8`
 *    through `dsh-v0.2.0-rc.2`). The name comes out of `arguments`.
 * 2. `user/message` with `source.kind === 'skill-invocation'` — the durable,
 *    machine-readable marker the host files when a skill's `<skill_content>`
 *    block is injected. This is the *user-invoked* path, and the host's own
 *    catalog prompt tells the model not to call the `skill` tool for it
 *    (`tool-skill/src/index.ts:267`), so a fold that reads only channel 1 misses
 *    every direct invocation: measured on 250 real sessions, 10 of the 19
 *    sessions carrying an invocation had no `skill` tool call at all.
 *
 * A third channel is recorded separately because it means something else:
 * `source.kind === 'skill-catalog'` lists the skills *available* to this
 * session. The host's contract says each frame carries "exactly the entries
 * this message published" and `update?: true` marks a replacement rather than
 * the first publication — so the fold REPLACES its list per frame; unioning
 * would make the list only ever grow after a skill was withdrawn.
 *
 * What this fold deliberately does NOT read: `tool/result.meta`. The skill tool
 * declares no `presentationMeta` on any line (checked the same way), so there
 * is no structured payload to read — the argument is the whole fact. Nor does
 * it read the result or injected text: the SKILL.md body is model-facing prose,
 * and scraping it would make a second source of truth out of a presentation.
 *
 * Success is required on channel 1, matching `deliverables-fold`: a
 * `tool/result` with `isError: true` means the skill never loaded, so claiming
 * a reference would be a lie. Counts are per distinct skill, order is
 * most-recent-first, and the state is bounded like every other unit because
 * the registry folds it per committed event.
 *
 * This module is deliberately PURE — no cordis, no zod, no IO — so the fold
 * can be tested directly against hand-written event fixtures.
 */
import type { FoldEvent } from './deliverables-fold'

/** One skill's session-wide tally. */
export interface SkillUsageEntry {
  readonly name: string
  /** Successful loads of this skill so far. */
  readonly count: number
  /** Turn whose call this tally last advanced. */
  readonly lastTurn: number
}

/** Fold state. Plain JSON, so the projection cache can persist it. */
export interface SkillUsageState {
  /** Turn number of the open (or latest seen) turn; 0 before the first turn. */
  readonly turn: number
  /** Open turns' `callId → skill name` map; only resolvable skill calls are recorded. */
  readonly calls: Readonly<Record<string, { readonly turn: number; readonly skill: string }>>
  /** Skills referenced in the latest turn so far (`null` before the first turn). */
  readonly latest: { readonly turn: number; readonly names: readonly string[] } | null
  /** Distinct referenced skills, most-recent-first, capped (see CAPS). */
  readonly items: readonly SkillUsageEntry[]
  /** Distinct referenced skills over the whole session, uncapped. */
  readonly sessionTotal: number
  /** Successful references over the whole session, both channels included. */
  readonly callTotal: number
  /** The session's current available-skill catalog, in catalog order (capped). */
  readonly catalog: readonly string[]
  /** How many entries the latest catalog frame really published (may exceed `catalog`). */
  readonly catalogCount: number
}

/**
 * Capacity bounds. The unit rides every committed event, so the lists are
 * capped; `sessionTotal`/`callTotal` keep the summary truthful beyond the cap.
 */
export const CAPS = {
  /** Distinct skills kept in state (most recent win). */
  session: 50,
  /** Skills kept in the latest-turn bucket of the wire view. */
  latest: 20,
  /** Distinct skills kept in the wire view. */
  view: 20,
  /**
   * Available-skill names kept in state. Real catalogs measured 71–88 entries
   * on this machine, so the bound sits above them with room to spare — the
   * wire only ever carries `CAPS.available` names plus the truthful count.
   */
  available: 120,
} as const

/** The fold's initial state: no skill has been referenced or offered yet. */
export function initSkillUsageState(): SkillUsageState {
  return { turn: 0, calls: {}, latest: null, items: [], sessionTotal: 0, callTotal: 0, catalog: [], catalogCount: 0 }
}

/**
 * Extract the skill name from one committed `tool/call`.
 *
 * @param name - wire tool name; only the host's `skill` loader counts.
 * @param argsRaw - model-produced JSON arguments (a string by the session contract).
 * @returns the non-blank skill name, or null when this call is not a skill load.
 */
export function skillNameFromArgs(name: string, argsRaw: string): string | null {
  // The name is the version-pinned fact: `defineTool({ name: 'skill', … })` on
  // all six lines. Anything else — even a `write` that happens to carry a
  // `name` argument — is not a skill reference.
  if (name !== 'skill') return null
  let args: unknown
  try {
    args = JSON.parse(argsRaw) as unknown
  } catch {
    return null
  }
  if (typeof args !== 'object' || args === null || Array.isArray(args)) return null
  const skill = (args as Record<string, unknown>)['name']
  // Blank-but-present names are a model slip, not a reference; the exact
  // spelling is preserved for everything else.
  return typeof skill === 'string' && skill.trim().length > 0 ? skill : null
}

/**
 * Advance one reference tally. Both channels of "this skill was referenced"
 * land here, so a direct invocation and a tool load of the same skill share one
 * row rather than appearing twice.
 * @param state - the state before the reference.
 * @param skill - the skill name, exactly as published.
 * @param turn - the turn whose call/injection this reference belongs to.
 */
function tally(state: SkillUsageState, skill: string, turn: number): SkillUsageState {
  const existing = state.items.find((item) => item.name === skill)
  const withoutSkill = state.items.filter((item) => item.name !== skill)
  const items = [{ name: skill, count: (existing?.count ?? 0) + 1, lastTurn: turn }, ...withoutSkill]
    .slice(0, CAPS.session)

  // A name that had been capped away can re-enter, and the deliverables fold
  // counts that as new again rather than pretending it knows the true distinct
  // set; the same trade-off applies here, so `sessionTotal` is a floor reached
  // by monotone counting over the capped window.
  const sessionTotal = existing === undefined ? state.sessionTotal + 1 : state.sessionTotal

  // A stray result settling after a LATER turn opened never rewrites the newer
  // bucket — its tally still counts above.
  const latest = state.latest
  const nextLatest = latest !== null && latest.turn === turn && !latest.names.includes(skill)
    ? { turn: latest.turn, names: [...latest.names, skill] }
    : latest

  return { ...state, latest: nextLatest, items, sessionTotal, callTotal: state.callTotal + 1 }
}

/**
 * The next state after one committed event. Events this fold does not own
 * return the SAME reference — an unchanged reference produces zero downstream
 * work in the registry's `Object.is` drive.
 *
 * @param state - the state covering all prior events.
 * @param event - the next committed session event.
 * @returns the next state (same reference when nothing the fold tracks moved).
 */
export function applySkillUsageEvent(state: SkillUsageState, event: FoldEvent): SkillUsageState {
  if (event.type === 'turn/start') {
    const turn = event.data as { turn?: unknown }
    if (typeof turn?.turn !== 'number') return state
    // Keep the previous turn's pending calls until their results settle; older
    // ones can never be claimed legitimately, so pruning bounds the map.
    const calls: Record<string, { readonly turn: number; readonly skill: string }> = {}
    for (const [id, entry] of Object.entries(state.calls)) {
      if (entry.turn >= turn.turn - 1) calls[id] = entry
    }
    return { ...state, turn: turn.turn, calls, latest: { turn: turn.turn, names: [] } }
  }

  if (event.type === 'tool/call') {
    const call = event.data as { callId?: unknown; name?: unknown; arguments?: unknown }
    if (typeof call?.callId !== 'string') return state
    if (typeof call.name !== 'string' || typeof call.arguments !== 'string') return state
    const skill = skillNameFromArgs(call.name, call.arguments)
    // A skill call with unreadable arguments is not recorded at all: a later
    // result then settles nothing, which is the honest reading of "never loaded".
    if (skill === null) return state
    return { ...state, calls: { ...state.calls, [call.callId]: { turn: state.turn, skill } } }
  }

  if (event.type === 'user/message') {
    const message = event.data as { source?: unknown }
    if (message?.source === null || typeof message.source !== 'object') return state
    const source = message.source as { kind?: unknown; name?: unknown; entries?: unknown }

    if (source.kind === 'skill-invocation') {
      // The host's own marker that a skill's instructions entered the context.
      // Blank or drifted names are ignored rather than guessed at.
      const skill = typeof source.name === 'string' && source.name.trim().length > 0 ? source.name : null
      if (skill === null) return state
      return tally(state, skill, state.turn)
    }

    if (source.kind === 'skill-catalog') {
      // A catalog frame is a full snapshot of what is available NOW, so it
      // replaces the list. A frame whose entries drifted into a non-array is
      // unreadable rather than empty, and must not clear what we already know.
      if (!Array.isArray(source.entries)) return state
      const names: string[] = []
      for (const entry of source.entries) {
        if (entry === null || typeof entry !== 'object') continue
        const published = (entry as Record<string, unknown>)['name']
        if (typeof published !== 'string' || published.trim().length === 0) continue
        if (!names.includes(published)) names.push(published)
      }
      return { ...state, catalog: names.slice(0, CAPS.available), catalogCount: names.length }
    }

    return state
  }

  // PTC mode: `skill` runs as a child dispatch, so there is no root `tool/call`
  // to pair with a later `tool/result`. The dispatch is one self-contained
  // fact — arguments plus outcome — and the same success gate applies.
  if (event.type === 'tool/ptc-dispatch') {
    const dispatch = event.data as { name?: unknown; arguments?: unknown; isError?: unknown }
    if (dispatch?.isError === true) return state
    if (typeof dispatch?.name !== 'string') return state
    const argsRaw = typeof dispatch.arguments === 'string'
      ? dispatch.arguments
      : JSON.stringify(dispatch.arguments ?? null)
    const skill = skillNameFromArgs(dispatch.name, argsRaw)
    return skill === null ? state : tally(state, skill, state.turn)
  }

  if (event.type !== 'tool/result') return state

  const result = event.data as {
    message?: { content?: readonly { isError?: unknown }[]; source?: { callId?: unknown } }
  }
  const callId = result?.message?.source?.callId
  if (typeof callId !== 'string') return state
  // The load failed: the skill was not available to the model, so it is not a
  // reference. (Same "only successful results count" gate as deliverables.)
  if (result?.message?.content?.[0]?.isError === true) return state

  const recorded = state.calls[callId]
  if (recorded === undefined) return state
  return tally(state, recorded.skill, recorded.turn)
}
