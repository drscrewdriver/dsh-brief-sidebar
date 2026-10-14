/**
 * 搜索引用页签：读侧、渲染、以及"来源是不可信外部数据"的链接消毒。
 *
 * 单独钉住 `safeHref` 是因为这条链路的 URL 来自第三方 provider 经模型回传，
 * 落在用户自己的侧栏里：一个 `javascript:` 前缀的"URL"若被渲染成锚点，就是
 * 一次点击即可执行脚本的位置。宁可退化成不可点文本。
 */
import { describe, expect, it } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Context } from '@deepseek-ai/cordis'
import { SEARCH_REFS_KEY, clusterByQuery, isLatestSource, readSearchRefs, safeHref } from '../src/client/summary/search-refs'
import { SearchRefSection } from '../src/client/summary/SearchRefSection'
import { ReferenceSection } from '../src/client/summary/ReferenceSection'
import { SKILL_USAGE_KEY } from '../src/projection/keys'
import { zh } from '../src/client/locales'

const SESSION = 'sess-search'
const t = (key: string): string => (zh as Record<string, string>)[key] ?? key

function label(key: string, count: number | string): string {
  return (zh as Record<string, string>)[key].replace('{count}', String(count))
}

const UNREACHABLE_CONFIG = { status: 'unavailable', value: undefined, revision: 1, writable: true }

function ctxWith(values: Record<string, unknown>): Context {
  const sessions = {
    binding: (id: string) =>
      id === SESSION
        ? {
          session: {
            projections: {
              faceOf: (key: string) => ({
                getSnapshot: () => values[key],
                subscribe: () => () => {},
              }),
            },
          },
        }
        : undefined,
  }
  const configForms = {
    get: () => ({
      getSnapshot: () => UNREACHABLE_CONFIG,
      subscribe: () => () => {},
      set: async () => true,
      unset: async () => true,
    }),
  }
  return {
    get: (name: string) => (name === 'sessions' ? sessions : name === 'configForms' ? configForms : undefined),
  } as unknown as Context
}

const VIEW = {
  // latest 存的是折叠产出的归一化键（去尾斜杠 + host 小写），不是原样 URL。
  latest: { turn: 4, urls: ['https://b.org/paper'] },
  queries: [
    { query: '量子纠错 最新进展', tool: 'web_search', turn: 4, hits: 2 },
    { query: '3dgs survey', tool: 'advanced_search', turn: 3, hits: 0 },
  ],
  sources: [
    { url: 'https://b.org/paper', host: 'b.org', title: 'B 论文', snippet: '摘要乙', queries: ['量子纠错 最新进展'], count: 1, lastTurn: 4 },
    { url: 'https://a.org/x', host: 'a.org', title: 'A 页面', queries: ['3dgs survey'], count: 2, lastTurn: 3 },
  ],
  queryTotal: 2,
  sourceTotal: 2,
}

function renderSection(values: Record<string, unknown>): string {
  return renderToStaticMarkup(createElement(SearchRefSection, { t, ctx: ctxWith(values), scope: { sessionId: SESSION } }))
}

describe('tool attribution', () => {
  it('clusters bubbles under their query and keeps the tool name off screen', () => {
    const html = renderSection({ [SEARCH_REFS_KEY]: VIEW })
    // 查询串以“可折叠组标题”的形式回来（聚类键），但工具名不再上屏。
    expect(html).toContain('量子纠错 最新进展')
    expect(html).not.toContain('advanced_search')
    expect(html).toContain('data-dsh-brief-sidebar="search-refs-bubble"')
  })

  it('still reads a pre-0.9.5 frame that carries no tool field', () => {
    // 宿主半没升级时帧里没有 tool：行必须还在，不能因为“不知道是谁”就消失。
    const legacy = { ...VIEW, queries: [{ query: 'q', turn: 1, hits: 0 }] }
    const view = readSearchRefs(legacy)
    expect(view?.queries).toEqual([{ query: 'q', tool: 'advanced_search', turn: 1, hits: 0 }])
  })
})

