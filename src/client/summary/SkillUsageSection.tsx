/**
 * The skill-usage section: the `dshSummarySkillUsage` projection drawn as one
 * part of the summary tab.
 *
 * Where `MemoryRecallSection` answers "what memories did the model see", this
 * answers "which instruction packs entered the context, and which ones were on
 * the menu". Two groups, deliberately not merged:
 *
 * - **已引用** — the skill's instructions reached the conversation, either
 *   because the model called the `skill` tool or because the user invoked it
 *   directly (the host then injects `<skill_content>` and tells the model not
 *   to call the tool — reading only the tool would miss over half of those
 *   sessions, measured on 250 real ones).
 * - **本会话可用** — the session's current catalog. Available is NOT used: the
 *   model may never touch any of these, so it is collapsed behind a counted
 *   toggle and never mixed into the reference rows.
 *
 * Like the deliverables section this is an OPTIONAL capability on both sides:
 * no projection registry (or a host half that never registered the unit) means
 * the client reads capability absence and the section hides. No settings switch
 * gates it either — the list is a read-only fact about the session, not a
 * preference.
 *
 * Two contracts this row honours, both learned on the recall section:
 * - **no native `title` attribute** — it paints an unskinable tooltip that
 *   overlaps the plugin's own bubble; nothing here needs one;
 * - **colours from `--dsw-alias-*` tokens only** (skin contract).
 */
import { createElement } from 'react'
import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import { SKILL_USAGE_KEY } from '../../projection/keys'
import { useProjectionValue } from '../use-projection'
import { availableExcept, expandPair, readSkillUsage } from './skill-usage'
import { GroupCaption, GroupHeader, FoldToggle } from './FoldToggle'
import { expandCount } from '../locales'

export interface SkillUsageSectionProps {
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
  alignItems: 'baseline',
  gap: 8,
  padding: '6px 12px',
}

/** The skill name: primary-ish but never the loudest thing in the row. */
const NAME_STYLE: CSSProperties = {
  minWidth: 0,
  overflowWrap: 'anywhere',
  color: 'var(--dsw-alias-label-secondary)',
}

/** The per-skill load tally, tertiary so the name stays the reading target. */
const COUNT_STYLE: CSSProperties = {
  flexShrink: 0,
  color: 'var(--dsw-alias-label-tertiary)',
  fontSize: 11,
}

/** The "本轮" pill: same form as the deliverables codeplan tag. */
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
 * The skill-usage section. The subscription is unconditional (a plain listener,
 * not IO); the view decides whether anything is drawn.
 *
 * @param props - translation, client context, session scope.
 */
export function SkillUsageSection(props: SkillUsageSectionProps): ReactNode {
  const { t, ctx, scope } = props
  const [availableOpen, setAvailableOpen] = useState(false)

  const view = readSkillUsage(useProjectionValue(ctx, scope?.sessionId, SKILL_USAGE_KEY))

  // Capability absent — the optional unit never registered. Hide, don't nag.
  if (view === undefined) return null

  const referenced = view.session.map(entry => entry.name)
  // 可用组只列未被引用的那些：同一个技能不该占两行。
  const rest = availableExcept(view.available, referenced)
  const latestNames = view.latest?.names ?? []

  return createElement(
    'div',
    { style: SECTION_STYLE, 'data-dsh-brief-sidebar': 'skill-usage-section' },
    createElement('div', { style: HEADER_STYLE }, t('section.skillUsage')),
    view.session.length === 0 && createElement(
      'div',
      { style: EMPTY_STYLE },
      createElement('div', { style: { marginBottom: 6, color: 'var(--dsw-alias-label-secondary)' } }, t('skillUsage.empty')),
      createElement('div', null, t('skillUsage.emptyHint')),
    ),
    view.session.length > 0 && createElement(GroupHeader, {
      text: expandCount(t('skillUsage.invokedGroup'), view.session.length),
      marker: 'skill-usage-invoked-group',
    }),
    createElement(
      'ul',
      { style: LIST_STYLE },
      view.session.map(entry => createElement(
        'li',
        { key: entry.name, style: ROW_STYLE, 'data-dsh-brief-sidebar': 'skill-usage-row' },
        createElement('span', { style: NAME_STYLE }, entry.name),
        createElement('span', { style: COUNT_STYLE }, expandPair(t('skillUsage.uses'), entry.count, entry.count)),
        latestNames.includes(entry.name) && createElement('span', { style: TAG_STYLE }, t('skillUsage.latestTag')),
      )),
    ),
    rest.length > 0 && createElement(FoldToggle, {
      label: expandCount(t('skillUsage.availableGroup'), rest.length),
      open: availableOpen,
      marker: 'skill-usage-available-toggle',
      onToggle: () => { setAvailableOpen(current => !current) },
    }),
    // 清单有上限：开关行说收了多少个名字，附注说这一帧真发了多少。
    rest.length > 0 && view.availableCount > view.available.length && createElement(GroupCaption, {
      text: expandCount(t('skillUsage.availableCapped'), view.availableCount),
      marker: 'skill-usage-available-capped',
    }),
    availableOpen && createElement(
      'ul',
      { style: LIST_STYLE },
      rest.map(name => createElement(
        'li',
        { key: name, style: ROW_STYLE, 'data-dsh-brief-sidebar': 'skill-usage-available-row' },
        createElement('span', { style: NAME_STYLE }, name),
      )),
    ),
    // 列表有上限，页脚说真数：加载次数与去重后的技能数各归各。
    view.session.length > 0 && createElement('div', { style: FOOTER_STYLE }, expandPair(t('skillUsage.count'), view.callTotal, view.sessionTotal)),
  )
}
