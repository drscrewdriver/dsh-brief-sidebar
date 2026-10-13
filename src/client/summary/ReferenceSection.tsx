/**
 * The references section: 技能与记忆并列成两个可左右切换的页签。
 *
 * Why a tab strip instead of three stacked sections: the two lists answer the
 * same question — "what entered this session's context" — from two different
 * providers (this plugin's own skill fold, and prime-memory's recall/slots).
 * Stacked, they pushed the board and the produced files off screen on a narrow
 * sidebar; side by side, each gets the full width when the reader actually
 * wants it.
 *
 * Two decisions worth knowing when editing this file:
 *
 * 1. **The inactive pane stays mounted and is hidden with `display:none`.**
 *    The recall pane carries real interaction state (selected row, pending
 *    rating, the expanded history group); unmounting it would silently reset
 *    what the human just did every time they glanced at the skills tab. The
 *    cost is that a hidden pane keeps re-rendering on projection frames —
 *    bounded, because the whole tab still renders nothing while `visible` is
 *    false (see `SummaryTab`).
 * 2. **The parent repeats its children's gates.** A section that hides itself
 *    leaves the tab strip pointing at an empty pane, so the availability
 *    question is answered here with the SAME readers and resolvers the children
 *    use. `tests/reference-section.spec.tsx` pins both sides against the same
 *    fixtures — if a child gate ever drifts from this one, that test goes red
 *    rather than the UI growing a dead tab.
 *
 * Colours come from `--dsw-alias-*` tokens only (skin contract).
 */
import { createElement } from 'react'
import { useCallback, useState } from 'react'
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import { SKILL_USAGE_KEY } from '../../projection/keys'
import { useProjectionValue } from '../use-projection'
import { readSkillUsage } from './skill-usage'
import { MEMORY_RECALL_KEY, readRecall } from './memory-recall'
import { MEMORY_SLOTS_KEY, readSlots } from './memory-slots'
import { resolveShowMemoryRecall, resolveShowMemorySlots } from '../scope-face'
import { useConfigFlag } from './use-config-flag'
import { SkillUsageSection } from './SkillUsageSection'
import { MemoryRecallSection } from './MemoryRecallSection'
import { MemorySlotsSection } from './MemorySlotsSection'
import type { FeedbackFetch } from './recall-feedback'

export interface ReferenceSectionProps {
  /** The DSH locale lookup, passed down from `apply`. */
  t: (key: string) => string
  /** The client root context (the tab body's only way to reach services). */
  ctx?: Context
  /** The session this tab is scoped to. */
  scope?: { readonly sessionId?: string }
  /** The rating transport, handed straight to the recall pane. */
  fetchImpl?: FeedbackFetch
}

/** Which pane is showing. Two values, no third tab by design. */
export type ReferenceTab = 'skills' | 'memory'

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

/** The tab strip: flush-left, same gutter as section headers. */
const TABS_STYLE: CSSProperties = {
  display: 'flex',
  gap: 4,
  padding: '6px 12px 0',
}

/** One tab. Selected gets a hairline of secondary label; never a colour literal. */
const TAB_STYLE: CSSProperties = {
  background: 'none',
  border: 'none',
  borderBottom: '1px solid transparent',
  font: 'inherit',
  fontSize: 12,
  color: 'var(--dsw-alias-label-tertiary)',
  cursor: 'pointer',
  padding: '4px 8px 6px',
}

const TAB_ACTIVE_STYLE: CSSProperties = {
  ...TAB_STYLE,
  borderBottom: '1px solid var(--dsw-alias-label-secondary)',
  color: 'var(--dsw-alias-label-primary)',
  fontWeight: 600,
}

const ORDER: readonly ReferenceTab[] = ['skills', 'memory']

/**
 * The references section. All hooks run before any early return, so the tab
 * strip can disappear (no capability at all) without ever changing hook order.
 *
 * @param props - translation, client context, session scope, rating transport.
 */
