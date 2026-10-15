/**
 * Memory viewer component: fetches full metadata by memoryId via records-meta API,
 * renders a structured header bar + markdown body.
 */
import { createElement, useEffect, useState, Fragment } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { Context } from '@deepseek-ai/cordis'

/* ── Types (mirror prime-memory contract, no cross-repo import) ── */
interface RecordMeta {
  id: string
  name: string | null
  type: string
  priority: number
  content: string
  maturity?: 'low' | 'mid' | 'high'
  createdAt: string | null
  updatedAt: string | null
  scene: string
  scope: 'global' | 'workspace'
  workspaceId: string | null
  keywords?: string[]
  usageScenario?: string[]
  filePath: string
  retired: boolean
}

interface Props {
  ctx: Context
  memoryId: string
  scope: { sessionId?: string }
}

/** 宿主 RPC 信封：失败分支的 `error` 是 `{code,message,details}` **对象**，不是字符串。 */
interface RecordsMetaEnvelope {
  ok?: boolean
  value?: { items?: RecordMeta[] }
  error?: { code?: string; message?: string } | string
}

/**
 * 把失败信封说成人话。
 *
 * 直接把 `error` 当字符串拼进模板会得到 `⚠️ [object Object]`——用户看不到原因，
 * 排查只能靠猜。取 `error.message`，拿不到才给兜底文案。
 */
function describeEnvelopeError(env: RecordsMetaEnvelope): string {
  const e = env.error
  if (typeof e === 'string' && e.length > 0) return e
  if (e !== null && typeof e === 'object' && typeof e.message === 'string' && e.message.length > 0) return e.message
  return '未找到该记忆'
}

