/**
 * The deliverables section: the `dshSummaryDeliverables` projection drawn as
 * one part of the summary tab.
 *
 * Unlike the progress section this is an OPTIONAL capability: where the host
 * half never registered the unit (older composition, key absent), the section
 * hides entirely — absence is not an error state here, and the official
 * "本次产出" row in the conversation flow still covers the turn-end view.
 * When the projection is live, the latest turn's produced paths update
 * mid-turn: every successful mutation result publishes a frame, so the reader
 * sees files appear while the turn is still running, which is exactly the gap
 * the official turn-tail row has.
 *
 * Codeplan artifacts (paths under `.agents/plans/<任务名>/`) are ordinary
 * produced entries — they are marked with a pill, not split into a separate
 * section.
 *
 * Colours come from `--dsw-alias-*` tokens only (skin contract).
 */
import { createElement } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import { DELIVERABLES_KEY } from '../../projection/keys'
import { useProjectionValue } from '../use-projection'
import { sidebarFileOpener } from '../file-open'
import { basename, readDeliverables, splitCodeplanPath } from './deliverables'
import { expandCount } from '../locales'

export interface DeliverablesSectionProps {
  /** The DSH locale lookup, passed down from `apply`. */
  t: (key: string) => string
  /** The client root context (the tab body's only way to reach services). */
  ctx?: Context
  /** The session this tab is scoped to. */
  scope?: { readonly sessionId?: string }
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

const TOTAL_STYLE: CSSProperties = {
  padding: '6px 12px 10px',
  color: 'var(--dsw-alias-label-tertiary)',
  fontSize: 12,
}

const PATH_STYLE: CSSProperties = {
  minWidth: 0,
  overflowWrap: 'anywhere',
  color: 'var(--dsw-alias-label-secondary)',
}

/** Row-as-button reset: the row itself is the click target, content unchanged. */
const BUTTON_STYLE: CSSProperties = {
  ...PATH_STYLE,
  background: 'none',
  border: 'none',
  font: 'inherit',
  fontSize: 'inherit',
  color: 'var(--dsw-alias-label-secondary)',
  padding: 0,
  textAlign: 'left',
  cursor: 'pointer',
}

/** The codeplan pill: same form as the status pills, tertiary emphasis. */
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

/**
 * One produced-file row. When the sidebar opener is available the row is a
 * button that routes the path to the Sidebar preview (the same channel the
 * conversation's produced-file chips use); otherwise it degrades to a plain
 * span. A codeplan artifact carries the pill either way.
 */
function PathRow(props: {
  path: string
  t: (key: string) => string
  open?: (path: string) => void
}): ReactNode {
  const { path, t, open } = props
  const plan = splitCodeplanPath(path)
  const title = plan === null ? path : `${t('deliverable.codeplanTag')}: ${plan.task} · ${path}`
  const label = basename(path)
  const content = plan === null ? null : createElement('span', { style: TAG_STYLE }, t('deliverable.codeplanTag'))
  if (open === undefined) {
    return createElement(
      'li',
      { style: ROW_STYLE },
      content,
      createElement('span', { style: PATH_STYLE, title }, label),
    )
  }
  return createElement(
    'li',
    { style: ROW_STYLE },
    content,
    createElement('button', { style: BUTTON_STYLE, title, onClick: () => { open(path) } }, label),
  )
}

/**
 * The deliverables section. The subscription is unconditional (a plain
 * listener, not IO).
 * @param props - translation, client context, session scope.
 */
export function DeliverablesSection(props: DeliverablesSectionProps): ReactNode {
  const { t, ctx, scope } = props

  const view = readDeliverables(useProjectionValue(ctx, scope?.sessionId, DELIVERABLES_KEY))

  // Capability absent — the optional unit never registered. Hide, don't nag.
  if (view === undefined) return null

  // Optional click-to-preview: rows degrade to plain text where the sidebar
  // service is absent (the opener resolves the session cwd per click).
  const open = sidebarFileOpener(ctx, scope?.sessionId)

  const latestPaths = view.latest?.paths ?? []

  if (latestPaths.length === 0 && view.sessionTotal === 0) {
    return createElement(
      'div',
      { style: SECTION_STYLE, 'data-dsh-brief-sidebar': 'deliverables-section' },
      createElement('div', { style: HEADER_STYLE }, t('section.deliverables')),
      createElement(
        'div',
        {
          style: {
            margin: '0 auto',
            padding: 24,
            maxWidth: 460,
            textAlign: 'center',
            color: 'var(--dsw-alias-label-tertiary)',
            lineHeight: 1.7,
            fontSize: 12,
          },
        },
        createElement('div', { style: { marginBottom: 6, color: 'var(--dsw-alias-label-secondary)' } }, t('deliverables.empty')),
        createElement('div', null, t('deliverables.emptyHint')),
      ),
    )
  }

  return createElement(
    'div',
    { style: SECTION_STYLE, 'data-dsh-brief-sidebar': 'deliverables-section' },
    createElement('div', { style: HEADER_STYLE }, t('section.deliverables')),
    createElement(
      'ul',
      { style: LIST_STYLE },
      latestPaths.map(path => createElement(PathRow, { key: path, path, t, open })),
    ),
    createElement(
      'div',
      { style: TOTAL_STYLE },
      expandCount(t('deliverables.sessionTotal'), view.sessionTotal),
    ),
  )
}
