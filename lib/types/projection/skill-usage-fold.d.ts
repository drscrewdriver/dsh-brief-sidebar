/**
 * Host-side fold of skill-usage facts — the projection unit state for
 * `dshSummarySkillUsage`: which skills this session actually referenced, and
 * which ones it was offered.
 *
 * Two channels feed "referenced", and both are the host's own words:
 *
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
import type { FoldEvent } from './deliverables-fold';
/** One skill's session-wide tally. */
export interface SkillUsageEntry {
    readonly name: string;
    /** Successful loads of this skill so far. */
    readonly count: number;
    /** Turn whose call this tally last advanced. */
    readonly lastTurn: number;
}
/** Fold state. Plain JSON, so the projection cache can persist it. */
export interface SkillUsageState {
    /** Turn number of the open (or latest seen) turn; 0 before the first turn. */
    readonly turn: number;
    /** Open turns' `callId → skill name` map; only resolvable skill calls are recorded. */
    readonly calls: Readonly<Record<string, {
        readonly turn: number;
        readonly skill: string;
    }>>;
    /** Skills referenced in the latest turn so far (`null` before the first turn). */
    readonly latest: {
        readonly turn: number;
        readonly names: readonly string[];
    } | null;
    /** Distinct referenced skills, most-recent-first, capped (see CAPS). */
    readonly items: readonly SkillUsageEntry[];
    /** Distinct referenced skills over the whole session, uncapped. */
    readonly sessionTotal: number;
    /** Successful references over the whole session, both channels included. */
    readonly callTotal: number;
    /** The session's current available-skill catalog, in catalog order (capped). */
    readonly catalog: readonly string[];
    /** How many entries the latest catalog frame really published (may exceed `catalog`). */
    readonly catalogCount: number;
}
/**
 * Capacity bounds. The unit rides every committed event, so the lists are
 * capped; `sessionTotal`/`callTotal` keep the summary truthful beyond the cap.
 */
export declare const CAPS: {
    /** Distinct skills kept in state (most recent win). */
    readonly session: 50;
    /** Skills kept in the latest-turn bucket of the wire view. */
    readonly latest: 20;
    /** Distinct skills kept in the wire view. */
    readonly view: 20;
    /**
     * Available-skill names kept in state. Real catalogs measured 71–88 entries
     * on this machine, so the bound sits above them with room to spare — the
     * wire only ever carries `CAPS.available` names plus the truthful count.
     */
    readonly available: 120;
};
/** The fold's initial state: no skill has been referenced or offered yet. */
export declare function initSkillUsageState(): SkillUsageState;
/**
 * Extract the skill name from one committed `tool/call`.
 *
 * @param name - wire tool name; only the host's `skill` loader counts.
 * @param argsRaw - model-produced JSON arguments (a string by the session contract).
 * @returns the non-blank skill name, or null when this call is not a skill load.
 */
export declare function skillNameFromArgs(name: string, argsRaw: string): string | null;
/**
 * The next state after one committed event. Events this fold does not own
 * return the SAME reference — an unchanged reference produces zero downstream
 * work in the registry's `Object.is` drive.
 *
 * @param state - the state covering all prior events.
 * @param event - the next committed session event.
 * @returns the next state (same reference when nothing the fold tracks moved).
 */
export declare function applySkillUsageEvent(state: SkillUsageState, event: FoldEvent): SkillUsageState;
