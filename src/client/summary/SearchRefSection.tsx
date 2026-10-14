/**
 * The search-reference section: the `dshSummarySearchRefs` projection drawn as
 * one tab of the references section.
 *
 * It answers "what did this session pull in from outside", and it answers it the
 * way the conversation to its left does: **one left-aligned bubble per source**,
 * title as a link, host and provider snippet under it. No group headers, no list
 * of query titles — that wall duplicated what the transcript already shows, and a
 * reader who opens this tab is looking for the results, not for a restatement of
 * the questions.
 *
 * The fold still records which query and which tool (`web_search` or the user's
 * own `advanced_search`) surfaced each source; that data stays in the frame for
 * any surface that wants it, it is just no longer drawn here. An older
 * `dsh-free-search` without `presentationMeta` yields queries with no sources —
 * that degraded case is stated (`searchRefs.noSourcesHint`) rather than left as
 * an empty pane, because an empty list reads as "the search found nothing".
 *
 * Optional on both sides: no registry, or a host half that never registered the
 * unit, means the client reads capability absence and the section hides.
 *
 * Two contracts inherited from the recall section:
 * - **no native `title` attribute** — the whole text rides the row or is left
 *   out; an unskinable tooltip would overlap the plugin's own surfaces;
 * - **colours from `--dsw-alias-*` tokens only** (skin contract).
 *
 * Source links are untrusted external data, so only `http`/`https` become
 * anchors (see `safeHref`) and they open with `rel="noreferrer noopener"`.
 */
import { createElement, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import { SEARCH_REFS_KEY } from '../../projection/keys'
import type { SearchRefItemView } from '../../projection/keys'
import { useProjectionValue } from '../use-projection'
import { FoldToggle, GroupHeader } from './FoldToggle'
import { expandCount, expandTotal } from '../locales'
import { clusterByQuery, isLatestSource, readSearchRefs, safeHref } from './search-refs'

export interface SearchRefSectionProps {
  /** The DSH locale lookup, passed down from `apply`. */
  t: (key: string) => string
  /** The client root context (the tab body's only way to reach services). */
  ctx?: Context
  /** The session this tab is scoped to. */
  scope?: { readonly sessionId?: string }
  /** Drop the section header (the references tab already names it). */
  hideHeader?: boolean
}

const SECTION_STYLE: CSSProperties = {
  flexShrink: 0,
  borderBottom: '1px solid var(--dsw-alias-border-secondary)',
}

const HEADER_STYLE: CSSProperties = {
  padding: '10px 12px 0',
  color: 'var(--dsw-alias-label-secondary)',
  fontSize: 12,
  fontWeight: 600,
}

const LIST_STYLE: CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: '8px 12px 10px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 8,
}

/**
 * One result, drawn as a chat bubble: left-aligned, background-filled, rounded,
 * and narrower than the column. The reader reads this tab the way they read the
 * conversation to its left — each bubble is one thing the session pulled in — so
 * the list chrome (row rules, group headers, per-query title lines) is dropped
 * rather than restyled.
 *
 * `alignItems: flex-start` on the list is what keeps bubbles hugging the left
 * edge; without it a flex child stretches to the full column and the bubble
 * reads as a plain card.
 */
const BUBBLE_STYLE: CSSProperties = {
  maxWidth: '92%',
  padding: '8px 10px',
  borderRadius: 10,
  background: 'var(--dsw-alias-bg-layer-3)',
  border: '1px solid var(--dsw-alias-border-l2)',
  color: 'var(--dsw-alias-label-primary)',
  fontSize: 12,
  lineHeight: '17px',
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
}

/** The source title, up to three lines: inside a bubble it IS the content. */
const TITLE_STYLE: CSSProperties = {
  minWidth: 0,
  overflowWrap: 'anywhere',
  display: '-webkit-box',
  WebkitLineClamp: 3,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
}

