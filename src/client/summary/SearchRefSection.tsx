/**
 * The search-reference section: the `dshSummarySearchRefs` projection drawn as
 * one tab of the references section.
 *
 * It answers "what did this session pull in from outside": the queries it ran
 * through `advanced_search`, and the sources those searches returned. Two
 * groups, because they are two different facts — a query says what was asked,
 * a source says what came back, and an older `dsh-free-search` without
 * `presentationMeta` produces queries with no sources at all. That degraded
 * case is stated rather than hidden, because an empty source list would
 * otherwise read as "the search found nothing".
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
import { createElement } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import { SEARCH_REFS_KEY } from '../../projection/keys'
import { useProjectionValue } from '../use-projection'
import { GroupHeader } from './FoldToggle'
import { expandCount, expandTotal } from '../locales'
import { isLatestSource, readSearchRefs, safeHref } from './search-refs'

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
  padding: '6px 0',
  display: 'flex',
  flexDirection: 'column',
}

const ROW_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
  padding: '6px 12px',
}

const QUERY_STYLE: CSSProperties = {
  minWidth: 0,
  flex: '1 1 auto',
  overflowWrap: 'anywhere',
  color: 'var(--dsw-alias-label-secondary)',
}

/** The source title, one line: the host and URL carry the identification. */
const TITLE_STYLE: CSSProperties = {
  minWidth: 0,
  flex: '1 1 auto',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  color: 'var(--dsw-alias-label-secondary)',
}

const SNIPPET_STYLE: CSSProperties = {
  margin: 0,
  minWidth: 0,
  overflowWrap: 'anywhere',
  color: 'var(--dsw-alias-label-tertiary)',
  fontSize: 11,
  lineHeight: '16px',
}

const META_STYLE: CSSProperties = {
  flexShrink: 0,
  color: 'var(--dsw-alias-label-tertiary)',
  fontSize: 11,
  lineHeight: '18px',
  whiteSpace: 'nowrap',
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

  if (view.queries.length > 0) {
    body.push(createElement(GroupHeader, {
      key: 'qh',
      text: expandCount(t('searchRefs.queryGroup'), view.queries.length),
      marker: 'search-refs-query-group',
    }))
    body.push(createElement(
      'ul',
      { key: 'ql', style: LIST_STYLE },
      view.queries.map(row => createElement(
        'li',
        { key: `${row.turn}:${row.query}`, style: ROW_STYLE, 'data-dsh-brief-sidebar': 'search-refs-query' },
        createElement('span', { style: QUERY_STYLE }, row.query),
        createElement('span', { style: META_STYLE }, expandCount(t('searchRefs.hits'), row.hits)),
      )),
    ))
  }

  if (view.sources.length > 0) {
    body.push(createElement(GroupHeader, {
      key: 'sh',
      text: expandCount(t('searchRefs.sourceGroup'), view.sources.length),
      marker: 'search-refs-source-group',
    }))
    body.push(createElement(
      'ul',
      { key: 'sl', style: LIST_STYLE },
      view.sources.map(item => {
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
        return createElement(
          'li',
          { key: item.url, style: ROW_STYLE, 'data-dsh-brief-sidebar': 'search-refs-source' },
          createElement(
            'div',
            { style: { minWidth: 0, flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: 2 } },
            link,
            createElement('span', { style: META_STYLE }, item.host),
            item.snippet !== undefined && createElement('p', { style: SNIPPET_STYLE }, item.snippet),
          ),
          isLatestSource(view, item.url) && createElement('span', { style: TAG_STYLE }, t('searchRefs.latestTag')),
        )
      }),
    ))
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
