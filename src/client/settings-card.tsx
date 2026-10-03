/**
 * BriefSettingsCard — the brief-sidebar settings card.
 *
 * One component mounted at TWO seats, fed by the SAME inject factory (one
 * source of truth, the dsh-thinking-levels arrangement):
 *
 * - the plugin-family settings section (「起子插件设置」, the `settings.section`
 *   entry dsh-thinking-levels registers; this plugin contributes its card to
 *   the `dsh-family.tab` child slot — the inject idles harmlessly when the
 *   family section is absent);
 * - the Plugins-page configuration card (`plugins.bundle.config`, keyed by
 *   the package name, rendered on the bundle's detail page).
 *
 * The card binds this plugin's entry config through the `configForms` service
 * and renders the fields the summary tab reads. Every change commits
 * immediately through the scope (no staged form), so a flip applies to the
 * open summary tab on its next render.
 *
 * The `t` binder is injected by the factory (the same closure the tab uses) —
 * the card does not rely on the framework's locale props, so it renders the
 * active language on every host generation. Kept dependency-free beyond
 * react: inline styles over `--dsw-alias-*` tokens only (no CSS modules, no
 * hex/rgba literals — the purity spec enforces the token contract).
 */
import { useCallback, useState, useSyncExternalStore } from 'react'
import { createElement } from 'react'
import type { CSSProperties, ChangeEvent, ReactNode } from 'react'
import type { BriefClientConfig, SettingsScope, SettingsScopeSnapshot } from './scope-face'

/** A no-op unsubscribe source, kept as one identity so effects never thrash. */
const NO_SUBSCRIBE = (): (() => void) => () => {}

/** The snapshot served while no scope is reachable. */
const ABSENT: SettingsScopeSnapshot<BriefClientConfig> = {
  status: 'unavailable',
  value: undefined,
  revision: undefined,
  writable: false,
}

/** Injected face: the entry scope, plus the plugin's own binder. */
export interface BriefSettingsCardInjected {
  /** `configForms.get('dsh-brief-sidebar')` — may be unavailable on odd hosts. */
  scope?: SettingsScope<BriefClientConfig>
  /** The plugin's locale binder (applied-time closure over the locale service). */
  t: (key: string) => string
}

export type BriefSettingsCardProps = BriefSettingsCardInjected

/* ── shared row styling (inline; keeps the client bundle CSS-free) ──────── */

const CARD_STYLE: CSSProperties = {
  border: '1px solid var(--dsw-alias-border-l2)',
  background: 'var(--dsw-alias-bg-layer-3)',
  borderRadius: 12,
  transition: 'border-color 0.16s, background 0.16s',
}

const HEADER_STYLE: CSSProperties = {
  appearance: 'none',
  width: '100%',
  font: 'inherit',
  color: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
  background: 'none',
  border: 0,
  borderRadius: 12,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '14px 16px',
}

const HEADER_TEXT_STYLE: CSSProperties = { flex: '1 1 0%', minWidth: 0 }

const NAME_STYLE: CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--dsw-alias-label-primary)',
}

const DESC_STYLE: CSSProperties = {
  color: 'var(--dsw-alias-label-tertiary)',
  fontSize: 13,
  lineHeight: 1.5,
}

const CHEVRON_STYLE = (open: boolean): CSSProperties => ({
  color: 'var(--dsw-alias-label-tertiary)',
  flex: '0 0 auto',
  transition: 'transform 0.16s',
  transform: open ? 'rotate(180deg)' : 'none',
})

const BODY_STYLE: CSSProperties = { padding: '12px 16px' }

const ROW_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 12,
  padding: '8px 0',
  fontSize: 13,
  lineHeight: '20px',
}

const ROW_TEXT_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  minWidth: 0,
}

const LABEL_STYLE: CSSProperties = { margin: 0, color: 'var(--dsw-alias-label-primary)' }

const HINT_STYLE: CSSProperties = {
  margin: 0,
  fontSize: 12,
  lineHeight: '18px',
  color: 'var(--dsw-alias-label-tertiary)',
}

const SWITCH_STYLE: CSSProperties = { flexShrink: 0, margin: 0, cursor: 'pointer' }

/**
 * The settings card body. `scope` is optional on purpose: the inject factory
 * always provides it, but a host whose `configForms` face degrades must not
 * crash the settings page — the card renders the unavailable note and keeps
 * its header.
 */
export function BriefSettingsCard(props: BriefSettingsCardProps): ReactNode {
  const { t, scope } = props
  const [open, setOpen] = useState(true)

  const snapshot: SettingsScopeSnapshot<BriefClientConfig> | undefined = useSyncExternalStore(
    useCallback((listener: () => void) => scope?.subscribe(listener) ?? NO_SUBSCRIBE(), [scope]),
    useCallback(() => scope?.getSnapshot() ?? ABSENT, [scope]),
    useCallback(() => scope?.getSnapshot() ?? ABSENT, [scope]),
  )
  const unavailable = scope === undefined || snapshot.status === 'unavailable'
  const readonly = unavailable || !snapshot.writable
  const checked = snapshot.value?.showMemorySlots !== false

  return createElement(
    'div',
    { style: CARD_STYLE, 'data-dsh-brief-sidebar': 'settings-card' },
    createElement(
      'button',
      { type: 'button', 'aria-expanded': open, style: HEADER_STYLE, onClick: () => { setOpen(current => !current) } },
      createElement(
        'span',
        { style: HEADER_TEXT_STYLE },
        createElement('div', { style: NAME_STYLE }, t('settings.title')),
        createElement('div', { style: DESC_STYLE }, t('settings.desc')),
      ),
      createElement(
        'svg',
        { width: 16, height: 16, viewBox: '0 0 16 16', 'aria-hidden': true, style: CHEVRON_STYLE(open) },
        createElement('path', {
          d: 'M4 6l4 4 4-4',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.5,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      ),
    ),
    open && createElement(
      'div',
      { style: BODY_STYLE },
      unavailable
        ? createElement('p', { style: HINT_STYLE }, t('settings.unavailable'))
        : createElement(
          'div',
          { style: ROW_STYLE },
          createElement(
            'div',
            { style: ROW_TEXT_STYLE },
            createElement('label', { htmlFor: 'dsh-brief-sidebar-show-memory-slots', style: LABEL_STYLE }, t('settings.memorySlots')),
            createElement('p', { style: HINT_STYLE }, t('settings.memorySlotsHint')),
          ),
          createElement('input', {
            id: 'dsh-brief-sidebar-show-memory-slots',
            type: 'checkbox',
            checked,
            disabled: readonly,
            style: SWITCH_STYLE,
            onChange: (event: ChangeEvent<HTMLInputElement>) => {
              void scope?.set('showMemorySlots', event.currentTarget.checked)
            },
          }),
        ),
      !unavailable && !snapshot.writable && createElement('p', { style: HINT_STYLE }, t('settings.readonly')),
    ),
  )
}
