/**
 * Host-side fold of produced-file facts — the projection unit state for
 * `dshSummaryDeliverables`.
 *
 * The vocabulary is the one the harness's own deliverables experience uses
 * (`ui-deliverables/turn-deliverables.ts`): the arguments of successful
 * first-party mutation calls (`write`, `edit`, and the mutating
 * `str_replace_editor` commands), never presentation data or prose. Reads,
 * deletes, unsupported tools, malformed calls, and failed results contribute
 * nothing; a file written and then edited in the same turn is one entry, in
 * first-seen order.
 *
 * This module is deliberately PURE — no cordis, no zod, no IO — so the fold
 * can be tested directly against hand-written event fixtures. The projection
 * registry drives it once per committed `session/event`, which is what makes
 * the produced list update mid-turn, the gap the official turn-tail row has.
 */

/** One bucket: the paths produced so far in one turn, first-seen order. */
export interface DeliverablesTurnBucket {
  readonly turn: number
  readonly paths: readonly string[]
}

/** Fold state. Plain JSON, so the projection cache can persist it. */
export interface DeliverablesState {
  /** Turn number of the open (or latest seen) turn; 0 before the first turn. */
  readonly turn: number
  /** Open turn's `callId → mutation path` map (`null` = not a mutation call). */
  readonly calls: Readonly<Record<string, { readonly turn: number; readonly path: string | null }>>
  /** Paths accumulated in the latest turn so far (`null` before the first turn). */
  readonly latest: DeliverablesTurnBucket | null
  /** Every distinct produced path, most-recent-first, capped (see CAPS). */
  readonly sessionPaths: readonly string[]
  /** Distinct produced paths over the whole session, uncapped. */
  readonly sessionTotal: number
}

/**
 * Wire-view capacity bounds. The projection rides every event frame, so the
 * lists are capped; the uncapped `sessionTotal` keeps the summary truthful
 * beyond the cap.
 */
export const CAPS = {
  /** Latest-turn paths kept in the wire view. */
  latest: 50,
  /** Session-wide paths kept in the wire view (most recent win). */
  session: 100,
} as const

/** The fold's initial state: nothing has happened yet. */
export function initDeliverablesState(): DeliverablesState {
  return { turn: 0, calls: {}, latest: null, sessionPaths: [], sessionTotal: 0 }
}

/**
 * Structural view of one committed session event. The registry hands the
 * host's discriminated union; the fold only needs `type` and `data`, and the
 * tool-event shapes mirror `dsh-session` types: `tool/call` carries
 * `{ turn, step, callId, name, arguments }`, `tool/result` carries
 * `{ turn, step, message: { content: [{ isError? }], source: { callId } } }`,
 * `turn/start` carries `{ turn }`.
 */
export interface FoldEvent {
  readonly type: string
  readonly data: unknown
}

/**
 * The next state after one committed event. Events the fold does not own
 * return the SAME reference — an unchanged reference produces zero downstream
 * work in the registry's `Object.is` drive.
 *
 * @param state - the state covering all prior events.
 * @param event - the next committed session event.
 * @returns the next state (same reference when nothing the fold tracks moved).
 */