/* ── Styles (all --dsw-alias-* tokens) ── */
const WRAP: CSSProperties = { padding: '12px 16px', overflow: 'auto', height: '100%', fontSize: 13, lineHeight: 1.6, color: 'var(--dsw-alias-label-primary)' }
const HEADER: CSSProperties = { marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--dsw-alias-border-secondary)' }
const BADGE: CSSProperties = { display: 'inline-block', fontSize: 11, padding: '1px 6px', borderRadius: 999, border: '1px solid var(--dsw-alias-label-tertiary)', color: 'var(--dsw-alias-label-tertiary)', marginRight: 6, marginBottom: 4 }
const NAME_STYLE: CSSProperties = { fontSize: 15, fontWeight: 700, marginBottom: 4, color: 'var(--dsw-alias-label-primary)' }
const META_LINE: CSSProperties = { fontSize: 11, color: 'var(--dsw-alias-label-tertiary)', marginBottom: 2 }
const LABEL: CSSProperties = { fontSize: 11, color: 'var(--dsw-alias-label-tertiary)', marginBottom: 4, fontWeight: 600, display: 'block' }
const CHIP: CSSProperties = { display: 'inline-block', fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid var(--dsw-alias-label-tertiary)', color: 'var(--dsw-alias-label-primary)', marginRight: 8, marginBottom: 6 }
const CHIP_ROW: CSSProperties = { marginBottom: 8 }
const PLACEHOLDER: CSSProperties = { padding: 24, textAlign: 'center', color: 'var(--dsw-alias-label-tertiary)' }

/* ── Markdown renderer (same pattern as RecallBubble) ── */
const H_STYLES: CSSProperties[] = [
  { fontSize: 15, fontWeight: 700, margin: '8px 0 4px' },
  { fontSize: 14, fontWeight: 600, margin: '6px 0 3px' },
  { fontSize: 13, fontWeight: 600, margin: '5px 0 2px' },
  { fontSize: 12, fontWeight: 600, margin: '4px 0 2px' },
  { fontSize: 12, fontWeight: 600, margin: '3px 0 1px' },
  { fontSize: 11, fontWeight: 600, margin: '3px 0 1px' },
]
const P_STYLE: CSSProperties = { margin: '2px 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }
const LI_STYLE: CSSProperties = { margin: '1px 0 1px 12px', whiteSpace: 'pre-wrap' }
const CODE_STYLE: CSSProperties = { fontFamily: 'ui-monospace,monospace', fontSize: '0.9em', background: 'var(--dsw-alias-fill-tertiary)', padding: '0 3px', borderRadius: 3 }

function inline(text: string, key: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const re = /\*\*(.+?)\*\*|`(.+?)`/
  let rest = text; let i = 0
  while (rest.length > 0) {
    const m = re.exec(rest)
    if (m === null) { nodes.push(rest); break }
    if (m.index > 0) nodes.push(rest.slice(0, m.index))
    if (m[1] !== undefined) nodes.push(createElement('strong', { key: `${key}-b${i++}` }, m[1]))
    else nodes.push(createElement('code', { key: `${key}-c${i++}`, style: CODE_STYLE }, m[2]))
    rest = rest.slice(m.index + m[0].length)
  }
  return nodes
}

function renderMd(md: string): ReactNode {
  const lines = md.split('\n')
  const out: ReactNode[] = []
  let idx = 0
  for (const line of lines) {
    const t = line.trim()
    if (!t) continue
    const h = /^(#{1,6})\s+(.+)/.exec(t)
    if (h) { out.push(createElement(`h${h[1].length}`, { key: `h${idx}`, style: H_STYLES[h[1].length - 1] }, ...inline(h[2], `h${idx}`))); idx++; continue }
    const ul = /^[-*]\s+(.+)/.exec(t)
    if (ul) { out.push(createElement('div', { key: `li${idx}`, style: LI_STYLE }, '• ', ...inline(ul[1], `li${idx}`))); idx++; continue }
    const ol = /^\d+\.\s+(.+)/.exec(t)
    if (ol) { out.push(createElement('div', { key: `li${idx}`, style: LI_STYLE }, t.slice(0, t.indexOf('.') + 2), ...inline(ol[1], `li${idx}`))); idx++; continue }
    out.push(createElement('div', { key: `p${idx}`, style: P_STYLE }, ...inline(t, `p${idx}`))); idx++
  }
  return createElement(Fragment, null, ...out)
}

/* ── Main component ── */
export function MemoryViewer(props: Props): ReactNode {
  const { ctx, memoryId } = props
  const [record, setRecord] = useState<RecordMeta | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)

  useEffect(() => {
    // 空 id 不发请求：`{ids:['']}` 会被服务端拒为“ids 过滤后为空”，
    // 把“重启后 tab 先于选择恢复”这个正常空态误报成错误。
    if (memoryId.length === 0) return
    let cancelled = false
    setError(undefined)
    fetch('/dsh-memory/rpc/records-meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [memoryId] }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return (await r.json()) as RecordsMetaEnvelope
      })
      .then((env: RecordsMetaEnvelope) => {
        if (cancelled) return
        const first = env.ok === true ? env.value?.items?.[0] : undefined
        if (first !== undefined) { setRecord(first); return }
        setError(describeEnvelopeError(env))
      })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)) })
    return () => { cancelled = true }
  }, [memoryId])

  if (memoryId.length === 0) {
    return createElement('div', { style: WRAP },
      createElement('div', { style: PLACEHOLDER }, '未在本轮启动周期选择查看的记忆'))
  }
  if (error !== undefined) {
    return createElement('div', { style: WRAP },
      createElement('div', { style: PLACEHOLDER }, `⚠️ ${error}`))
  }
  if (record === undefined) {
    return createElement('div', { style: WRAP },
      createElement('div', { style: PLACEHOLDER }, '加载中…'))
  }

  return createElement('div', { style: WRAP },
    // Header bar
    createElement('div', { style: HEADER },
      createElement('div', { style: NAME_STYLE }, record.name ?? record.id),
      createElement('div', null,
        createElement('span', { style: BADGE }, record.type),
        createElement('span', { style: BADGE }, record.scope === 'workspace' ? '工作区' : '全局'),
        record.maturity && createElement('span', { style: BADGE }, `成熟:${record.maturity}`),
        createElement('span', { style: BADGE }, `P${record.priority}`),
        record.retired && createElement('span', { style: { ...BADGE, borderColor: 'var(--dsw-alias-border-color-danger)', color: 'var(--dsw-alias-border-color-danger)' } }, '已退场'),
      ),
      createElement('div', { style: META_LINE }, `创建: ${record.createdAt ? new Date(record.createdAt).toLocaleString() : '-'}`),
      record.scene && createElement('div', { style: META_LINE }, `情境: ${record.scene}`),
      createElement('div', { style: META_LINE }, `范围: ${record.scope === 'workspace' && record.workspaceId ? record.workspaceId : '用户默认 (global)'}`),
      record.keywords && record.keywords.length > 0 && createElement('div', { style: CHIP_ROW },
        createElement('span', { style: LABEL }, '关键词'),
        ...record.keywords.map((k, i) => createElement('span', { key: i, style: CHIP }, k))),
      record.usageScenario && record.usageScenario.length > 0 && createElement('div', { style: CHIP_ROW },
        createElement('span', { style: LABEL }, '使用场景'),
        ...record.usageScenario.map((s, i) => createElement('span', { key: i, style: CHIP }, s))),
    ),
    // Body
    renderMd(record.content),
  )
}
