/**
 * The session-recall section: what this session actually injected, drawn as a
 * part of the summary tab.
 *
 * Where `MemorySlotsSection` lists hand-pinned resident conventions (written
 * once, injected every turn), this one answers a different question: **which
 * memories is the model seeing right now**. The set is not resident — it is
 * relevance recall, and prime-memory empties it when the context is compacted
 * or cleared, so an entry disappearing here is honest, not a bug.
 *
 * TWO gates, both fail-open to "hidden", mirroring the slots section:
 *
 * 1. **The switch.** This plugin's entry config (`configForms` → field
 *    `showMemoryRecall`, default on).
 * 2. **The capability.** The `memoryRecall` projection must exist for the
 *    session; `undefined` hides the section entirely — a composition without
 *    dsh-prime-memory paints nothing here.
 *
 * Rows are read-only by design: the write surface for memory is prime-memory's
 * own panel, and offering pin/activate affordances here would re-introduce the
 * "resident list" reading this section exists to replace.
 *
 * Colours come from `--dsw-alias-*` tokens only (skin contract, enforced by
 * `tests/purity.spec.ts`).
 */
import { createElement } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import { MEMORY_RECALL_KEY, readRecall } from './memory-recall'
import type { MemoryRecallItem, MemoryRecallView } from './memory-recall'
import { resolveShowMemoryRecall } from '../scope-face'
import { useConfigFlag } from './use-config-flag'
import { useProjectionValue } from '../use-projection'
import { expandCount } from '../locales'

export interface MemoryRecallSectionProps {
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

/** The type pill: same form as the slot kind pill, tertiary emphasis. */
const TYPE_STYLE: CSSProperties = {
  flexShrink: 0,
  color: 'var(--dsw-alias-label-tertiary)',
  border: '1px solid var(--dsw-alias-label-tertiary)',
  borderRadius: 999,
  padding: '0 6px',
  fontSize: 11,
  lineHeight: '16px',
  whiteSpace: 'nowrap',
}

const TITLE_STYLE: CSSProperties = {
  minWidth: 0,
  overflowWrap: 'anywhere',
  color: 'var(--dsw-alias-label-secondary)',
}

const SCENARIO_STYLE: CSSProperties = {
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

const FOOTER_STYLE: CSSProperties = {
  padding: '6px 12px 10px',
  color: 'var(--dsw-alias-label-tertiary)',
  fontSize: 12,
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
 * One recalled memory: type pill, first line of the body (full text and the
 * "when should this surface" phrases ride the tooltip), its own priority.
 */
function RecallRow(props: { item: MemoryRecallItem }): ReactNode {
  const { item } = props
  const scenario = item.scenario === undefined ? undefined : item.scenario.join(' · ')
  return createElement(
    'li',
    { style: ROW_STYLE },
    createElement('span', { style: TYPE_STYLE }, item.type),
    createElement(
      'div',
      { style: { minWidth: 0, flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: 2 } },
      createElement(
        'span',
        { style: TITLE_STYLE, title: scenario === undefined ? item.title : `${item.title} — ${scenario}` },
        item.title,
      ),
      scenario !== undefined && createElement('p', { style: SCENARIO_STYLE }, scenario),
    ),
    createElement('span', { style: META_STYLE }, `P${item.priority}`),
  )
}

/**
 * The session-recall section. Both hooks run unconditionally (a conditional
 * hook order would break the moment the switch flips); the switch only decides
 * whether the resolved view paints.
 * @param props - translation, client context, session scope.
 */
export function MemoryRecallSection(props: MemoryRecallSectionProps): ReactNode {
  const { t, ctx, scope } = props

  const show = useConfigFlag(ctx, resolveShowMemoryRecall)
  const view: MemoryRecallView | undefined = readRecall(
    useProjectionValue(ctx, scope?.sessionId, MEMORY_RECALL_KEY),
  )

  // Switched off at the settings faces — willed away, not empty.
  if (show === false) return null

  // Capability absent (prime-memory not in the composition, no frame yet).
  if (view === undefined) return null

  if (view.items.length === 0) {
    return createElement(
      'div',
      { style: SECTION_STYLE, 'data-dsh-brief-sidebar': 'memory-recall-section' },
      createElement('div', { style: HEADER_STYLE }, t('section.memoryRecall')),
      createElement('div', { style: EMPTY_STYLE }, t('recall.empty')),
    )
  }

  return createElement(
    'div',
    { style: SECTION_STYLE, 'data-dsh-brief-sidebar': 'memory-recall-section' },
    createElement('div', { style: HEADER_STYLE }, t('section.memoryRecall')),
    createElement(
      'ul',
      { style: LIST_STYLE },
      view.items.map(item => createElement(RecallRow, { key: item.id, item })),
    ),
    createElement(
      'div',
      { style: FOOTER_STYLE },
      expandCount(t('recall.count'), view.count),
    ),
  )
}
