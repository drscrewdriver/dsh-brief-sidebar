/**
 * The memory-slots section: the `memorySlots` projection drawn as the third
 * part of the summary tab (fixed last: 进展 → 产物 → 记忆).
 *
 * TWO gates, both fail-open to "hidden", so a host without dsh-prime-memory
 * paints nothing here:
 *
 * 1. **The switch.** This plugin's entry config (`configForms` → entry
 *    `dsh-brief-sidebar`, field `showMemorySlots`, default on). When the
 *    config face cannot answer (service absent, scope not ready, field
 *    unset) the default applies — see `scope-face.ts`.
 * 2. **The capability.** The `memorySlots` projection must exist for the
 *    session; `undefined` hides the section entirely, exactly like the
 *    optional deliverables section.
 *
 * Colours come from `--dsw-alias-*` tokens only (skin contract, enforced by
 * `tests/purity.spec.ts`).
 */
import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { createElement } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import {
  MEMORY_SLOTS_KEY,
  readSlots,
  truncateBody,
} from './memory-slots'
import type { MemorySlotView, MemorySlotsView } from './memory-slots'
import { resolveShowMemorySlots } from '../scope-face'
import type { BriefClientConfig, ConfigFormsLike, SettingsScope, SettingsScopeSnapshot } from '../scope-face'
import { useProjectionValue } from '../use-projection'
import { expandCount } from '../locales'