const SNIPPET_STYLE: CSSProperties = {
  margin: 0,
  minWidth: 0,
  overflowWrap: 'anywhere',
  color: 'var(--dsw-alias-label-tertiary)',
  fontSize: 11,
  lineHeight: '16px',
}

const HOST_STYLE: CSSProperties = {
  color: 'var(--dsw-alias-label-tertiary)',
  fontSize: 11,
  lineHeight: '16px',
  overflowWrap: 'anywhere',
}

/** The bubble's own footer strip — where the "本轮" pill lives now. */
const BUBBLE_FOOT_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  marginTop: 2,
  minWidth: 0,
}

/** The "本轮" pill: same form as the skill tag, tertiary emphasis. */
const TAG_STYLE: CSSProperties = {
  flexShrink: 0,
  color: 'var(--dsw-alias-label-tertiary)',
  border: '1px solid var(--dsw-alias-label-tertiary)',
  borderRadius: 999,
  padding: '0 6px',
  fontSize: 11,
  lineHeight: '16px',
  whiteSpace: 'nowrap',
}

const FOOTER_STYLE: CSSProperties = {
  padding: '0 12px 10px',
  color: 'var(--dsw-alias-label-tertiary)',
  fontSize: 11,
}

const EMPTY_STYLE: CSSProperties = {
  margin: '0 auto',
  padding: 24,
  maxWidth: 460,
  textAlign: 'center',
  color: 'var(--dsw-alias-label-tertiary)',
  lineHeight: 1.7,
  fontSize: 12,
}

/**
 * The search-reference section. The subscription is unconditional (a plain
 * listener, not IO); the view decides whether anything is drawn.
 *
 * @param props - translation, client context, session scope, header switch.
 */
