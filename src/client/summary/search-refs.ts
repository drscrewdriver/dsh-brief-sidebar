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
import { SEARCH_REFS_KEY } from '../../projection/keys'
import type { SearchRefItemView, SearchRefView, SearchQueryView } from '../../projection/keys'
import { urlKey } from '../../projection/search-ref-fold'

/** The key this plugin's client half subscribes to (re-exported for callers). */
export { SEARCH_REFS_KEY }

/** Whether a value is a non-negative safe integer (the view's counters). */
function isCounter(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

/**
 * The tool a row came from, defaulting to the plugin's own for a frame written
 * before the host half started publishing `tool`. Absent is "we do not know",
 * never "not a search", so the row still shows.
 */
function readTool(value: unknown): string {
  return typeof value === 'string' && value.length > 0 ? value : 'advanced_search'
}

/**
 * The queries that surfaced a source, newest first.
 *
 * Two legacy shapes are repaired rather than dropped: a frame written before
 * the cluster change carries a single `query` string, and a drifted value
 * (non-array, or an array of junk) reads as "member of no cluster" — the row
 * still shows, it just joins the tail group.
 */
function readQueries(value: unknown): readonly string[] {
  if (Array.isArray(value)) {
    return [...new Set(value.filter((q): q is string => typeof q === 'string' && q.length > 0))]
  }
  if (typeof value === 'string' && value.length > 0) return [value]
  return []
}

/** Narrow one source row; `undefined` = malformed, dropped. */
function readItem(value: unknown): SearchRefItemView | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const raw = value as Record<string, unknown>
  if (typeof raw['url'] !== 'string' || raw['url'].length === 0) return undefined
  if (typeof raw['host'] !== 'string') return undefined
  if (!isCounter(raw['count']) || !isCounter(raw['lastTurn'])) return undefined
  const item: { -readonly [K in keyof SearchRefItemView]: SearchRefItemView[K] } = {
    url: raw['url'],
    host: raw['host'],
    queries: readQueries(raw['queries'] ?? raw['query']),
    tool: readTool(raw['tool']),
    count: raw['count'],
    lastTurn: raw['lastTurn'],
  }
  if (typeof raw['title'] === 'string' && raw['title'].length > 0) item.title = raw['title']
  if (typeof raw['snippet'] === 'string' && raw['snippet'].length > 0) item.snippet = raw['snippet']
  return item
}

/** Narrow one query row; `undefined` = malformed, dropped. */
function readQuery(value: unknown): SearchQueryView | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const raw = value as Record<string, unknown>
  if (typeof raw['query'] !== 'string' || raw['query'].length === 0) return undefined
  if (!isCounter(raw['turn']) || !isCounter(raw['hits'])) return undefined
  return { query: raw['query'], tool: readTool(raw['tool']), turn: raw['turn'], hits: raw['hits'] }
}

/** The latest-turn key set, or `null` when absent OR drifted (only a tag rides it). */
function readLatest(value: unknown): SearchRefView['latest'] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null
  const raw = value as Record<string, unknown>
  if (!isCounter(raw['turn']) || !Array.isArray(raw['urls'])) return null
  return { turn: raw['turn'], urls: raw['urls'].filter((u): u is string => typeof u === 'string' && u.length > 0) }
}

/**
 * Narrow a raw projection value into a search-reference view.
 *
 * @param value - the raw `unknown` snapshot of the `dshSummarySearchRefs` face.
 * @returns the validated view, or `undefined` when the capability is absent.
 */
export function readSearchRefs(value: unknown): SearchRefView | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const raw = value as Record<string, unknown>
  if (!Array.isArray(raw['queries']) || !Array.isArray(raw['sources'])) return undefined
  if (!isCounter(raw['queryTotal']) || !isCounter(raw['sourceTotal'])) return undefined
  const queries: SearchQueryView[] = []
  for (const entry of raw['queries']) {
    const narrowed = readQuery(entry)
    if (narrowed !== undefined) queries.push(narrowed)
  }
  const sources: SearchRefItemView[] = []
  for (const entry of raw['sources']) {
    const narrowed = readItem(entry)
    if (narrowed !== undefined) sources.push(narrowed)
  }
  return {
    latest: readLatest(raw['latest']),
    queries,
    sources,
    queryTotal: raw['queryTotal'],
    sourceTotal: raw['sourceTotal'],
  }
}

/** Whether one source row was surfaced by the latest turn's searches. */
export function isLatestSource(view: SearchRefView, url: string): boolean {
  return view.latest?.urls.includes(urlKey(url)) === true
}

/** One query cluster: a question the session asked, and what answered it. */
export interface SearchCluster {
  /** The query text; `''` marks the tail group (sources no listed query claims). */
  readonly query: string
  readonly tool: string
  readonly turn: number
  readonly hits: number
  readonly items: readonly SearchRefItemView[]
}

/**
 * Cluster the result bubbles under the queries that surfaced them.
 *
 * Membership is the source's own `queries` list, so a source a merged
 * multi-query `web_search` brought back appears under each of them — that is
 * what happened, and hiding the repeat would make the counts under the headers
 * disagree with the cards on screen. Queries come newest-first from the fold;
 * a source no listed query claims (its query aged out of the capped list, or a
 * pre-cluster frame) lands in a tail group rather than disappearing.
 *
 * The section renders every cluster folded; nothing here decides what opens.
 */
export function clusterByQuery(view: SearchRefView): readonly SearchCluster[] {
  const claimed = new Set<string>()
  const out: SearchCluster[] = []
  for (const row of view.queries) {
    const items = view.sources.filter(item => item.queries.includes(row.query))
    for (const item of items) claimed.add(item.url)
    out.push({ query: row.query, tool: row.tool, turn: row.turn, hits: row.hits, items })
  }
  const rest = view.sources.filter(item => !claimed.has(item.url))
  if (rest.length > 0) {
    out.push({
      query: '',
      tool: rest[0]?.tool ?? '',
      turn: rest[0]?.lastTurn ?? 0,
      hits: rest.length,
      items: rest,
    })
  }
  return out
}

/**
 * The href to render for a source URL, or `undefined` when it must not be a link.
 *
 * Search results are untrusted external data: a `javascript:` or `data:` URL in
 * a provider response would otherwise become a clickable footgun in the user's
 * own sidebar. Only web schemes get an anchor; everything else renders as text.
 */
export function safeHref(url: string): string | undefined {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : undefined
  } catch {
    return undefined
  }
}
