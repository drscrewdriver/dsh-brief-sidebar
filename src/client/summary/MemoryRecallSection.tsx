/**
 * The session-recall section: what this session actually injected, drawn as a
 * part of the summary tab — and now annotatable.
 *
 * Where `MemorySlotsSection` lists hand-pinned resident conventions (written
 * once, injected every turn), this one answers a different question: **which
 * memories did the model see this session, and which are still in context**.
 * The set is not resident — it is relevance recall. Compaction does NOT drop
 * entries: prime-memory marks the ones whose text a summary replaced as
 * `superseded`, and this section hides those (the footer keeps the count).
 * Retired rows are the exception and stay visible. Only `/clear` empties the list.
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
 * A retired row does NOT leave this list: the retirement is the human's verdict
 * on that memory, so the row stays, struck through and unselectable, until the
 * session is cleared. A `superseded` row (its text was replaced by a summary, so
 * it is no longer in context) IS hidden, with the count kept in the footer.
 * Hovering a row opens one bubble with the whole body (`RecallBubble`)
 * — the row itself is clamped to two lines and the sidebar is narrow.
 *
 * Colours come from `--dsw-alias-*` tokens only (skin contract, enforced by
 * `tests/purity.spec.ts`).
 */
import { createElement } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import { MEMORY_RECALL_KEY, readRecall } from './memory-recall'
import type { MemoryRecallItem, MemoryRecallView } from './memory-recall'
import { FEEDBACK_SCORES, sendRecallFeedback } from './recall-feedback'
import type { FeedbackFetch, FeedbackScore } from './recall-feedback'
import { RecallBubble, bubblePos } from './RecallBubble'
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
  color: 'var(--dsw-alias-label-secondary)',
  // Two lines, always the same height whatever the body says — the row keeps
  // its shape and the whole text rides the hover bubble instead.
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  fontSize: 12,
  lineHeight: '17px',
}

/**
 * Struck-through text for a retired row. Colour drops to tertiary because a
 * dead entry must not compete with a live one for the eye.
 */
const STRIKE_STYLE: CSSProperties = {
  textDecoration: 'line-through',
  color: 'var(--dsw-alias-label-tertiary)',
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
 *
 * **Every click here must stop propagating.** The strip lives INSIDE the row,
 * and the row's own `onClick` toggles the selection — so an un-stopped click
 * deselects the row, this strip unmounts mid-gesture, and the `-1` button's
 * armed "确认退场？" state is rendered on a node that is already gone. That is
 * the whole "按了没反应、也没有删除线" report: the request was never sent, the
 * confirmation was never shown, the control simply vanished on the first press.
 * @param props - labels, current mark, and the click handlers.
 */
export function RatingStrip(props: {
  current: number | undefined
  pending: boolean
  armed: boolean
  obsoleteLabel: string
  confirmLabel: string
  whyLabel: string
  onScore(score: FeedbackScore): void
}): ReactNode {
  const { current, pending, armed } = props
  // Clicks landing on the strip's gaps/padding count too: anything inside here
  // belongs to the strip, not to the row beneath it.
  const swallow = (e: { stopPropagation(): void }): void => { e.stopPropagation() }
  return createElement(
    'div',
    {
      style: STRIP_STYLE,
      onClick: swallow,
      'data-dsh-brief-sidebar': 'recall-rating-strip',
    },
    createElement(
      'button',
      {
        type: 'button',
        style: armed ? OBSOLETE_ARMED_STYLE : OBSOLETE_BUTTON_STYLE,
        disabled: pending,
        // Before arming the tooltip explains the consequence; after, it asks.
        title: armed ? props.confirmLabel : props.whyLabel,
        onClick: (e: { stopPropagation(): void }) => {
          e.stopPropagation()
          props.onScore(-1)
        },
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
        onClick: (e: { stopPropagation(): void }) => {
          e.stopPropagation()
          props.onScore(score)
        },
      },
      String(score),
    )),
  )
}

