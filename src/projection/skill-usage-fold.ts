/**
 * Host-side fold of skill-usage facts — the projection unit state for
 * `dshSummarySkillUsage`: which skills this session actually loaded.
 *
 * The only authoritative source is the session event stream. The host's
 * skill loader tool is registered as `skill` with a single `name` argument,
 * and that registration is byte-identical on every supported line — verified
 * per tag (`name: 'skill'` + `The exact skill name` present from
 * `dsh-v0.1.0-rc.8` through `dsh-v0.2.0-rc.2`). So the skill name comes out of
 * `tool/call.arguments`.
 *
 * What this fold deliberately does NOT read: `tool/result.meta`. The skill tool
 * declares no `presentationMeta` on any line (checked the same way), so there
 * is no structured payload to read — the argument is the whole fact. Nor does
 * it read the result text: the loaded SKILL.md body is model-facing prose, and
 * scraping it would make a second source of truth out of a presentation.
 *
 * Success is required, matching `deliverables-fold`: a `tool/result` with
 * `isError: true` means the skill never loaded, so claiming a reference would
 * be a lie. Counts are per distinct skill, order is most-recent-first, and the
 * state is bounded like every other unit because the registry folds it per
 * committed event.
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
  /** Skills loaded in the latest turn so far (`null` before the first turn). */
  readonly latest: { readonly turn: number; readonly names: readonly string[] } | null
  /** Distinct skills, most-recent-first, capped (see CAPS). */
  readonly items: readonly SkillUsageEntry[]
  /** Distinct skills over the whole session, uncapped. */
  readonly sessionTotal: number
  /** Successful skill loads over the whole session. */
  readonly callTotal: number
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
} as const

/** The fold's initial state: no skill has been loaded yet. */
export function initSkillUsageState(): SkillUsageState {
  return { turn: 0, calls: {}, latest: null, items: [], sessionTotal: 0, callTotal: 0 }
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
  const skill = recorded.skill

  const existing = state.items.find((item) => item.name === skill)
  const withoutSkill = state.items.filter((item) => item.name !== skill)
  const items = [{ name: skill, count: (existing?.count ?? 0) + 1, lastTurn: recorded.turn }, ...withoutSkill]
    .slice(0, CAPS.session)

  // A name that had been capped away can re-enter, and the deliverables fold
  // counts that as new again rather than pretending it knows the true distinct
  // set; the same trade-off applies here, so `sessionTotal` is a floor reached
  // by monotone counting over the capped window.
  const sessionTotal = existing === undefined ? state.sessionTotal + 1 : state.sessionTotal

  // A stray result settling after a LATER turn opened never rewrites the newer
  // bucket — its tally still counts above.
  const latest = state.latest
  const nextLatest = latest !== null && latest.turn === recorded.turn && !latest.names.includes(skill)
    ? { turn: latest.turn, names: [...latest.names, skill] }
    : latest

  return { ...state, latest: nextLatest, items, sessionTotal, callTotal: state.callTotal + 1 }
}