export interface MemorySlotsSectionProps {
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

const TITLE_STYLE: CSSProperties = {
  minWidth: 0,
  overflowWrap: 'anywhere',
  color: 'var(--dsw-alias-label-secondary)',
}

const META_STYLE: CSSProperties = {
  flexShrink: 0,
  color: 'var(--dsw-alias-label-tertiary)',
  fontSize: 11,
  lineHeight: '18px',
  whiteSpace: 'nowrap',
}

/** The kind pill: same form as the codeplan pill, tertiary emphasis. */
const KIND_STYLE: CSSProperties = {
  flexShrink: 0,
  color: 'var(--dsw-alias-label-tertiary)',
  border: '1px solid var(--dsw-alias-label-tertiary)',
  borderRadius: 999,
  padding: '0 6px',
  fontSize: 11,
  lineHeight: '16px',
  whiteSpace: 'nowrap',
}

/** The status pill: filled tint for an open slot, plain text otherwise. */
const STATUS_OPEN_STYLE: CSSProperties = {
  flexShrink: 0,
  color: 'var(--dsw-alias-label-primary)',
  border: '1px solid var(--dsw-alias-label-secondary)',
  borderRadius: 999,
  padding: '0 6px',
  fontSize: 11,
  lineHeight: '16px',
  whiteSpace: 'nowrap',
}

const STATUS_SETTLED_STYLE: CSSProperties = {
  ...STATUS_OPEN_STYLE,
  color: 'var(--dsw-alias-label-tertiary)',
  border: '1px solid var(--dsw-alias-label-tertiary)',
}

const BODY_STYLE: CSSProperties = {
  margin: 0,
  minWidth: 0,
  overflowWrap: 'anywhere',
  color: 'var(--dsw-alias-label-tertiary)',
  fontSize: 12,
  lineHeight: '18px',
}

const REFS_STYLE: CSSProperties = {
  ...BODY_STYLE,
  fontSize: 11,
}

const TOTAL_STYLE: CSSProperties = {
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

/** Locale key per known slot status; unknown statuses fall back to the raw wire value. */
const STATUS_KEY: Record<string, string> = {
  open: 'slots.status.open',
  done: 'slots.status.done',
  dropped: 'slots.status.dropped',
  expired: 'slots.status.expired',
}

/**
 * One slot row: kind pill, title (full body rides the tooltip), status pill,
 * priority; body and refs lines underneath when the wire view carries them.
 */
function SlotRow(props: { slot: MemorySlotView; t: (key: string) => string }): ReactNode {
  const { slot, t } = props
  const statusLabel = STATUS_KEY[slot.status] === undefined ? slot.status : t(STATUS_KEY[slot.status])
  const title = slot.body === undefined ? slot.title : `${slot.title} — ${slot.body}`
  return createElement(
    'li',
    { style: ROW_STYLE },
    createElement('span', { style: KIND_STYLE }, slot.kind),
    createElement(
      'div',
      { style: { minWidth: 0, flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: 2 } },
      createElement('span', { style: TITLE_STYLE, title }, slot.title),
      slot.body !== undefined && createElement('p', { style: BODY_STYLE }, truncateBody(slot.body)),
      slot.refs !== undefined && createElement('p', { style: REFS_STYLE }, slot.refs.join(' · ')),
    ),
    createElement('span', { style: META_STYLE }, `P${slot.priority}`),
    createElement(
      'span',
      { style: slot.status === 'open' ? STATUS_OPEN_STYLE : STATUS_SETTLED_STYLE },
      statusLabel,
    ),
  )
}

/**
 * A no-op unsubscribe source, kept as one identity so the absent-scope
 * subscription never thrashes (returns a no-op disposer, as the store
 * contract requires).
 */
const NO_SUBSCRIBE = (): (() => void) => () => {}

/**
 * The snapshot served while no config scope is reachable — resolves to the
 * switch default (on) in `resolveShowMemorySlots`.
 */
const ABSENT_SNAPSHOT: SettingsScopeSnapshot<BriefClientConfig> = {
  status: 'unavailable',
  value: undefined,
  revision: undefined,
  writable: false,
}

/**
 * Subscribe to this plugin's entry config and resolve the section switch.
 *
 * The scope is resolved defensively (a host without `configForms` degrades to
 * the default instead of throwing inside a render) and subscribed with
 * `useSyncExternalStore`, so flipping the switch in settings updates the open
 * tab without a reload.
 *
 * @param ctx - the client root context handed to the tab body.
 * @returns whether the memory-slots section may render at all.
 */
export function useShowMemorySlots(ctx: Context | undefined): boolean {
  const scope = useMemo(() => {
    if (ctx === undefined) return undefined
    const configForms = ctx.get('configForms') as ConfigFormsLike | undefined
    if (configForms === undefined || typeof configForms.get !== 'function') return undefined
    return configForms.get<BriefClientConfig>('dsh-brief-sidebar')
  }, [ctx])

  const subscribe = useCallback(
    (listener: () => void) => scope?.subscribe(listener) ?? NO_SUBSCRIBE(),
    [scope],
  )
  const getSnapshot = useCallback(
    () => scope?.getSnapshot() ?? ABSENT_SNAPSHOT,
    [scope],
  )

  return resolveShowMemorySlots(useSyncExternalStore(subscribe, getSnapshot, getSnapshot))
}

/**
 * The memory-slots section. Both hooks run unconditionally (a conditional
 * hook order would break the moment the switch flips); the switch only
 * decides whether the resolved view paints.
 * @param props - translation, client context, session scope.
 */
export function MemorySlotsSection(props: MemorySlotsSectionProps): ReactNode {
  const { t, ctx, scope } = props

  const show = useShowMemorySlots(ctx)
  const view: MemorySlotsView | undefined = readSlots(
    useProjectionValue(ctx, scope?.sessionId, MEMORY_SLOTS_KEY),
  )

  // Switched off at the settings faces — the section is willed away, not
  // empty (an empty state would claim prime-memory answered when the user
  // simply closed the section).
  if (show === false) return null

  // Capability absent (prime-memory not in the composition, no frame yet) —
  // hide, don't nag; the memory panel remains the write surface.
  if (view === undefined) return null

  if (view.slots.length === 0) {
    return createElement(
      'div',
      { style: SECTION_STYLE, 'data-dsh-brief-sidebar': 'memory-slots-section' },
      createElement('div', { style: HEADER_STYLE }, t('section.memorySlots')),
      createElement(
        'div',
        { style: EMPTY_STYLE },
        createElement('div', { style: { marginBottom: 6, color: 'var(--dsw-alias-label-secondary)' } }, t('slots.empty')),
        createElement('div', null, t('slots.emptyHint')),
      ),
    )
  }

  return createElement(
    'div',
    { style: SECTION_STYLE, 'data-dsh-brief-sidebar': 'memory-slots-section' },
    createElement('div', { style: HEADER_STYLE }, t('section.memorySlots')),
    createElement(
      'ul',
      { style: LIST_STYLE },
      view.slots.map(slot => createElement(SlotRow, { key: slot.id, slot, t })),
    ),
    createElement(
      'div',
      { style: TOTAL_STYLE },
      expandCount(t('slots.openCount'), view.openCount),
    ),
  )
}
