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
/**
 * The search-reference key (queries and returned sources of this session's
 * `advanced_search` calls). Same rule as above: the name is ours, so no other
 * host-side unit can answer for it by accident.
 */
export declare const SEARCH_REFS_KEY = "dshSummarySearchRefs";
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
    /** Skills referenced in the latest turn; `null` before the first `turn/start`. */
    readonly latest: {
        readonly turn: number;
        readonly names: readonly string[];
    } | null;
    /** Distinct referenced skills, most recently used first (capped). */
    readonly session: readonly SkillUsageEntryView[];
    /** Distinct referenced skills session-wide — may exceed `session.length`. */
    readonly sessionTotal: number;
    /** Successful references session-wide, both channels included. */
    readonly callTotal: number;
    /**
     * The skills this session was OFFERED, per its latest catalog frame (capped).
     * Available is not referenced: the model may never use any of these.
     */
    readonly available: readonly string[];
    /** How many entries that frame published — may exceed `available.length`. */
    readonly availableCount: number;
}
/** One external source a search brought back (wire view). */
export interface SearchRefItemView {
    /** The URL as published (host case and trailing slash normalised). */
    readonly url: string;
    readonly host: string;
    readonly title?: string;
    /** Provider snippet, capped by the fold. */
    readonly snippet?: string;
    /** The query that most recently surfaced it. */
    readonly query: string;
    /** Settled searches that surfaced this source. */
    readonly count: number;
    readonly lastTurn: number;
}
/** One query the session ran, with how many sources it returned. */
export interface SearchQueryView {
    readonly query: string;
    readonly turn: number;
    readonly hits: number;
}
/** Client view of the search-reference fold (JSON-safe). */
export interface SearchRefView {
    /** Normalised URL keys surfaced in the latest turn; `null` before the first turn. */
    readonly latest: {
        readonly turn: number;
        readonly urls: readonly string[];
    } | null;
    /** Distinct queries, most recent first (capped). */
    readonly queries: readonly SearchQueryView[];
    /** Distinct sources, most recent first (capped). */
    readonly sources: readonly SearchRefItemView[];
    /** Distinct queries session-wide — may exceed `queries.length`. */
    readonly queryTotal: number;
    /** Distinct sources session-wide — may exceed `sources.length`. */
    readonly sourceTotal: number;
}
