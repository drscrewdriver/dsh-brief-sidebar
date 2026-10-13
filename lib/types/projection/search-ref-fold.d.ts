/**
 * Host-side fold of search-reference facts — the projection unit state for
 * `dshSummarySearchRefs`: which queries this session ran against the web, and
 * which external sources came back.
 *
 * Two tools feed it, and the split is stated on every row rather than merged
 * away, because they are different facts for the reader:
 *
 * - `advanced_search` — the user's own `dsh-free-search` tool: engines, keys
 *   and prices are things the human configures. Its argument is `query`, a
 *   single string.
 * - `web_search` — the harness's own tool, which `dsh-free-search` also feeds
 *   (it registers a `WebSearchProvider`, so results can come from engines the
 *   human picked while the call goes through host plumbing). Its argument is
 *   `queries`, an array merged into one result set.
 *
 * Folding only the plugin tool turned out to be the wrong default: the model
 * reaches for the host's `web_search` far more often, so the section sat empty
 * in exactly the sessions where searching happened. Both are folded now; the
 * `tool` on each row is what keeps the two honest.
 *
 * Two channels, both structured, no prose scraping:
 *
 * - the query strings come from `tool/call.arguments`;
 * - the returned sources come from `tool/result.meta.sources[]` — the host
 *   publishes those itself for `web_search`, and `dsh-free-search` >= 0.9.25
 *   publishes them for `advanced_search` via `output.presentationMeta`.
 *
 * Older `dsh-free-search` builds declare no `presentationMeta`, so their
 * results carry no meta. That is a degraded reading, not a missed search: the
 * query still counts, with zero sources listed. Dropping the row instead would
 * tell the reader nothing happened when the model did search.
 *
 * Like the deliverables and skill folds this module is PURE — no cordis, no
 * zod, no IO — so it can be tested against hand-written event fixtures.
 * Success is required (an `isError` result is not a reference), and every list
 * is bounded because the registry folds this once per committed event.
 */
import type { FoldEvent } from './deliverables-fold';
/** One external source the session pulled back. */
export interface SearchRefItem {
    /** The URL exactly as published, minus host case and a trailing slash. */
    readonly url: string;
    /** Host, for grouping and for the row's quiet right-hand label. */
    readonly host: string;
    readonly title?: string;
    /** Provider snippet, capped (see CAPS.snippet). */
    readonly snippet?: string;
    /** The query that most recently surfaced this source. */
    readonly query: string;
    /** Which tool answered — the plugin's own or the harness's. */
    readonly tool: string;
    /** How many settled searches surfaced it. */
    readonly count: number;
    /** Turn whose result last advanced this row. */
    readonly lastTurn: number;
}
/** One search the session ran, with how many sources it returned. */
export interface SearchQueryRow {
    readonly query: string;
    /** `advanced_search` (plugin) or `web_search` (host). */
    readonly tool: string;
    readonly turn: number;
    /**
     * Sources the call returned. For a merged multi-query `web_search` this is
     * the call's total repeated on each of its queries — the session never says
     * which query produced which source, and inventing a per-query split would
     * be worse than restating the shared total.
     */
    readonly hits: number;
}
/** Fold state. Plain JSON, so the projection cache can persist it. */
export interface SearchRefState {
    /** Turn number of the open (or latest seen) turn; 0 before the first turn. */
    readonly turn: number;
    /** Open turns' `callId → the search it asked for`; only owned tools are recorded. */
    readonly calls: Readonly<Record<string, {
        readonly turn: number;
        readonly tool: string;
        readonly queries: readonly string[];
    }>>;
    /** URLs surfaced in the latest turn so far (`null` before the first turn). */
    readonly latest: {
        readonly turn: number;
        readonly urls: readonly string[];
    } | null;
    /** Distinct sources, most-recent-first, capped. */
    readonly items: readonly SearchRefItem[];
    /** Distinct queries, most-recent-first, capped. */
    readonly queries: readonly SearchQueryRow[];
    /** Distinct sources over the whole session, uncapped. */
    readonly sourceTotal: number;
    /** Distinct queries over the whole session, uncapped. */
    readonly queryTotal: number;
}
/**
 * Capacity bounds. `snippet` is capped because it is the only long text in the
 * state and the frame is republished per event; the provider already caps it
 * once in its own `presentationMeta`, so this is a second, tighter belt.
 */
export declare const CAPS: {
    /** Distinct sources kept in state. */
    readonly items: 20;
    /** Distinct queries kept in state. */
    readonly queries: 20;
    /** URLs kept in the latest-turn bucket. */
    readonly latest: 20;
    /** Snippet characters kept per source. */
    readonly snippet: 160;
};
/** The fold's initial state: no search has settled yet. */
export declare function initSearchRefState(): SearchRefState;
/**
 * Extract the query list of one committed `tool/call`.
 *
 * @param name - wire tool name.
 * @param argsRaw - model-produced JSON arguments (a string by the session contract).
 * @returns the non-blank queries in published order, or null when this call is not a search.
 */
export declare function queriesFromArgs(name: string, argsRaw: string): readonly string[] | null;
/**
 * The dedupe key. Host case and a trailing slash are not meaningful for
 * identity; path case IS, so it is left alone. Exported because the client
 * matches a row against the latest-turn bucket with the same algorithm.
 */
export declare function urlKey(url: string): string;
/**
 * The next state after one committed event. Events this fold does not own
 * return the SAME reference, which is what keeps the registry's `Object.is`
 * drive from republishing the key on unrelated frames.
 *
 * @param state - the state covering all prior events.
 * @param event - the next committed session event.
 * @returns the next state (same reference when nothing the fold tracks moved).
 */
export declare function applySearchRefEvent(state: SearchRefState, event: FoldEvent): SearchRefState;
