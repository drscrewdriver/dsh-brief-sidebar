/**
 * The session-recall section: what this session actually injected, drawn as a
 * part of the summary tab — and now annotatable.
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
 * Rating is a THIRD gate, and it fails open the same way: the mark goes back to
 * prime-memory over its client RPC route (`recall-feedback.ts`). A composition
 * whose prime-memory predates that endpoint answers 404, and the section falls
 * back to the read-only list it used to be — no per-click error, no dead button.
 *
 * What the marks mean (prime-memory owns the semantics, this only offers them):
 * - `0..5` — how relevant this recall actually was. Aggregated; it does NOT
 *   rewrite any ranking on its own.
 * - `-1`  — "this memory is obsolete": prime-memory retires the record (soft
 *   delete, restorable from its panel) and tells the model next turn. That is
 *   why it takes a second confirming click and says so on the button.
 *
 * Colours come from `--dsw-alias-*` tokens only (skin contract, enforced by
 * `tests/purity.spec.ts`).
 */
import { createElement } from 'react'
import { useCallback, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import { MEMORY_RECALL_KEY, readRecall } from './memory-recall'
import type { MemoryRecallItem, MemoryRecallView } from './memory-recall'
import { FEEDBACK_SCORES, sendRecallFeedback } from './recall-feedback'
import type { FeedbackFetch, FeedbackScore } from './recall-feedback'
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
  /**
   * The transport for rating. Defaults to the page's `fetch`; injectable so the
   * click path is testable without a browser.
   */
  fetchImpl?: FeedbackFetch
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

const HINT_STYLE: CSSProperties = {
  padding: '2px 12px 0',
  color: 'var(--dsw-alias-label-tertiary)',
  fontSize: 11,
  lineHeight: '15px',
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

/** Selected row: one hairline of accent, no colour literal (skin contract). */
const ROW_SELECTED_STYLE: CSSProperties = {
  ...ROW_STYLE,
  background: 'var(--dsw-alias-fill-quaternary)',
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

const STRIP_STYLE: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 4,
  marginTop: 4,
}

const SCORE_BUTTON_STYLE: CSSProperties = {
  minWidth: 24,
  padding: '0 5px',
  height: 20,
  fontSize: 11,
  lineHeight: '18px',
  color: 'var(--dsw-alias-label-secondary)',
  background: 'none',
  border: '1px solid var(--dsw-alias-border-secondary)',
  borderRadius: 4,
  cursor: 'pointer',
}

/** The chosen mark: same box, filled so it survives a re-render without colour literals. */
const SCORE_ACTIVE_STYLE: CSSProperties = {
  ...SCORE_BUTTON_STYLE,
  border: '1px solid var(--dsw-alias-label-secondary)',
  color: 'var(--dsw-alias-label-primary)',
}

/** `-1` reads as an action, not a score: text instead of a number. */
const OBSOLETE_BUTTON_STYLE: CSSProperties = {
  ...SCORE_BUTTON_STYLE,
  minWidth: 0,
  whiteSpace: 'nowrap',
}

const OBSOLETE_ARMED_STYLE: CSSProperties = {
  ...OBSOLETE_BUTTON_STYLE,
  border: '1px solid var(--dsw-alias-border-color-danger)',
  color: 'var(--dsw-alias-label-primary)',
  fontWeight: 600,
}

const MARK_STYLE: CSSProperties = {
  marginTop: 2,
  color: 'var(--dsw-alias-label-tertiary)',
  fontSize: 11,
  lineHeight: '15px',
}

const ERROR_STYLE: CSSProperties = {
  marginTop: 2,
  color: 'var(--dsw-alias-label-secondary)',
  fontSize: 11,
  lineHeight: '15px',
  overflowWrap: 'anywhere',
}

/**
 * The rating strip of one selected row: `-1` (two-step) plus `0..5`.
 *
 * Exported for tests — the section itself only mounts it for the selected row,
 * and a static render never has one selected.
 * @param props - labels, current mark, and the click handlers.
 */
export function RatingStrip(props: {
  current: number | undefined
  pending: boolean
  armed: boolean
  obsoleteLabel: string
  confirmLabel: string
  onScore(score: FeedbackScore): void
}): ReactNode {
  const { current, pending, armed } = props
  return createElement(
    'div',
    { style: STRIP_STYLE, 'data-dsh-brief-sidebar': 'recall-rating-strip' },
    createElement(
      'button',
      {
        type: 'button',
        style: armed ? OBSOLETE_ARMED_STYLE : OBSOLETE_BUTTON_STYLE,
        disabled: pending,
        // The tooltip escalates with the button, so "confirm" is never visible
        // before the first click actually armed it.
        title: armed ? props.confirmLabel : props.obsoleteLabel,
        onClick: () => { props.onScore(-1) },
      },
      armed ? props.confirmLabel : props.obsoleteLabel,
    ),
    ...FEEDBACK_SCORES.filter(s => s >= 0).map(score => createElement(
      'button',
      {
        key: score,
        type: 'button',
        style: current === score ? SCORE_ACTIVE_STYLE : SCORE_BUTTON_STYLE,
        disabled: pending,
        'aria-pressed': current === score,
        onClick: () => { props.onScore(score) },
      },
      String(score),
    )),
  )
}

/**
 * One recalled memory: type pill, first line of the body (full text and the
 * "when should this surface" phrases ride the tooltip), its own priority, and —
 * once selected — the rating strip.
 */
function RecallRow(props: {
  item: MemoryRecallItem
  selected: boolean
  pending: boolean
  armed: boolean
  mark: number | undefined
  error: string | undefined
  rating: boolean
  t: (key: string) => string
  onSelect(): void
  onScore(score: FeedbackScore): void
}): ReactNode {
  const { item, selected, mark, error, t } = props
  const scenario = item.scenario === undefined ? undefined : item.scenario.join(' · ')
  const markText = mark === undefined
    ? undefined
    : mark === -1
      ? t('recall.obsoleted')
      : expandCount(t('recall.rated'), mark)
  return createElement(
    'li',
    {
      style: selected && props.rating ? ROW_SELECTED_STYLE : ROW_STYLE,
      onClick: props.rating ? props.onSelect : undefined,
    },
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
      markText !== undefined && createElement('span', { style: MARK_STYLE }, markText),
      error !== undefined && createElement(
        'span',
        { style: ERROR_STYLE },
        `${t('recall.failed')}${error}`,
      ),
      selected && props.rating && createElement(RatingStrip, {
        current: mark,
        pending: props.pending,
        armed: props.armed,
        obsoleteLabel: t('recall.obsolete'),
        confirmLabel: t('recall.obsoleteConfirm'),
        onScore: props.onScore,
      }),
    ),
    createElement('span', { style: META_STYLE }, `P${item.priority}`),
  )
}

/** How long the `-1` button stays armed before reverting to its plain label. */
const ARM_WINDOW_MS = 5_000

/**
 * The session-recall section. All hooks run unconditionally (a conditional hook
 * order would break the moment the switch flips); the gates only decide whether
 * the resolved view paints and whether rows are clickable.
 * @param props - translation, client context, session scope, transport.
 */
export function MemoryRecallSection(props: MemoryRecallSectionProps): ReactNode {
  const { t, ctx, scope } = props
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const [marks, setMarks] = useState<Record<string, number>>({})
  const [hidden, setHidden] = useState<readonly string[]>([])
  const [pendingId, setPendingId] = useState<string | undefined>(undefined)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [armed, setArmed] = useState(false)
  // Flipped once by a 404: the composition's prime-memory cannot take marks,
  // so the section goes back to being the plain read-only list it was.
  const [writeAbsent, setWriteAbsent] = useState(false)

  const show = useConfigFlag(ctx, resolveShowMemoryRecall)
  const view: MemoryRecallView | undefined = readRecall(
    useProjectionValue(ctx, scope?.sessionId, MEMORY_RECALL_KEY),
  )

  const sessionId = scope?.sessionId ?? ''
  const rating = writeAbsent === false && sessionId.length > 0

  const rate = useCallback((id: string, score: FeedbackScore): void => {
    if (score === -1 && armed === false) {
      // Retirement is destructive-ish (soft delete + a notice to the model):
      // the first click only arms the button.
      setArmed(true)
      setTimeout(() => { setArmed(false) }, ARM_WINDOW_MS)
      return
    }
    if (pendingId !== undefined) return
    setArmed(false)
    setPendingId(id)
    const impl: FeedbackFetch | undefined = props.fetchImpl
      ?? (typeof fetch === 'function' ? (fetch as unknown as FeedbackFetch) : undefined)
    void sendRecallFeedback(impl, { sessionId, id, score }).then(outcome => {
      setPendingId(undefined)
      if (outcome.status === 'sent') {
        setMarks(current => ({ ...current, [id]: score }))
        setErrors(current => {
          const next = { ...current }
          delete next[id]
          return next
        })
        if (outcome.retired) setHidden(current => (current.includes(id) ? current : [...current, id]))
        if (score !== -1) setSelectedId(undefined)
      } else if (outcome.status === 'absent') {
        setWriteAbsent(true)
        setSelectedId(undefined)
      } else {
        setErrors(current => ({ ...current, [id]: outcome.reason }))
      }
    })
  }, [armed, pendingId, props.fetchImpl, sessionId])

  const onSelect = useCallback((id: string): void => {
    setArmed(false)
    setSelectedId(current => (current === id ? undefined : id))
  }, [])

  // Switched off at the settings faces — willed away, not empty.
  if (show === false) return null

  // Capability absent (prime-memory not in the composition, no frame yet).
  if (view === undefined) return null

  const items = view.items.filter(item => hidden.includes(item.id) === false)

  if (items.length === 0) {
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
    rating && createElement('div', { style: HINT_STYLE }, t('recall.rateHint')),
    createElement(
      'ul',
      { style: LIST_STYLE },
      items.map(item => createElement(RecallRow, {
        key: item.id,
        item,
        selected: selectedId === item.id,
        pending: pendingId === item.id,
        armed: armed && selectedId === item.id,
        mark: marks[item.id] ?? item.rating,
        error: errors[item.id],
        rating,
        t,
        onSelect: () => { onSelect(item.id) },
        onScore: (score: FeedbackScore) => { rate(item.id, score) },
      })),
    ),
    createElement(
      'div',
      { style: FOOTER_STYLE },
      expandCount(t('recall.count'), view.count),
    ),
  )
}
