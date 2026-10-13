/**
 * The `dshSummarySearchRefs` projection — reading it.
 *
 * The unit is registered by THIS plugin's host half (key `dshSummarySearchRefs`):
 * the queries this session ran — through the harness's `web_search` or the
 * user's own `advanced_search` — and the sources those searches brought back.
 * It answers "what did the session pull in from outside" — where the skill tab
 * says which instruction packs were loaded and the memory tab says which of the
 * user's own knowledge was injected.
 *
 * Reading discipline, same as every other brief section:
 * - `undefined` = the capability is ABSENT (no projection registry, or a frame
 *   drifted past repair) → the tab hides;
 * - empty lists = the honest empty state (the session has not searched yet);
 * - a malformed row is dropped, never thrown.
 *
 * The module is deliberately PURE — no React, no context, no IO.
 */
import { SEARCH_REFS_KEY } from '../../projection/keys';
import type { SearchRefView } from '../../projection/keys';
/** The key this plugin's client half subscribes to (re-exported for callers). */
export { SEARCH_REFS_KEY };
/**
 * Narrow a raw projection value into a search-reference view.
 *
 * @param value - the raw `unknown` snapshot of the `dshSummarySearchRefs` face.
 * @returns the validated view, or `undefined` when the capability is absent.
 */
export declare function readSearchRefs(value: unknown): SearchRefView | undefined;
/** Whether one source row was surfaced by the latest turn's searches. */
export declare function isLatestSource(view: SearchRefView, url: string): boolean;
/**
 * The href to render for a source URL, or `undefined` when it must not be a link.
 *
 * Search results are untrusted external data: a `javascript:` or `data:` URL in
 * a provider response would otherwise become a clickable footgun in the user's
 * own sidebar. Only web schemes get an anchor; everything else renders as text.
 */
export declare function safeHref(url: string): string | undefined;
