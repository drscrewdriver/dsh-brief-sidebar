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
  /** Which tool answered — the plugin's own or the harness's. */
  readonly tool: string
  /** How many settled searches surfaced it. */
  readonly count: number
  /** Turn whose result last advanced this row. */
  readonly lastTurn: number
}

/** One search the session ran, with how many sources it returned. */
export interface SearchQueryRow {
  readonly query: string
  /** `advanced_search` (plugin) or `web_search` (host). */
  readonly tool: string
  readonly turn: number
  /**
   * Sources the call returned. For a merged multi-query `web_search` this is
   * the call's total repeated on each of its queries — the session never says
   * which query produced which source, and inventing a per-query split would
   * be worse than restating the shared total.
   */
  readonly hits: number
}

/** Fold state. Plain JSON, so the projection cache can persist it. */
export interface SearchRefState {
  /** Turn number of the open (or latest seen) turn; 0 before the first turn. */
  readonly turn: number
  /** Open turns' `callId → the search it asked for`; only owned tools are recorded. */
  readonly calls: Readonly<Record<string, { readonly turn: number; readonly tool: string; readonly queries: readonly string[] }>>
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

/**
 * The tools this fold owns, with how each one carries its query text.
 * Anything else is not a search reference even if its arguments look alike.
 */
const SEARCH_TOOLS: Readonly<Record<string, 'query' | 'queries'>> = {
  // The plugin's own tool: one query per call.
  advanced_search: 'query',
  // The harness's tool: 1..N queries whose result sets are merged.
  web_search: 'queries',
}

/**
 * Extract the query list of one committed `tool/call`.
 *
 * @param name - wire tool name.
 * @param argsRaw - model-produced JSON arguments (a string by the session contract).
 * @returns the non-blank queries in published order, or null when this call is not a search.
 */
export function queriesFromArgs(name: string, argsRaw: string): readonly string[] | null {
  const shape = SEARCH_TOOLS[name]
  if (shape === undefined) return null
  let args: unknown
  try {
    args = JSON.parse(argsRaw) as unknown
  } catch {
    return null
  }
  if (typeof args !== 'object' || args === null || Array.isArray(args)) return null
  const record = args as Record<string, unknown>
  const keep = (value: unknown, out: string[]): void => {
    if (typeof value === 'string' && value.trim().length > 0) out.push(value.trim())
  }
  const out: string[] = []
  if (shape === 'query') {
    keep(record['query'], out)
  } else {
    // A non-array `queries` is a drifted argument, not a search we can name.
    if (!Array.isArray(record['queries'])) return null
    for (const entry of record['queries']) keep(entry, out)
  }
  return out.length > 0 ? out : null
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
    const calls: Record<string, { readonly turn: number; readonly tool: string; readonly queries: readonly string[] }> = {}
    for (const [id, entry] of Object.entries(state.calls)) {
      if (entry.turn >= turn.turn - 1) calls[id] = entry
    }
    return { ...state, turn: turn.turn, calls, latest: { turn: turn.turn, urls: [] } }
  }

  if (event.type === 'tool/call') {
    const call = event.data as { callId?: unknown; name?: unknown; arguments?: unknown }
    if (typeof call?.callId !== 'string') return state
    if (typeof call.name !== 'string' || typeof call.arguments !== 'string') return state
    if (SEARCH_TOOLS[call.name] === undefined) return state
    const queries = queriesFromArgs(call.name, call.arguments)
    // An unreadable query is not recorded: the later result then settles nothing,
    // which is the honest reading of "we do not know what was searched".
    if (queries === null) return state
    return { ...state, calls: { ...state.calls, [call.callId]: { turn: state.turn, tool: call.name, queries } } }
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
  const { tool, queries: asked, turn } = recorded
  // The row label is the last query of the call: for a merged multi-query
  // `web_search` that is the one whose wording the reader most recently saw.
  const query = asked[asked.length - 1] ?? ''

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
      tool,
      count: at < 0 ? 1 : (items[at]?.count ?? 0) + 1,
      lastTurn: turn,
    }
    if (at >= 0) items.splice(at, 1)
    else sourceTotal += 1
    items.unshift(row)
  }

  // Queries: newest first, one row per distinct query text, hits accumulating.
  // Every query of the call gets its own row — `web_search` merges N of them
  // and the reader asked what was searched, not which call carried it.
  const queries = [...state.queries]
  let queryTotal = state.queryTotal
  for (const asked2 of asked) {
    const qAt = queries.findIndex(row => row.query === asked2)
    if (qAt >= 0) {
      const previous = queries[qAt]
      queries.splice(qAt, 1)
      queries.unshift({ query: asked2, tool, turn, hits: (previous?.hits ?? 0) + sources.length })
    } else {
      queries.unshift({ query: asked2, tool, turn, hits: sources.length })
      queryTotal += 1
    }
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