export function ReferenceSection(props: ReferenceSectionProps): ReactNode {
  const { t, ctx, scope, fetchImpl } = props
  const [tab, setTab] = useState<ReferenceTab>('skills')

  // The same three reads the children make, used only to decide whether the
  // strip has anything to point at.
  const skillsLive = readSkillUsage(useProjectionValue(ctx, scope?.sessionId, SKILL_USAGE_KEY)) !== undefined
  const recallFrame = readRecall(useProjectionValue(ctx, scope?.sessionId, MEMORY_RECALL_KEY))
  const slotsFrame = readSlots(useProjectionValue(ctx, scope?.sessionId, MEMORY_SLOTS_KEY))
  const recallOn = useConfigFlag(ctx, resolveShowMemoryRecall) !== false
  const slotsOn = useConfigFlag(ctx, resolveShowMemorySlots) === true
  const memoryLive = (recallFrame !== undefined && recallOn) || (slotsFrame !== undefined && slotsOn)

  const onTabsKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>): void => {
    // 左右方向键换页：页签条只有两个成员，环绕即可，不需要 Home/End。
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const at = ORDER.indexOf(tab)
    const step = event.key === 'ArrowRight' ? 1 : ORDER.length - 1
    setTab(ORDER[(at + step) % ORDER.length])
  }, [tab])

  // Nothing to reference — no provider in the composition, or both switched off.
  if (!skillsLive && !memoryLive) return null

  const tabButton = (id: ReferenceTab, label: string): ReactNode => createElement(
    'button',
    {
      key: id,
      type: 'button',
      role: 'tab',
      id: `dsh-brief-reference-tab-${id}`,
      'aria-selected': active === id,
      'aria-controls': `dsh-brief-reference-pane-${id}`,
      style: active === id ? TAB_ACTIVE_STYLE : TAB_STYLE,
      'data-dsh-brief-sidebar': `reference-tab-${id}`,
      onClick: () => { setTab(id) },
    },
    label,
  )

  // 只剩记忆一侧时默认页得跟着换：否则开场就是一个隐藏的空技能页。
  const active: ReferenceTab = tab === 'skills' && !skillsLive ? 'memory' : tab

  return createElement(
    'div',
    { style: SECTION_STYLE, 'data-dsh-brief-sidebar': 'references-section' },
    createElement('div', { style: HEADER_STYLE }, t('section.references')),
    createElement(
      'div',
      {
        role: 'tablist',
        'aria-label': t('section.references'),
        style: TABS_STYLE,
        onKeyDown: onTabsKeyDown,
        'data-dsh-brief-sidebar': 'reference-tabs',
      },
      skillsLive && tabButton('skills', t('references.tabSkills')),
      // 两个页签各自条件化：只有一侧能力时不该留个点了就空的页签。
      memoryLive && tabButton('memory', t('references.tabMemory')),
    ),
    skillsLive && createElement(
      'div',
      {
        role: 'tabpanel',
        id: 'dsh-brief-reference-pane-skills',
        'aria-labelledby': 'dsh-brief-reference-tab-skills',
        hidden: active !== 'skills',
        style: active === 'skills' ? undefined : { display: 'none' },
        'data-dsh-brief-sidebar': 'reference-pane-skills',
      },
      createElement(SkillUsageSection, { t, ctx, scope, hideHeader: true }),
    ),
    memoryLive && createElement(
      'div',
      {
        role: 'tabpanel',
        id: 'dsh-brief-reference-pane-memory',
        'aria-labelledby': 'dsh-brief-reference-tab-memory',
        hidden: active !== 'memory',
        style: active === 'memory' ? undefined : { display: 'none' },
        'data-dsh-brief-sidebar': 'reference-pane-memory',
      },
      // 两条记忆链各有自己的标题：召回与常驻槽位是不同事实，合成一节会糊掉。
      createElement(MemoryRecallSection, { t, ctx, scope, fetchImpl }),
      createElement(MemorySlotsSection, { t, ctx, scope }),
    ),
  )
}
