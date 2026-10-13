/**
 * The projection keys this plugin contributes to the session-projection
 * registry, and their wire views.
 *
 * The key is namespaced with the plugin name on purpose: the registry refuses
 * to share a key across differing `stateVersion`s, so a collision with a
 * future host-side deliverables unit would be a hard load error, not a silent
 * shadow. The view type is declared structurally (the plugin has no compile
 * dependency on `@deepseek-ai/dsh-session-projection`); the registry accepts
 * any string key at runtime.
 */
/** The projection key registered by this plugin's host half. */
export declare const DELIVERABLES_KEY = "dshSummaryDeliverables";
/**
 * The second key: which skills this session actually loaded (the host's `skill`
 * tool, read off `tool/call.arguments`). Namespaced for the same reason as
 * {@link DELIVERABLES_KEY} — the registry hard-fails on a shared key with a
 * differing `stateVersion`, so a future host-side skill unit must not be able
 * to collide silently.
 */
export declare const SKILL_USAGE_KEY = "dshSummarySkillUsage";
/** Client view of the produced-file fold (JSON-safe). */
export interface DeliverablesView {
    /** Paths produced in the latest turn, first-seen order (capped). */
    readonly latest: {
        readonly turn: number;
        readonly paths: readonly string[];
    } | null;
    /** Distinct produced paths session-wide, most-recent-first (capped). */
    readonly sessionPaths: readonly string[];
    /** Distinct produced paths session-wide, uncapped — the truthful total. */
    readonly sessionTotal: number;
}
/** One loaded skill in the wire view. */
export interface SkillUsageEntryView {
    /** The skill name exactly as the model passed it to the `skill` tool. */
    readonly name: string;
    /** Successful loads of this skill this session. */
    readonly count: number;
    /** Turn whose call last advanced this tally. */
    readonly lastTurn: number;
}
/** Client view of the skill-usage fold (JSON-safe). */
export interface SkillUsageView {
    /** Skills loaded in the latest turn; `null` before the first `turn/start`. */
    readonly latest: {
        readonly turn: number;
        readonly names: readonly string[];
    } | null;
    /** Distinct loaded skills, most recently used first (capped). */
    readonly session: readonly SkillUsageEntryView[];
    /** Distinct loaded skills session-wide — may exceed `session.length`. */
    readonly sessionTotal: number;
    /** Successful skill loads session-wide. */
    readonly callTotal: number;
}