describe('readSearchRefs', () => {
  it('reads a live view', () => {
    const view = readSearchRefs(VIEW)
    expect(view?.queries).toHaveLength(2)
    expect(view?.sources[0]?.title).toBe('B 论文')
    expect(view?.queryTotal).toBe(2)
  })

  it('reads absence and drift as undefined, malformed rows as dropped', () => {
    expect(readSearchRefs(undefined)).toBeUndefined()
    expect(readSearchRefs({ queries: 'nope', sources: [], queryTotal: 0, sourceTotal: 0 })).toBeUndefined()
    const view = readSearchRefs({ ...VIEW, queries: [VIEW.queries[0], { query: '' }, null] })
    expect(view?.queries).toHaveLength(1)
  })

  it('degrades a drifted latest bucket to null without voiding the view', () => {
    const view = readSearchRefs({ ...VIEW, latest: { turn: 'x', urls: [] } })
    expect(view?.latest).toBeNull()
    expect(view?.sources).toHaveLength(2)
  })

  it('matches a source to the latest turn through the normalised key', () => {
    const view = readSearchRefs(VIEW)!
    expect(isLatestSource(view, 'HTTPS://B.org/paper')).toBe(true)
    expect(isLatestSource(view, 'https://a.org/x')).toBe(false)
  })
})

describe('safeHref', () => {
  it('links only web schemes', () => {
    expect(safeHref('https://a.org/x')).toBe('https://a.org/x')
    expect(safeHref('http://a.org')).toBe('http://a.org/')
    expect(safeHref('javascript:alert(1)')).toBeUndefined()
    expect(safeHref('data:text/html,<script>1</script>')).toBeUndefined()
    expect(safeHref('not a url')).toBeUndefined()
  })
})

describe('clusterByQuery', () => {
  it('puts a shared source in every cluster that surfaced it', () => {
    const view = readSearchRefs({
      latest: { turn: 4, urls: ['https://same.org'] },
      queries: [
        { query: 'q2', tool: 'web_search', turn: 4, hits: 1 },
        { query: 'q1', tool: 'advanced_search', turn: 3, hits: 1 },
      ],
      sources: [{ url: 'https://same.org', host: 'same.org', queries: ['q2', 'q1'], tool: 'web_search', count: 2, lastTurn: 4 }],
      queryTotal: 2,
      sourceTotal: 1,
    })
    const clusters = clusterByQuery(view!)
    expect(clusters).toHaveLength(2)
    expect(clusters.map(c => c.query)).toEqual(['q2', 'q1'])
    // 两个簇都含它：那确实是两条查询各自带回的结果。
    expect(clusters.every(c => c.items.some(i => i.url === 'https://same.org'))).toBe(true)
    // 只有本轮那个默认展开。
    expect(clusters.map(c => c.latest)).toEqual([true, false])
  })

  it('collects sources no listed query claims into a tail cluster instead of dropping them', () => {
    const view = readSearchRefs({
      latest: null,
      queries: [{ query: 'q1', tool: 'advanced_search', turn: 1, hits: 1 }],
      sources: [
        { url: 'https://a.org', host: 'a.org', queries: ['q1'], tool: 'advanced_search', count: 1, lastTurn: 1 },
        { url: 'https://orphan.org', host: 'orphan.org', queries: [], tool: 'advanced_search', count: 1, lastTurn: 2 },
      ],
      queryTotal: 1,
      sourceTotal: 2,
    })
    const clusters = clusterByQuery(view!)
    expect(clusters.map(c => c.query)).toEqual(['q1', ''])
    expect(clusters[1]?.items.map(i => i.url)).toEqual(['https://orphan.org'])
    expect(clusters[1]?.latest).toBe(false)
  })

  it('repairs a pre-cluster frame that carries a single query string', () => {
    const view = readSearchRefs({
      latest: { turn: 1, urls: [] },
      queries: [{ query: '旧帧查询', tool: 'advanced_search', turn: 1, hits: 1 }],
      sources: [{ url: 'https://old.org', host: 'old.org', query: '旧帧查询', tool: 'advanced_search', count: 1, lastTurn: 1 }],
      queryTotal: 1,
      sourceTotal: 1,
    })
    const clusters = clusterByQuery(view!)
    expect(clusters[0]?.items.map(i => i.url)).toEqual(['https://old.org'])
  })
})

