/**
 * The spirit-echo tab: which echo passages dsh-spirit recalled **in this session**,
 * drawn from the `spiritEcho` projection (v0.8.3: spirit's durable `echo_recall`).
 *
 * Contract mirrors the memory sections:
 * - capability absent (`spiritEcho` unit missing) → render nothing;
 * - `segments: []` → honest empty state (a fresh session has recalled nothing yet);
 * - data → this session's passage count + the latest passage + two pointers:
 *   「星图」 (the star map) and 「条目」 (翻阅 → 回响). Both ride the same deep link.
 *
 * The `lastStep` line answers "why no card this round" and is deliberately kept
 * apart from the passage list: one is an observation, the other is memory.
 *
 * Colours come from `--dsw-alias-*` tokens only (skin contract).
 */
import { createElement, useCallback, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { CtxProbe } from '../use-projection'
import { useProjectionValue } from '../use-projection'
import { SPIRIT_ECHO_KEY, readSpiritEcho } from '../spirit-echo'
import type { SpiritEchoRefRow, SpiritEchoStep } from '../spirit-echo'
import { openSpiritEcho } from '../spirit-open'
import type { SpiritOpenTarget } from '../spirit-open'
import { openEchoTab } from '../memory-tab'
import { EchoViewMenu } from './EchoViewMenu'
import { expandCount } from '../locales'

export interface SpiritEchoSectionProps {
  /** The DSH locale lookup, passed down from `apply`. */
  t: (key: string) => string
  /** The client root context (the tab body's only way to reach services). */
  ctx?: CtxProbe
  /** The session this tab is scoped to. */
  scope?: { readonly sessionId?: string }
  /** True when the section is rendered inside a tab that already names it (引用 → 回响). */
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

const BODY_STYLE: CSSProperties = {
  padding: '6px 12px 10px',
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  fontSize: 12,
  lineHeight: '18px',
}

const LINE_STYLE: CSSProperties = {
  color: 'var(--dsw-alias-label-secondary)',
  overflowWrap: 'anywhere',
}

const MUTED_STYLE: CSSProperties = {
  color: 'var(--dsw-alias-label-tertiary)',
}

const VIEW_BTN_STYLE: CSSProperties = {
  alignSelf: 'flex-start',
  marginTop: 2,
  padding: 0,
  border: 'none',
  background: 'none',
  font: 'inherit',
  fontSize: 12,
  color: 'var(--dsw-alias-label-secondary)',
  cursor: 'pointer',
  textDecoration: 'underline',
}

const FAIL_STYLE: CSSProperties = {
  ...MUTED_STYLE,
  fontSize: 11,
}

/** 一行里的两个跳转链接（星图 / 条目）。 */
const LINK_ROW_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  marginTop: 2,
}

/** 一行：摘要文本按钮（开原文）+ 查看选单（原文 / 条目 / 星图）。 */
const ROW_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  minWidth: 0,
}

const ROW_TEXT_STYLE: CSSProperties = {
  ...LINE_STYLE,
  flex: '1 1 auto',
  minWidth: 0,
  padding: 0,
  border: 'none',
  background: 'none',
  font: 'inherit',
  textAlign: 'left' as const,
  cursor: 'pointer',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap' as const,
}

/** 最近一段的显示长度：侧栏一行，不让一句回忆把整列顶开。 */
const LATEST_MAX = 60

/**
 * 卡片分段行的词表（与 spirit 的 `ECHO_SEGMENTS` 同口径）。
 * 旧版落档没有清洗过的摘要（<system-reminder> 开头、后面跟免责声明），
 * 侧栏得自己把它剥掉——旧数据不会因为新版本重写。
 */
const CARD_MARKERS = ['状态：', '反馈：', '线程：', '事务：', '刚刚：', '想起：', '开场：'] as const

