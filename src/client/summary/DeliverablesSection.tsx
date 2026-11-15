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
import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useProjectionValue } from '../use-projection'
import type { CtxProbe } from '../use-projection'
import { DELIVERABLES_KEY } from '../../projection/keys'
import { sidebarFileOpener } from '../file-open'
import { basename, historyPaths, readDeliverables, splitCodeplanPath } from './deliverables'
import { GroupCaption, GroupHeader, FoldToggle } from './FoldToggle'
import { expandCount, expandTotal } from '../locales'

export interface DeliverablesSectionProps {
  /** The DSH locale lookup, passed down from `apply`. */
  t: (key: string) => string
  /** The client root context (the tab body's only way to reach services). */
  ctx?: CtxProbe
  /** The session this tab is scoped to. */
  scope?: { readonly sessionId?: string }
}

const SECTION_STYLE: CSSProperties = {
  flexShrink: 0,
  borderBottom: '1px solid var(--dsw-alias-border-secondary)',
}

/**
 * How many earlier-change rows a reloaded session shows before the reader asks
 * for more. Five fills the visible slice of a narrow sidebar without turning
 * the section into a scroll well — the preview exists to prove "this session
 * produced files", not to be the full history.
 */
const HISTORY_PREVIEW = 5

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
 *
 * 分层:本回合改动(latest)与全会话更早改动分成两组各自计数——前者直列,后者
 * 折叠在开关行后面(与活跃文件按归一化路径去重),展开后是与活跃区相同的可点击
 * 文件行。列表有上限时,开关行说折叠区条数、附注说会话真数,两个数不混为一谈。
 *
 * **重载语义**:重新打开一个历史会话时,`latest` 要么是空的(还没跑新回合),
 * 要么指向上一回合——两种情况下「本回合改动」都读不出东西,而历史改动全被
 * 折叠收起,整节看起来像"没有产物"。所以本回合为空时历史区**默认展开并只
 * 预览前 {@link HISTORY_PREVIEW} 条**:读者一进来就能看见这个会话改过什么,
 * 又不至于把侧栏塞满;点「还有 N 条」看全量,点折叠行收起。
 * @param props - translation, client context, session scope.
 */
export function DeliverablesSection(props: DeliverablesSectionProps): ReactNode {
  const { t, ctx, scope } = props
  // `undefined` = the reader has not expressed a preference yet, so the
  // default below still applies. A live projection can flip the turn from
  // empty to populated mid-session, and a plain `useState(defaultOpen)` would
  // freeze whichever state the first render happened to see.
  const [historyOverride, setHistoryOverride] = useState<boolean | undefined>(undefined)

  const view = readDeliverables(useProjectionValue(ctx, scope?.sessionId, DELIVERABLES_KEY))

  // Capability absent — the optional unit never registered. Hide, don't nag.
  if (view === undefined) return null

  // Optional click-to-preview: rows degrade to plain text where the sidebar
  // opener is absent (the opener resolves the session cwd per click).
  const open = sidebarFileOpener(ctx, scope?.sessionId)

  const latestPaths = view.latest?.paths ?? []
  const history = historyPaths(view.sessionPaths, latestPaths)

  // No current-turn rows means this is a reload of a finished turn: show the
  // earlier changes instead of an apparently empty section.
  const historyOpen = historyOverride ?? latestPaths.length === 0
  // Previewing = open because the section defaulted open, not because the
  // reader asked for everything. Only a preview offers the "N more" entry.
  const previewing = historyOpen && historyOverride !== true
  const shownHistory = !historyOpen
    ? []
    : previewing ? history.slice(0, HISTORY_PREVIEW) : history
  const hiddenHistory = history.length - shownHistory.length

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
    // 当前 turn 一组：只有真改过东西才起标题，否则“本回合改动 · 0”反而口舌。
    latestPaths.length > 0 && createElement(GroupHeader, {
      text: expandCount(t('deliverables.currentTurn'), latestPaths.length),
      marker: 'deliverables-current-group',
    }),
    latestPaths.length > 0 && createElement(
      'ul',
      { style: LIST_STYLE },
      latestPaths.map(path => createElement(PathRow, { key: path, path, t, open })),
    ),
    history.length > 0 && createElement(FoldToggle, {
      label: expandCount(t('deliverables.history'), history.length),
      open: historyOpen,
      marker: 'deliverables-history-toggle',
      onToggle: () => { setHistoryOverride(!historyOpen) },
    }),
    // 列表有上限：开关行说的是折叠区收了多少条，附注说会话一共改过多少个。
    history.length > 0 && view.sessionTotal > view.sessionPaths.length && createElement(GroupCaption, {
      text: expandTotal(t('deliverables.historyCapped'), view.sessionTotal),
      marker: 'deliverables-history-capped',
    }),
    shownHistory.length > 0 && createElement(
      'ul',
      { style: LIST_STYLE },
      shownHistory.map(path => createElement(PathRow, { key: path, path, t, open })),
    ),
    // 预览模式下把"还有多少条"交回读者：一行可点的补充入口，不靠滚动。
    // 只在预览态出现——收起态已经有折叠开关，全展开态没有剩余可给。
    previewing && hiddenHistory > 0 && createElement(FoldToggle, {
      label: expandCount(t('deliverables.historyMore'), hiddenHistory),
      open: false,
      marker: 'deliverables-history-more',
      onToggle: () => { setHistoryOverride(true) },
    }),
  )
}