describe('SearchRefSection rendering', () => {
  it('hides entirely when the capability is absent', () => {
    expect(renderSection({})).toBe('')
  })

  it('shows the empty state for a live but unused session', () => {
    const markup = renderSection({
      [SEARCH_REFS_KEY]: { latest: null, queries: [], sources: [], queryTotal: 0, sourceTotal: 0 },
    })
    expect(markup).toContain(t('searchRefs.empty'))
    expect(markup).toContain(t('searchRefs.emptyHint'))
  })

  it('opens the latest turn\'s cluster and folds the older ones', () => {
    const markup = renderSection({ [SEARCH_REFS_KEY]: VIEW })
    // 两个簇、只展开本轮那个（latest.turn=4）。
    expect(markup.match(/data-dsh-brief-sidebar="search-refs-cluster"/g)).toHaveLength(2)
    expect(markup).toContain('B 论文')
    expect(markup).toContain('摘要乙')
    expect(markup).toContain('b.org')
    expect(markup.match(/data-dsh-brief-sidebar="search-refs-bubble"/g)).toHaveLength(1)
    // 被折叠的簇只留标题：A 页面与它的 ×2 不得出现在静态渲染里。
    expect(markup).not.toContain('A 页面')
    expect(markup).not.toContain('×2')
    // 来路计数写在组标题上。
    expect(markup).toContain(label('searchRefs.hits', 2))
  })

  it('turns an unsafe provider URL into text, not a link', () => {
    const evil = {
      ...VIEW,
      // 挂在本轮已列出的查询下，否则它会被归进默认折叠的尾组，测不到点。
      sources: [{ url: 'javascript:alert(1)', host: 'javascript:', title: '恶意标题', queries: ['量子纠错 最新进展'], count: 1, lastTurn: 4 }],
    }
    const markup = renderSection({ [SEARCH_REFS_KEY]: evil })
    expect(markup).not.toContain('href=')
    expect(markup).toContain('恶意标题')
    // 正常来源则带 rel 保护。
    const ok = renderSection({ [SEARCH_REFS_KEY]: VIEW })
    expect(ok).toContain('rel="noreferrer noopener"')
  })

  it('says why a source list is missing instead of showing nothing', () => {
    const noMeta = { ...VIEW, sources: [], sourceTotal: 0 }
    const markup = renderSection({ [SEARCH_REFS_KEY]: noMeta })
    expect(markup).toContain(t('searchRefs.noSourcesHint'))
  })

  it('separates the capped list length from the session total', () => {
    const capped = { ...VIEW, queryTotal: 57 }
    const markup = renderSection({ [SEARCH_REFS_KEY]: capped })
    expect(markup).toContain((zh as Record<string, string>)['searchRefs.capped'].replace('{total}', '57'))
  })
})

describe('ReferenceSection search tab', () => {
  it('adds the search tab only when that capability is live', () => {
    const without = renderToStaticMarkup(createElement(ReferenceSection, {
      t, ctx: ctxWith({ [SKILL_USAGE_KEY]: { latest: null, session: [], sessionTotal: 0, callTotal: 0 } }), scope: { sessionId: SESSION },
    }))
    expect(without).not.toContain('data-dsh-brief-sidebar="reference-tab-search"')

    const withSearch = renderToStaticMarkup(createElement(ReferenceSection, {
      t,
      ctx: ctxWith({
        [SKILL_USAGE_KEY]: { latest: null, session: [], sessionTotal: 0, callTotal: 0 },
        [SEARCH_REFS_KEY]: VIEW,
      }),
      scope: { sessionId: SESSION },
    }))
    expect(withSearch).toContain('data-dsh-brief-sidebar="reference-tab-search"')
    // 保活：未选中的搜索面板在 DOM 里但被隐藏。
    expect(withSearch).toContain('data-dsh-brief-sidebar="search-refs-section"')
  })

  it('cycles skills → search with the arrow keys when memory is absent', () => {
    let root: Root | undefined
    const host = document.createElement('div')
    document.body.append(host)
    try {
      act(() => {
        root = createRoot(host)
        root.render(createElement(ReferenceSection, {
          t,
          ctx: ctxWith({
            [SKILL_USAGE_KEY]: { latest: null, session: [], sessionTotal: 0, callTotal: 0 },
            [SEARCH_REFS_KEY]: VIEW,
          }),
          scope: { sessionId: SESSION },
        }))
      })
      const tabs = host.querySelector('[data-dsh-brief-sidebar="reference-tabs"]')
      const searchPane = host.querySelector('[data-dsh-brief-sidebar="reference-pane-search"]')
      expect((searchPane as HTMLElement | null)?.style.display).toBe('none')
      act(() => {
        tabs?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }))
      })
      // 记忆页签不存在 ⇒ 一步就到搜索页，而不是停在隐藏的空页。
      expect((searchPane as HTMLElement | null)?.style.display).toBe('')
      // 页签内容真在：拿来源标题当凭据（查询串已不再上屏）。
      expect(host.textContent).toContain('B 论文')
    } finally {
      act(() => { root?.unmount() })
      host.remove()
    }
  })
})