/** 把一张卡的摘要剥成一句：从第一个分段行开切，否则只去标签。 */
function cleanPreview(text: string): string {
  let cut = -1
  for (const marker of CARD_MARKERS) {
    const at = text.indexOf(marker)
    if (at >= 0 && (cut < 0 || at < cut)) cut = at
  }
  const body = cut > 0 ? text.slice(cut) : text
  return body
    .replaceAll(/<[^>]*>/g, ' ')
    .replaceAll(/（角色体验快照[^）]*）/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim()
}

/** 展示短号：`echo-` + UUID 去连字符前 12 位（与 spirit 侧同口径）。 */
function shortEcho(echoId: string): string {
  const body = echoId.startsWith('echo-') ? echoId.slice('echo-'.length) : echoId
  return `echo-${body.replaceAll('-', '').slice(0, 12)}`
}

/** 记录时间：`M/D HH:mm`。 */
function recordTime(ms: number): string {
  const date = new Date(ms)
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 行文字：标题（无则 memId）；编号/时间/次数另起副行（v7：记录持 echo 号）。 */
function rowLabel(row: SpiritEchoRefRow): string {
  const title = (row.title ?? '').trim()
  return shorten(title !== '' ? title : row.memId)
}

/** 副行：`echo-xxxx · 11/9 02:46 ×3`。 */
function rowMeta(row: SpiritEchoRefRow): string {
  const times = row.times > 1 ? ` ×${row.times}` : ''
  return `${shortEcho(row.echoId)} · ${recordTime(row.recordTs)}${times}`
}

function shorten(text: string): string {
  const flat = cleanPreview(text)
  return flat.length <= LATEST_MAX ? flat : `${flat.slice(0, LATEST_MAX)}…`
}

/**
 * 跳过的日志压成一句：`门名 ×次数`。逐条列门名对用户没有信息量，
 * 但「这轮为什么没卡」需要能一眼看出来，所以保留汇总而不是全删。
 */
function summarizeSkips(rows: readonly SpiritEchoStep[]): string {
  if (rows.length === 0) return ''
  const counts = new Map<string, number>()
  for (const row of rows) {
    const key = row.reason === '' ? '?' : row.reason
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([reason, times]) => (times > 1 ? `${reason} ×${times}` : reason))
    .join('、')
}

/**
 * The echo section. The hook runs unconditionally so the absent case never
 * changes hook order.
 * @param props - translation, client context, session scope.
 */
export function SpiritEchoSection(props: SpiritEchoSectionProps): ReactNode {
  const { t, ctx, scope, hideHeader = false } = props
  const view = readSpiritEcho(useProjectionValue(ctx, scope?.sessionId, SPIRIT_ECHO_KEY))
  // 失败回执整条留着（不只 reason）：owner 给的 detail 要能落到 title 上，
  // 否则「打开回响失败（unregistered）」永远只有三个字，排查只能靠猜。
  const [fail, setFail] = useState<{ reason: string; detail?: string } | undefined>(undefined)

  const onOpen = useCallback((target: SpiritOpenTarget): void => {
    const result = openSpiritEcho(target)
    setFail(result.ok ? undefined : { reason: result.reason ?? 'absent', detail: result.detail })
  }, [])

  // Capability absent (spirit not in the composition, or no frame yet) — hide.
  if (view === undefined) return null

  const latest = view.segments[0]
  // 列表只列「真的注入了什么」：跳过行没有内容，逐条列出来等于把门名当日志刷屏；
  // 旧版（v10 以前）的注入行没有摘要（preview 为 ''），也不再占一行。
  const listed = view.steps.filter((row) => row.kind === 'injected' && row.preview !== '')
  // 帧里 `steps` 只有最近 5 条：连走几轮「跳过」会把真正的那条注入行挤到 `lastStep`，
  // 按 `steps` 判定就会得出「本会话还没有回响段」的假空态。这里把 lastStep 兑回去。
  const last = view.lastStep
  const injected = last !== undefined && last.kind === 'injected' && last.preview !== ''
    && !listed.some((row) => row.id === last.id)
    ? [last, ...listed]
    : listed
  const skips = view.steps.filter((row) => row.kind === 'skipped')
  const skipSummary = summarizeSkips(skips)
  // 记录聚合（v7 主数据）：每行 = 一条被想起的记录（echo-<uuid> + 记录时间）
  const refs = view.records ?? view.refs ?? []
  const hasAny = injected.length > 0 || latest !== undefined || refs.length > 0

  return createElement(
    'div',
    {
      style: SECTION_STYLE,
      'data-dsh-brief-sidebar': 'spirit-echo-section',
      title: expandCount(t('echo.totalHint'), view.total),
    },
    hideHeader ? null : createElement('div', { style: HEADER_STYLE }, t('section.spiritEcho')),
    createElement(
      'div',
      { style: BODY_STYLE },
      hasAny
        ? createElement(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: 2 } },
          createElement('div', { style: LINE_STYLE }, expandCount(t('echo.stepCount'), refs.length > 0 ? refs.length : injected.length)),
          // 引用行优先（v6）：标题=内容（如线程任务名），时间=最近召回，×N=召回次数；
          // 无 refs 的老帧退回 steps（不伪装新形状存在）。
          ...(refs.length > 0
            ? refs.slice(0, 3).map((row, index) => createElement(
              'div',
              {
                key: `${row.sessionId}-${row.echoId}`,
                style: ROW_STYLE,
                'data-dsh-brief-sidebar': 'spirit-echo-ref',
              },
              createElement(
                'button',
                {
                  type: 'button' as const,
                  style: { ...ROW_TEXT_STYLE, ...(index === 0 ? {} : MUTED_STYLE) },
                  'data-dsh-brief-sidebar': 'spirit-echo-ref-title',
                  title: `${row.echoId} · ${new Date(row.recordTs).toLocaleString()} · ${t('echo.openOriginal')}`,
                  onClick: () => { openEchoTab(row.sessionId !== '' ? row.sessionId : (scope?.sessionId ?? ''), row.lastRecallId) },
                },
                rowLabel(row),
              ),
              // 副行：echo 短号 + 记录时间 + ×N（用户要求“能看到记录时间和 echo id”）
              createElement('div', { style: { ...MUTED_STYLE, fontSize: 11 }, 'data-dsh-brief-sidebar': 'spirit-echo-ref-meta', title: row.echoId }, rowMeta(row)),
              createElement(EchoViewMenu, {
                t,
                sessionId: row.sessionId !== '' ? row.sessionId : (scope?.sessionId ?? ''),
                echoId: row.lastRecallId,
              }),
            )) 
            : injected.slice(0, 3).map((row, index) => createElement(
            'div',
            {
              key: `${row.id}-${index}`,
              style: ROW_STYLE,
              'data-dsh-brief-sidebar': 'spirit-echo-row',
            },
            createElement(
              'button',
              {
                type: 'button' as const,
                style: {
                  ...ROW_TEXT_STYLE,
                  ...(index === 0 ? {} : MUTED_STYLE),
                },
                'data-dsh-brief-sidebar': 'spirit-echo-row-injected',
                title: `${row.id} · ${new Date(row.at).toLocaleString()} · ${t('echo.openOriginal')}`,
                onClick: () => { openEchoTab(scope?.sessionId ?? '', row.id) },
              },
              (row.title ?? '').trim() !== '' ? shorten(row.title ?? '') : shorten(row.preview),
            ),
            // 行级选单：与 memory 行同款（原文 / 条目 / 星图），不必滑到底部链接。
            createElement(EchoViewMenu, {
              t,
              sessionId: scope?.sessionId ?? '',
              echoId: row.id,
            }),
          ))),
        )
        : createElement(
          'div',
          { style: MUTED_STYLE },
          createElement('div', null, t('echo.empty')),
          createElement('div', { style: { fontSize: 11 } }, t('echo.emptyHint')),
        ),
      // 跳过不逐条列，只给一句汇总（门名 × 次数）——它回答「为什么没卡」，不是回忆。
      skipSummary !== '' && createElement(
        'div',
        {
          style: { ...MUTED_STYLE, fontSize: 11 },
          'data-dsh-brief-sidebar': 'spirit-echo-skips',
        },
        expandCount(t('echo.skippedSummary'), skips.length).replace('{reasons}', skipSummary),
      ),
      // 想起的段落单独一行：有引用时以引用行为准（title + 次数），否则退回段落口径。
      (refs.length > 0 || latest !== undefined) && createElement(
        'div',
        { style: { ...LINE_STYLE, ...MUTED_STYLE }, 'data-dsh-brief-sidebar': 'spirit-echo-latest' },
        refs.length > 0
          ? `${t('echo.latest')}${refs[0]!.title !== '' ? refs[0]!.title : refs[0]!.memId} · ${shortEcho(refs[0]!.echoId)}`
          : `${t('echo.latest')}${latest === undefined ? '' : shorten(latest.excerpt)}`,
      ),
      createElement(
        'div',
        { style: LINK_ROW_STYLE },
        createElement('button', {
          type: 'button' as const,
          style: VIEW_BTN_STYLE,
          'data-dsh-brief-sidebar': 'spirit-echo-goto-graph',
          onClick: () => { onOpen('graph') },
        }, t('echo.gotoGraph')),
        createElement('button', {
          type: 'button' as const,
          style: VIEW_BTN_STYLE,
          'data-dsh-brief-sidebar': 'spirit-echo-goto',
          onClick: () => { onOpen('echo') },
        }, t('echo.goto')),
      ),
      fail !== undefined && createElement(
        'div',
        {
          style: FAIL_STYLE,
          'data-dsh-brief-sidebar': 'spirit-echo-fail',
          ...(fail.detail === undefined ? {} : { title: fail.detail }),
        },
        `${t('echo.gotoFail')}（${fail.reason}）`,
      ),
    ),
  )
}