/**
 * One recalled memory: type pill, first two lines of the body, its own
 * priority, and — once selected and still alive — the rating strip. Hovering
 * opens the bubble with the whole text; a retired row is struck through and
 * cannot be selected (there is nothing left to mark on a record prime-memory
 * has already retired).
 */
function RecallRow(props: {
  item: MemoryRecallItem
  selected: boolean
  stale: boolean
  pending: boolean
  armed: boolean
  mark: number | undefined
  error: string | undefined
  rating: boolean
  t: (key: string) => string
  onSelect(): void
  onScore(score: FeedbackScore): void
  onEnter(el: HTMLElement): void
  onLeave(): void
}): ReactNode {
  const { item, selected, stale, mark, error, t } = props
  const scenario = item.scenario === undefined ? undefined : item.scenario.join(' · ')
  const markText = mark === undefined
    ? undefined
    : mark === -1
      ? t('recall.obsoleted')
      : expandCount(t('recall.rated'), mark)
  // A row prime-memory already retired but the human did not mark in this view
  // still needs the caption; when `mark === -1` the line above says the same
  // thing, so the two are mutually exclusive rather than doubled.
  const staleText = stale && mark !== -1 ? t('recall.obsoleted') : undefined
  const selectable = props.rating && !stale
  const titleStyle = stale ? { ...TITLE_STYLE, ...STRIKE_STYLE } : TITLE_STYLE
  return createElement(
    'li',
    {
      style: selected && props.rating ? ROW_SELECTED_STYLE : ROW_STYLE,
      onClick: selectable ? props.onSelect : undefined,
      onMouseEnter: (e: { currentTarget: unknown }) => {
        const el = e.currentTarget
        if (el instanceof HTMLElement) props.onEnter(el)
      },
      onMouseLeave: () => { props.onLeave() },
    },
    createElement('span', { style: TYPE_STYLE }, item.type),
    createElement(
      'div',
      { style: { minWidth: 0, flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: 2 } },
      createElement(
        'span',
        // 不给原生 `title`：那会在泡泡之外再多一个宿主自己的深色提示框，两者内容重叠、
        // 样式不受皮肤契约管，反而把泡泡遮住。全文与使用场景现在都由 `RecallBubble` 承载。
        { style: titleStyle },
        item.title,
      ),
      scenario !== undefined && createElement(
        'p',
        { style: stale ? { ...SCENARIO_STYLE, ...STRIKE_STYLE } : SCENARIO_STYLE },
        scenario,
      ),
      staleText !== undefined && createElement('span', { style: MARK_STYLE }, staleText),
      markText !== undefined && createElement('span', { style: MARK_STYLE }, markText),
      error !== undefined && createElement(
        'span',
        { style: ERROR_STYLE },
        `${t('recall.failed')}${error}`,
      ),
      selected && !stale && props.rating && createElement(RatingStrip, {
        current: mark,
        pending: props.pending,
        armed: props.armed,
        obsoleteLabel: t('recall.obsolete'),
        confirmLabel: t('recall.obsoleteConfirm'),
        whyLabel: t('recall.obsoleteWhy'),
        onScore: props.onScore,
      }),
    ),
    createElement('span', { style: META_STYLE }, `P${item.priority}`),
  )
}

/** How long the `-1` button stays armed before reverting to its plain label. */
const ARM_WINDOW_MS = 5_000

