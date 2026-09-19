/**
 * The projection key this plugin contributes to the session-projection
 * registry, and its wire view.
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
