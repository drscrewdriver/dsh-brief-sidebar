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
    /** Skills loaded in the latest turn so far (`null` before the first turn). */
    readonly latest: {
        readonly turn: number;
        readonly names: readonly string[];
    } | null;
    /** Distinct skills, most-recent-first, capped (see CAPS). */
    readonly items: readonly SkillUsageEntry[];
    /** Distinct skills over the whole session, uncapped. */
    readonly sessionTotal: number;
    /** Successful skill loads over the whole session. */
    readonly callTotal: number;
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
};
/** The fold's initial state: no skill has been loaded yet. */
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
