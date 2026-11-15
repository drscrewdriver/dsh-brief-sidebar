/**
 * 回响原文查看器：按编号取一条回响当时注入的卡全文。
 *
 * 为什么单开一个 tab（与记忆查看器同款）：侧栏一行只能放摘要，而「这条当时到底写了
 * 什么」是回响的原文事实，不能拿摘要冒充。数据来自 spirit 的 `echo-detail` RPC
 * （本仓不跨包 import，只走同源 loopback 路由）。
 *
 * 失败面同样是数据：条目不在了 / spirit 没装 / 网络抖动，都显示成人话，不吞成空白。
 */
import { createElement, useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

interface DetailItem {
  id: string
  at: number
  kind: 'injected' | 'skipped'
  reason: string
  fingerprint: string
  preview: string
  text: string
}

const WRAP: CSSProperties = {
  padding: '12px 14px',
  overflow: 'auto',
  height: '100%',
  fontSize: 13,
  lineHeight: 1.65,
  color: 'var(--dsw-alias-label-primary)',
}
const HEAD: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 8,
  marginBottom: 10,
  paddingBottom: 8,
  borderBottom: '1px solid var(--dsw-alias-border-secondary)',
  fontSize: 11,
  color: 'var(--dsw-alias-label-tertiary)',
}
const ID_STYLE: CSSProperties = {
  fontFamily: 'ui-monospace,monospace',
  color: 'var(--dsw-alias-label-secondary)',
}
const CARD: CSSProperties = {
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  fontFamily: 'ui-monospace,monospace',
  fontSize: 12.5,
  color: 'var(--dsw-alias-label-primary)',
}
const MUTED: CSSProperties = { color: 'var(--dsw-alias-label-tertiary)', fontSize: 12 }

/** `path` = `<sessionId>|<echoId>`；任何一半缺失都不发请求。 */
export function splitEchoPath(path: string | undefined): { sessionId: string; id: string } {
  const raw = path ?? ''
  const at = raw.indexOf('|')
  if (at <= 0) return { sessionId: '', id: '' }
  return { sessionId: raw.slice(0, at), id: raw.slice(at + 1) }
}

export interface EchoViewerProps {
  tab?: { path?: string }
  t?: (key: string) => string
  /** The tab seat hands the client context down; the viewer reads nothing from it today. */
  ctx?: unknown
}

/**
 * The echo viewer body.
 * @param props - the better-sidebar tab seat (path carries sessionId|id).
 */
export function EchoViewer(props: EchoViewerProps): ReactNode {
  const { sessionId, id } = splitEchoPath(props.tab?.path)
  const [item, setItem] = useState<DetailItem | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (sessionId === '' || id === '') return
    let cancelled = false
    setError(undefined)
    setItem(undefined)
    fetch('/dsh-spirit/rpc/echo-detail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, id }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return (await r.json()) as { ok?: boolean; value?: { item?: DetailItem } }
      })
      .then((env) => {
        if (cancelled) return
        if (env.ok === true && env.value?.item !== undefined) {
          setItem(env.value.item)
          return
        }
        setError('该回响条目已不在库里')
      })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)) })
    return () => { cancelled = true }
  }, [sessionId, id])

  if (sessionId === '' || id === '') {
    return createElement('div', { style: WRAP }, createElement('div', { style: MUTED }, '未选择回响条目'))
  }
  if (error !== undefined) {
    return createElement('div', { style: WRAP }, createElement('div', { style: MUTED }, `⚠️ ${error}`))
  }
  if (item === undefined) {
    return createElement('div', { style: WRAP }, createElement('div', { style: MUTED }, '加载中…'))
  }

  return createElement(
    'div',
    { style: WRAP, 'data-dsh-brief-sidebar': 'echo-viewer' },
    createElement(
      'div',
      { style: HEAD },
      createElement('span', { style: ID_STYLE, 'data-dsh-brief-sidebar': 'echo-viewer-id' }, item.id),
      createElement('span', null, item.kind === 'injected' ? '注入' : `跳过（${item.reason}）`),
      createElement('span', null, new Date(item.at).toLocaleString()),
      item.fingerprint !== '' ? createElement('span', null, item.fingerprint.slice(0, 24)) : null,
    ),
    item.text === ''
      ? createElement(
          'div',
          { style: MUTED, 'data-dsh-brief-sidebar': 'echo-viewer-no-text' },
          `早期落档（${new Date(item.at).toLocaleString()}）：这条当时只存了摘要、没存原文。`,
          createElement('div', { style: { marginTop: 6 } }, item.preview),
        )
      : createElement('div', { style: CARD }, item.text),
  )
}