export function SearchRefSection(props: SearchRefSectionProps): ReactNode {
  const { t, ctx, scope, hideHeader = false } = props

  const view = readSearchRefs(useProjectionValue(ctx, scope?.sessionId, SEARCH_REFS_KEY))

  // Manual overrides on top of the default (latest turn open, older folded).
  // Keyed by query text, so a re-render that pushes new frames does not reset
  // what the reader just opened.
  const [openMap, setOpenMap] = useState<Readonly<Record<string, boolean>>>({})

  // Capability absent — the optional unit never registered. Hide, don't nag.
  if (view === undefined) return null

  if (view.queries.length === 0 && view.sources.length === 0) {
    return createElement(
      'div',
      { style: SECTION_STYLE, 'data-dsh-brief-sidebar': 'search-refs-section' },
      !hideHeader && createElement('div', { style: HEADER_STYLE }, t('section.searchRefs')),
      createElement(
        'div',
        { style: EMPTY_STYLE },
        createElement('div', { style: { marginBottom: 6, color: 'var(--dsw-alias-label-secondary)' } }, t('searchRefs.empty')),
        createElement('div', null, t('searchRefs.emptyHint')),
      ),
    )
  }

  const body: ReactNode[] = []

  /** One result bubble; shared by every cluster so the cards stay identical. */
  const renderBubble = (item: SearchRefItemView): ReactNode => {
    const href = safeHref(item.url)
    const label = item.title ?? item.url
    const link = href === undefined
      // A non-web scheme (or a malformed URL) from a provider stays text:
      // it must not become a clickable thing in the user's sidebar.
      ? createElement('span', { style: TITLE_STYLE }, label)
      : createElement(
        'a',
        { style: TITLE_STYLE, href, target: '_blank', rel: 'noreferrer noopener' },
        label,
      )
    const latest = isLatestSource(view, item.url)
    return createElement(
      'li',
      { key: item.url, style: { minWidth: 0 }, 'data-dsh-brief-sidebar': 'search-refs-source' },
      createElement(
        'div',
        { style: BUBBLE_STYLE, 'data-dsh-brief-sidebar': 'search-refs-bubble' },
        link,
        createElement('span', { style: HOST_STYLE }, item.host),
        item.snippet !== undefined && createElement('p', { style: SNIPPET_STYLE }, item.snippet),
        // The pill sits inside the bubble so a result and its freshness
        // cannot drift apart when the column scrolls.
        (latest || item.count > 1) && createElement(
          'div',
          { style: BUBBLE_FOOT_STYLE },
          latest && createElement('span', { style: TAG_STYLE }, t('searchRefs.latestTag')),
          // Surfaced by more than one settled search — a fact about the
          // source, drawn on it rather than in a header the tab no longer
          // has. No new locale key: the count speaks for itself.
          item.count > 1 && createElement('span', { style: HOST_STYLE }, `\u00d7${item.count}`),
        ),
      ),
    )
  }

  if (view.sources.length > 0) {
    // Results clustered under the query that surfaced them: the newest turn's
    // clusters open, older ones fold to one line each. Eight searches should
    // read as eight questions, not as forty bubbles — and the reader who wants
    // an older answer can open it.
    for (const cluster of clusterByQuery(view)) {
      const key = cluster.query === '' ? '\u0000tail' : cluster.query
      // The count on a heading is the count *inside* it. The fold's `hits` is
      // what the call returned session-wide; a source can since have aged out of
      // the capped list, and a heading promising five cards over an empty pane
      // is the bug this line exists to prevent.
      const shown = expandCount(t('searchRefs.hits'), cluster.items.length)
      if (cluster.items.length === 0) {
        // Nothing to open: a plain line, not a chevron that reveals an empty
        // group. The query still shows, because "it was asked" is the fact. (A
        // tail group never gets here — it only exists when it holds sources.)
        body.push(createElement(GroupHeader, {
          key: `h:${key}`,
          text: `${cluster.query} · ${shown}`,
          marker: 'search-refs-cluster-empty',
        }))
        continue
      }
      const open = openMap[key] ?? cluster.latest
      body.push(createElement(FoldToggle, {
        key: `h:${key}`,
        // The tail group has no query to name it, so it borrows the source
        // count heading — “来源 · N” is exactly what it holds, and no locale key
        // gets spent on a case that only shows up when a query aged out of the
        // capped list.
        label: cluster.query === ''
          ? expandCount(t('searchRefs.sourceGroup'), cluster.items.length)
          : `${cluster.query} · ${shown}`,
        open,
        marker: 'search-refs-cluster',
        onToggle: () => { setOpenMap(prev => ({ ...prev, [key]: !open })) },
      }))
      if (!open) continue
      body.push(createElement(
        'ul',
        { key: `b:${key}`, style: LIST_STYLE, 'data-dsh-brief-sidebar': 'search-refs-cluster-items' },
        cluster.items.map(renderBubble),
      ))
    }
  } else {
    // 有查询无来源：老版 dsh-free-search 不发 meta。说清楚，别让人以为搜了没结果。
    body.push(createElement(
      'div',
      { key: 'ns', style: FOOTER_STYLE, 'data-dsh-brief-sidebar': 'search-refs-no-sources' },
      t('searchRefs.noSourcesHint'),
    ))
  }

  // 列表有上限，页脚说真数：只有真数超过列表长度时才出现，免得两个数字打架。
  if (view.queryTotal > view.queries.length || view.sourceTotal > view.sources.length) {
    body.push(createElement(
      'div',
      { key: 'cap', style: FOOTER_STYLE, 'data-dsh-brief-sidebar': 'search-refs-capped' },
      expandTotal(t('searchRefs.capped'), Math.max(view.queryTotal, view.sourceTotal)),
    ))
  }

  return createElement(
    'div',
    { style: SECTION_STYLE, 'data-dsh-brief-sidebar': 'search-refs-section' },
    !hideHeader && createElement('div', { style: HEADER_STYLE }, t('section.searchRefs')),
    ...body,
  )
}