export function applyDeliverablesEvent(state: DeliverablesState, event: FoldEvent): DeliverablesState {
  if (event.type === 'turn/start') {
    const turn = event.data as { turn?: unknown }
    if (typeof turn?.turn !== 'number') return state
    // Keep the previous turn's call records until its results settled; only
    // older turns' unsettled entries are pruned (bounded-state hygiene).
    const calls: Record<string, { readonly turn: number; readonly path: string | null }> = {}
    for (const [id, entry] of Object.entries(state.calls)) {
      if (entry.turn >= turn.turn - 1) calls[id] = entry
    }
    return { ...state, turn: turn.turn, calls, latest: { turn: turn.turn, paths: [] } }
  }

  if (event.type === 'tool/call') {
    const call = event.data as { callId?: unknown; name?: unknown; arguments?: unknown }
    if (typeof call?.callId !== 'string') return state
    const path = typeof call.name === 'string' && typeof call.arguments === 'string'
      ? mutationPath(call.name, call.arguments)
      : null
    return { ...state, calls: { ...state.calls, [call.callId]: { turn: state.turn, path } } }
  }

  if (event.type !== 'tool/result') return state

  const result = event.data as {
    message?: { content?: readonly { isError?: unknown }[]; source?: { callId?: unknown } }
  }
  const callId = result?.message?.source?.callId
  if (typeof callId !== 'string') return state
  if (result?.message?.content?.[0]?.isError === true) return state

  const recorded = state.calls[callId]
  const path = recorded?.path
  if (path === undefined || path === null) return state

  // A path written and edited again in the same turn is one bucket entry. A
  // stray result that settles after a LATER turn opened never rewrites the
  // newer bucket — its path still counts session-wide below.
  const latest = state.latest
  const sameTurn = latest !== null && latest.turn === recorded.turn
  const nextLatest: DeliverablesTurnBucket | null = sameTurn && !latest.paths.includes(path)
    ? { turn: latest.turn, paths: [...latest.paths, path].slice(-CAPS.latest) }
    : latest

  // Session-wide: distinct paths, most-recent-first, capped. The filter is
  // non-empty-preserving, so a length change means the path was NEW here.
  const withoutDuplicate = state.sessionPaths.filter(existing => existing !== path)
  const sessionPaths = [path, ...withoutDuplicate].slice(0, CAPS.session)
  const sessionTotal = withoutDuplicate.length === state.sessionPaths.length
    ? state.sessionTotal + 1
    : state.sessionTotal

  return { ...state, latest: nextLatest, sessionPaths, sessionTotal }
}

/**
 * Extract the path from a supported first-party mutation call.
 *
 * Ported from the harness deliverables fold so both carriers agree on what a
 * "produced file" is. Session `tool/call` events are root calls; PTC dispatch
 * children do not enter this fold independently.
 *
 * @param name - wire tool name.
 * @param argsRaw - model-produced JSON arguments.
 * @returns the mutation path, or null when the call is not a supported mutation.
 */
export function mutationPath(name: string, argsRaw: string): string | null {
  let args: unknown
  try {
    args = JSON.parse(argsRaw) as unknown
  } catch {
    return null
  }
  if (!isRecord(args)) return null
  switch (name) {
    case 'write':
      return typeof args.content === 'string' ? pathValue(args.file_path) : null
    case 'edit':
      return validEditArgs(args) ? pathValue(args.file_path) : null
    case 'str_replace_editor':
      return editorMutationPath(args)
    default:
      return null
  }
}

/** Validate the fields that an `edit` execution requires. */
function validEditArgs(args: Readonly<Record<string, unknown>>): boolean {
  return typeof args.old_string === 'string'
    && args.old_string.length > 0
    && typeof args.new_string === 'string'
    && args.old_string !== args.new_string
    && (args.replace_all === undefined || typeof args.replace_all === 'boolean')
}

/** Extract a path only from a complete mutating editor command. */
function editorMutationPath(args: Readonly<Record<string, unknown>>): string | null {
  const path = pathValue(args.path)
  if (path === null) return null
  switch (args.command) {
    case 'create':
      return typeof args.file_text === 'string' ? path : null
    case 'str_replace':
      return typeof args.old_str === 'string'
        && args.old_str.length > 0
        && (args.new_str === undefined || typeof args.new_str === 'string')
        ? path
        : null
    case 'insert':
      return typeof args.insert_line === 'number'
        && Number.isInteger(args.insert_line)
        && args.insert_line >= 0
        && typeof args.new_str === 'string'
        ? path
        : null
    default:
      return null
  }
}

/** A non-blank path preserves the exact spelling supplied to the tool. */
function pathValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

/** Narrow parsed JSON to an argument object. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
