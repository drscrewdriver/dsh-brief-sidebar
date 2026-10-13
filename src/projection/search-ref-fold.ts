/**
 * Host-side fold of search-reference facts — the projection unit state for
 * `dshSummarySearchRefs`: which queries this session ran through the user's
 * `advanced_search` tool, and which external sources came back.
 *
 * Scope is deliberate: `advanced_search` only, not the harness's own
 * `web_search`. The two tools are separate facts for the reader — one is the
 * plugins the human installed and configures (engines, keys, prices), the other
 * is host plumbing — and folding them together would make the section report
 * searches the reader cannot inspect or change.
 *
 * Two channels, both structured, no prose scraping:
 *
 * - the query string comes from `tool/call.arguments.query`;
 * - the returned sources come from `tool/result.meta.sources[]`, which
 *   `dsh-free-search` publishes through the tool's `output.presentationMeta`
 *   (shape mirrors the host's `searchMetaFromValue`: `sources[]` of
 *   url/title/snippet/publishedAt, plus `provider`/`answer`).
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
import type { FoldEvent } from './deliverables-fold'

/** One external source the session pulled back. */
export interface SearchRefItem {
  /** The URL exactly as published, minus host case and a trailing slash. */
  readonly url: string
  /** Host, for grouping and for the row's quiet right-hand label. */
  readonly host: string
  readonly title?: string
  /** Provider snippet, capped (see CAPS.snippet). */
  readonly snippet?: string
  /** The query that most recently surfaced this source. */
  readonly query: string
  /** How many settled searches surfaced it. */
  readonly count: number
  /** Turn whose result last advanced this row. */
  readonly lastTurn: number
}

/** One search the session ran, with how many sources it returned. */
export interface SearchQueryRow {
  readonly query: string
  readonly turn: number
  readonly hits: number
}

/** Fold state. Plain JSON, so the projection cache can persist it. */
export interface SearchRefState {
  /** Turn number of the open (or latest seen) turn; 0 before the first turn. */
  readonly turn: number
  /** Open turns' `callId → query` map; only `advanced_search` calls are recorded. */
  readonly calls: Readonly<Record<string, { readonly turn: number; readonly query: string }>>
  /** URLs surfaced in the latest turn so far (`null` before the first turn). */
  readonly latest: { readonly turn: number; readonly urls: readonly string[] } | null
  /** Distinct sources, most-recent-first, capped. */
  readonly items: readonly SearchRefItem[]
  /** Distinct queries, most-recent-first, capped. */
  readonly queries: readonly SearchQueryRow[]
  /** Distinct sources over the whole session, uncapped. */
  readonly sourceTotal: number
  /** Distinct queries over the whole session, uncapped. */
  readonly queryTotal: number
}

/**
 * Capacity bounds. `snippet` is capped because it is the only long text in the
 * state and the frame is republished per event; the provider already caps it
 * once in its own `presentationMeta`, so this is a second, tighter belt.
 */
export const CAPS = {
  /** Distinct sources kept in state. */
  items: 20,
  /** Distinct queries kept in state. */
  queries: 20,
  /** URLs kept in the latest-turn bucket. */
  latest: 20,
  /** Snippet characters kept per source. */
  snippet: 160,
} as const

/** The fold's initial state: no search has settled yet. */
export function initSearchRefState(): SearchRefState {
  return { turn: 0, calls: {}, latest: null, items: [], queries: [], sourceTotal: 0, queryTotal: 0 }
}

/** The tool this fold owns. Nothing else counts, even with a `query` argument. */
const SEARCH_TOOL = 'advanced_search'

/**
 * Extract the query string from one committed `tool/call`.
 *
 * @param name - wire tool name.
 * @param argsRaw - model-produced JSON arguments (a string by the session contract).
 * @returns the non-blank query, or null when this call is not a search.
 */
export function queryFromArgs(name: string, argsRaw: string): string | null {
  if (name !== SEARCH_TOOL) return null
  let args: unknown
  try {
    args = JSON.parse(argsRaw) as unknown
  } catch {
    return null
  }
  if (typeof args !== 'object' || args === null || Array.isArray(args)) return null
  const query = (args as Record<string, unknown>)['query']
  return typeof query === 'string' && query.trim().length > 0 ? query : null
}

/**
 * The dedupe key. Host case and a trailing slash are not meaningful for
 * identity; path case IS, so it is left alone. Exported because the client
 * matches a row against the latest-turn bucket with the same algorithm.
 */
export function urlKey(url: string): string {
  const trimmed = url.trim()
  const withoutTrailingSlash = trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
  return withoutTrailingSlash.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]+/i, match => match.toLowerCase())
}

/** The host label of a URL, or the raw string when it does not parse. */
function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '')
  } catch {
    return url.slice(0, 40)
  }
}

