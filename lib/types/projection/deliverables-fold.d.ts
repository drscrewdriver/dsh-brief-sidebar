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
    readonly turn: number;
    readonly paths: readonly string[];
}
/** Fold state. Plain JSON, so the projection cache can persist it. */
export interface DeliverablesState {
    /** Turn number of the open (or latest seen) turn; 0 before the first turn. */
    readonly turn: number;
    /** Open turn's `callId → mutation path` map (`null` = not a mutation call). */
    readonly calls: Readonly<Record<string, {
        readonly turn: number;
        readonly path: string | null;
    }>>;
    /** Paths accumulated in the latest turn so far (`null` before the first turn). */
    readonly latest: DeliverablesTurnBucket | null;
    /** Every distinct produced path, most-recent-first, capped (see CAPS). */
    readonly sessionPaths: readonly string[];
    /** Distinct produced paths over the whole session, uncapped. */
    readonly sessionTotal: number;
}
/**
 * Wire-view capacity bounds. The projection rides every event frame, so the
 * lists are capped; the uncapped `sessionTotal` keeps the summary truthful
 * beyond the cap.
 */
export declare const CAPS: {
    /** Latest-turn paths kept in the wire view. */
    readonly latest: 50;
    /** Session-wide paths kept in the wire view (most recent win). */
    readonly session: 100;
};
/** The fold's initial state: nothing has happened yet. */
export declare function initDeliverablesState(): DeliverablesState;
/**
 * Structural view of one committed session event. The registry hands the
 * host's discriminated union; the fold only needs `type` and `data`, and the
 * tool-event shapes mirror `dsh-session` types: `tool/call` carries
 * `{ turn, step, callId, name, arguments }`, `tool/result` carries
 * `{ turn, step, message: { content: [{ isError? }], source: { callId } } }`,
 * `turn/start` carries `{ turn }`.
 */
export interface FoldEvent {
    readonly type: string;
    readonly data: unknown;
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
export declare function applyDeliverablesEvent(state: DeliverablesState, event: FoldEvent): DeliverablesState;
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
export declare function mutationPath(name: string, argsRaw: string): string | null;