/** Delay before a hover opens its bubble (ms) — swiping past rows must not paint. */
const HOVER_DELAY_MS = 150

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
  // Rows the human just marked obsolete in THIS view. prime-memory's `retired`
  // covers the ones retired earlier; these two sets union into "draw a strike".
  const [staleIds, setStaleIds] = useState<readonly string[]>([])
  const [hover, setHover] = useState<{ id: string; top: number; left: number; right: number } | undefined>(undefined)
  const pendingHover = useRef<ReturnType<typeof setTimeout> | null>(null)
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
        if (score === -1) setStaleIds(current => (current.includes(id) ? current : [...current, id]))
        setHover(undefined)
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

  // One bubble at a time, and it opens on a delay: sweeping the mouse down the
  // list must not paint a bubble for every row it passes.
  const onEnter = useCallback((id: string, el: HTMLElement): void => {
    if (pendingHover.current !== null) clearTimeout(pendingHover.current)
    const rect = el.getBoundingClientRect()
    pendingHover.current = setTimeout(() => {
      pendingHover.current = null
      // The whole rect travels, not just its origin: `bubblePos` needs the row's
      // RIGHT edge to place the box outside the sidebar instead of on top of it.
      setHover({ id, top: rect.top, left: rect.left, right: rect.right })
    }, HOVER_DELAY_MS)
  }, [])

  const onLeave = useCallback((): void => {
    if (pendingHover.current !== null) {
      clearTimeout(pendingHover.current)
      pendingHover.current = null
    }
    setHover(undefined)
  }, [])

  // Unmounting mid-sweep would otherwise leave a timer that sets state on a
  // dead section.
  useEffect(() => () => {
    if (pendingHover.current !== null) clearTimeout(pendingHover.current)
  }, [])

  // Switched off at the settings faces — willed away, not empty.
  if (show === false) return null

  // Capability absent (prime-memory not in the composition, no frame yet).
  if (view === undefined) return null

  // Retired rows stay: that mark is the human's verdict, and the model did see them.
  // A `superseded` row is different — its text is no longer in context — so it is
  // hidden, and the footer reports the count so nothing disappears silently.
  const isStale = (item: MemoryRecallItem): boolean => item.retired === true || staleIds.includes(item.id)
  const rows = view.items.filter(item => item.superseded !== true || item.retired === true)
  const hidden = view.items.length - rows.length

  if (rows.length === 0) {
    return createElement(
      'div',
      { style: SECTION_STYLE, 'data-dsh-brief-sidebar': 'memory-recall-section' },
      createElement('div', { style: HEADER_STYLE }, t('section.memoryRecall')),
      createElement(
        'div',
        { style: EMPTY_STYLE },
        hidden > 0 ? expandCount(t('recall.supersededHidden'), hidden) : t('recall.empty'),
      ),
    )
  }

  return createElement(
    'div',
    { style: SECTION_STYLE, 'data-dsh-brief-sidebar': 'memory-recall-section' },
    createElement('div', { style: HEADER_STYLE }, t('section.memoryRecall')),
    rating && createElement('div', { style: HINT_STYLE }, `${t('recall.rateHint')}${t('recall.strikeHint')}`),
    createElement(
      'ul',
      { style: LIST_STYLE },
      rows.map(item => createElement(RecallRow, {
        key: item.id,
        item,
        selected: selectedId === item.id,
        stale: isStale(item),
        pending: pendingId === item.id,
        armed: armed && selectedId === item.id,
        mark: marks[item.id] ?? item.rating,
        error: errors[item.id],
        rating,
        t,
        onSelect: () => { onSelect(item.id) },
        onScore: (score: FeedbackScore) => { rate(item.id, score) },
        onEnter: (el: HTMLElement) => { onEnter(item.id, el) },
        onLeave,
      })),
    ),
    createElement(
      'div',
      { style: FOOTER_STYLE },
      expandCount(t('recall.count'), view.count),
      hidden > 0 && createElement(
        'div',
        { 'data-dsh-brief-sidebar': 'recall-superseded-note' },
        expandCount(t('recall.supersededHidden'), hidden),
      ),
    ),
    // The single bubble of this section. `typeof window` guard keeps a
    // non-DOM render (tests, SSR) from ever reaching the viewport maths.
    hover !== undefined && typeof window !== 'undefined'
      && (() => {
        const item = view.items.find(i => i.id === hover.id)
        if (item === undefined) return null
        return createElement(RecallBubble, {
          item,
          pos: bubblePos(hover, window.innerWidth, window.innerHeight),
          t,
        })
      })(),
  )
}