/** Cap one snippet so one long provider blurb cannot dominate every frame. */
function capSnippet(text: string): string {
  const one = text.replace(/\s+/g, ' ').trim()
  return one.length > CAPS.snippet ? `${one.slice(0, CAPS.snippet)}…` : one
}

/** The sources of one result meta, or `[]` when the meta is absent or drifted. */
function readSources(meta: unknown): { url: string; title?: string; snippet?: string }[] {
  if (typeof meta !== 'object' || meta === null) return []
  const raw = (meta as Record<string, unknown>)['sources']
  if (!Array.isArray(raw)) return []
  const out: { url: string; title?: string; snippet?: string }[] = []
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue
    const record = entry as Record<string, unknown>
    if (typeof record['url'] !== 'string' || record['url'].trim().length === 0) continue
    const source: { url: string; title?: string; snippet?: string } = { url: record['url'] }
    if (typeof record['title'] === 'string' && record['title'].length > 0) source.title = record['title']
    if (typeof record['snippet'] === 'string' && record['snippet'].length > 0) source.snippet = capSnippet(record['snippet'])
    out.push(source)
  }
  return out
}

/**
 * The next state after one committed event. Events this fold does not own
 * return the SAME reference, which is what keeps the registry's `Object.is`
 * drive from republishing the key on unrelated frames.
 *
 * @param state - the state covering all prior events.
 * @param event - the next committed session event.
 * @returns the next state (same reference when nothing the fold tracks moved).
 */
export function applySearchRefEvent(state: SearchRefState, event: FoldEvent): SearchRefState {
  if (event.type === 'turn/start') {
    const turn = event.data as { turn?: unknown }
    if (typeof turn?.turn !== 'number') return state
    const calls: Record<string, { readonly turn: number; readonly query: string }> = {}
    for (const [id, entry] of Object.entries(state.calls)) {
      if (entry.turn >= turn.turn - 1) calls[id] = entry
    }
    return { ...state, turn: turn.turn, calls, latest: { turn: turn.turn, urls: [] } }
  }

  if (event.type === 'tool/call') {
    const call = event.data as { callId?: unknown; name?: unknown; arguments?: unknown }
    if (typeof call?.callId !== 'string') return state
    if (typeof call.name !== 'string' || typeof call.arguments !== 'string') return state
    const query = queryFromArgs(call.name, call.arguments)
    // An unreadable query is not recorded: the later result then settles nothing,
    // which is the honest reading of "we do not know what was searched".
    if (query === null) return state
    return { ...state, calls: { ...state.calls, [call.callId]: { turn: state.turn, query } } }
  }

  if (event.type !== 'tool/result') return state

  const result = event.data as {
    meta?: unknown
    message?: { content?: readonly { isError?: unknown }[]; source?: { callId?: unknown } }
  }
  const callId = result?.message?.source?.callId
  if (typeof callId !== 'string') return state
  if (result?.message?.content?.[0]?.isError === true) return state

  const recorded = state.calls[callId]
  if (recorded === undefined) return state
  const { query, turn } = recorded

  const sources = readSources(result.meta)

  // Sources: front-insert per published order, so the last one published ends
  // up first. A repeat of a known URL updates that row instead of adding one.
  const items = [...state.items]
  let sourceTotal = state.sourceTotal
  const urls: string[] = []
  for (const source of sources) {
    const key = urlKey(source.url)
    urls.push(key)
    const at = items.findIndex(item => urlKey(item.url) === key)
    const row: SearchRefItem = {
      url: source.url,
      host: hostOf(source.url),
      ...(source.title !== undefined ? { title: source.title } : {}),
      ...(source.snippet !== undefined ? { snippet: source.snippet } : {}),
      query,
      count: at < 0 ? 1 : (items[at]?.count ?? 0) + 1,
      lastTurn: turn,
    }
    if (at >= 0) items.splice(at, 1)
    else sourceTotal += 1
    items.unshift(row)
  }

  // Queries: newest first, one row per distinct query text, hits accumulating.
  const queries = [...state.queries]
  const qAt = queries.findIndex(row => row.query === query)
  let queryTotal = state.queryTotal
  if (qAt >= 0) {
    const previous = queries[qAt]
    queries.splice(qAt, 1)
    queries.unshift({ query, turn, hits: (previous?.hits ?? 0) + sources.length })
  } else {
    queries.unshift({ query, turn, hits: sources.length })
    queryTotal += 1
  }

  const latest = state.latest
  const nextLatest = latest !== null && latest.turn === turn
    ? { turn: latest.turn, urls: [...urls.reverse(), ...latest.urls].slice(0, CAPS.latest) }
    : latest

  return {
    ...state,
    items: items.slice(0, CAPS.items),
    queries: queries.slice(0, CAPS.queries),
    sourceTotal,
    queryTotal,
    latest: nextLatest,
  }
}
