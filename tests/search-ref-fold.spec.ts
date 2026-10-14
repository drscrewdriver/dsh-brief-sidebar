/**
 * 搜索引用折叠（只追 `advanced_search`）的单元用例。
 *
 * 钉住四件事：
 * 1. 查询串来自 `tool/call.arguments.query`，**成功结果之前不算引用**（与产物/技能同口径）；
 * 2. 来源来自 `tool/result.meta.sources[]`——meta 缺席（老版 dsh-free-search 没有
 *    presentationMeta）时必须降级成"查询记到了、来源为 0"，而不是整条丢掉；
 * 3. 同一 URL 被多次搜索命中只占一行，`count` 累加、`query` 取最近一次；
 * 4. state 有界：条目、查询日志、latest 都有上限，且超出后 `*Total` 仍报真数。
 */
import { describe, expect, it } from 'vitest'
import {
  CAPS,
  applySearchRefEvent,
  initSearchRefState,
  queriesFromArgs,
} from '../src/projection/search-ref-fold'

const turnStart = (turn: number) => ({ type: 'turn/start', data: { turn } })

const call = (callId: string, args: unknown) => ({
  type: 'tool/call',
  data: { turn: 1, step: 1, callId, name: 'advanced_search', arguments: typeof args === 'string' ? args : JSON.stringify(args) },
})

const result = (callId: string, meta?: unknown, isError = false) => ({
  type: 'tool/result',
  data: {
    turn: 1,
    step: 1,
    message: {
      content: isError ? [{ type: 'text', text: 'boom', isError: true }] : [{ type: 'text', text: 'Search (tavily): …' }],
      source: { kind: 'tool', callId },
    },
    ...(meta === undefined ? {} : { meta }),
  },
})

const OPEN = applySearchRefEvent(initSearchRefState(), turnStart(1))

describe('queriesFromArgs', () => {
  it('reads the single query of an advanced_search call', () => {
    expect(queriesFromArgs('advanced_search', '{"query":"量子纠错"}')).toEqual(['量子纠错'])
    expect(queriesFromArgs('advanced_search', '{"maxResults":5}')).toBeNull()
    expect(queriesFromArgs('advanced_search', 'not json')).toBeNull()
    expect(queriesFromArgs('advanced_search', '"a string"')).toBeNull()
    expect(queriesFromArgs('advanced_search', '{"query":"   "}')).toBeNull()
  })

  it('reads every query of a host web_search call, in published order', () => {
    // 宿主 web_search 的参数是 queries: string[]，一次调用可合并多条查询。
    expect(queriesFromArgs('web_search', '{"queries":["a","b"," c "]}')).toEqual(['a', 'b', 'c'])
    expect(queriesFromArgs('web_search', '{"queries":["a","",null,"   "]}')).toEqual(['a'])
    expect(queriesFromArgs('web_search', '{"queries":"a"}')).toBeNull()
    expect(queriesFromArgs('web_search', '{}')).toBeNull()
  })

  it('ignores search-ish tools it does not own', () => {
    expect(queriesFromArgs('read', '{"query":"x"}')).toBeNull()
    expect(queriesFromArgs('web_fetch', '{"queries":["x"]}')).toBeNull()
    expect(queriesFromArgs('multi_search', '{"query":"x"}')).toBeNull()
  })
})

describe('search-ref fold', () => {
  it('records nothing until the result settles', () => {
    const s = applySearchRefEvent(OPEN, call('c1', { query: '量子纠错', maxResults: 5 }))
    expect(s.queries).toHaveLength(0)
    expect(s.queryTotal).toBe(0)
  })

  it('counts a settled call with no meta as a query with zero sources', () => {
    let s = applySearchRefEvent(OPEN, call('c1', { query: '量子纠错' }))
    s = applySearchRefEvent(s, result('c1'))
    expect(s.queries).toEqual([{ query: '量子纠错', tool: 'advanced_search', turn: 1, hits: 0 }])
    expect(s.queryTotal).toBe(1)
    expect(s.items).toHaveLength(0)
    expect(s.sourceTotal).toBe(0)
  })

  it('folds meta.sources into url-keyed rows and tags the latest bucket', () => {
    let s = applySearchRefEvent(OPEN, call('c1', { query: '3dgs' }))
    s = applySearchRefEvent(s, result('c1', {
      provider: 'tavily',
      query: '3dgs',
      sources: [
        { url: 'https://a.org/x', title: 'A 标题', snippet: '摘要一' },
        { url: 'https://b.org/', title: 'B 标题' },
      ],
    }))
    expect(s.items.map(i => i.url)).toEqual(['https://b.org/', 'https://a.org/x'])
    expect(s.items[0]).toMatchObject({ title: 'B 标题', host: 'b.org', queries: ['3dgs'], count: 1 })
    expect(s.sourceTotal).toBe(2)
    // latest 存的是归一化键（与条目同一算法），客户端才能拿它对上行。
    expect(s.latest?.urls).toEqual(['https://b.org', 'https://a.org/x'])
    expect(s.queries[0]).toEqual({ query: '3dgs', tool: 'advanced_search', turn: 1, hits: 2 })
  })

  it('merges a repeated URL into one row with a growing count', () => {
    let s = applySearchRefEvent(OPEN, call('c1', { query: 'q1' }))
    s = applySearchRefEvent(s, result('c1', { sources: [{ url: 'https://a.org/x', title: '旧标题' }] }))
    s = applySearchRefEvent(s, call('c2', { query: 'q2' }))
    // 归一化只动 host 大小写与末尾斜杠：路径大小写对真 URL 是有意义的，不能抹。
    s = applySearchRefEvent(s, result('c2', { sources: [{ url: 'HTTPS://A.org/x/', title: '新标题' }] }))
    expect(s.items).toHaveLength(1)
    // 聚类归属取并集（新查询在前）：旧查询的簇不能因为后来又被搜了一次就丢了它。
    expect(s.items[0]).toMatchObject({ count: 2, queries: ['q2', 'q1'], title: '新标题' })
    expect(s.sourceTotal).toBe(1)
  })

  it('drops a failed result entirely', () => {
    let s = applySearchRefEvent(OPEN, call('c1', { query: 'q1' }))
    s = applySearchRefEvent(s, result('c1', { sources: [{ url: 'https://a.org' }] }, true))
    expect(s.queries).toHaveLength(0)
    expect(s.items).toHaveLength(0)
    expect(s.queryTotal).toBe(0)
  })

  it('ignores malformed meta without losing the query', () => {
    let s = applySearchRefEvent(OPEN, call('c1', { query: 'q1' }))
    s = applySearchRefEvent(s, result('c1', { sources: 'nope' }))
    expect(s.queries[0]).toEqual({ query: 'q1', tool: 'advanced_search', turn: 1, hits: 0 })
    expect(s.items).toHaveLength(0)
    // 条目级畸形只丢那一条：无 url 的被过滤，有 url 的留下。
    let s2 = applySearchRefEvent(OPEN, call('c2', { query: 'q2' }))
    s2 = applySearchRefEvent(s2, result('c2', { sources: [{ title: '无 url' }, { url: 'https://ok.org' }, null, 7] }))
    expect(s2.items.map(i => i.url)).toEqual(['https://ok.org'])
  })

  it('folds the host web_search tool too, one row per query', () => {
    // 模型默认走宿主那个 web_search，只追插件工具会让常见会话看起来“没搜过”。
    const call2 = { type: 'tool/call', data: { turn: 1, step: 1, callId: 'w1', name: 'web_search', arguments: '{"queries":["今天天气 上海","明天天气 上海"]}' } }
    let s = applySearchRefEvent(OPEN, call2)
    s = applySearchRefEvent(s, result('w1', { sources: [{ url: 'https://a.org/w', title: 'A' }], truncated: false }))
    expect(s.queries.map(q => [q.query, q.tool, q.hits])).toEqual([
      ['明天天气 上海', 'web_search', 1],
      ['今天天气 上海', 'web_search', 1],
    ])
    expect(s.queryTotal).toBe(2)
    // 同一次调用里的多条查询按发布顺序入列（不反转：那是整次调用的提问清单）。
    expect(s.items[0]).toMatchObject({ tool: 'web_search', queries: ['今天天气 上海', '明天天气 上海'] })
  })

  it('leaves unrelated events and other tools alone (same reference)', () => {
    const other = { type: 'tool/call', data: { callId: 'x', name: 'multi_search', arguments: '{"query":"a"}' } }
    expect(applySearchRefEvent(OPEN, other)).toBe(OPEN)
    expect(applySearchRefEvent(OPEN, { type: 'turn/end', data: { turn: 1 } })).toBe(OPEN)
    expect(applySearchRefEvent(OPEN, { type: 'tool/result', data: { message: { content: [], source: {} } } })).toBe(OPEN)
  })

  it('opens a fresh latest bucket per turn', () => {
    let s = applySearchRefEvent(OPEN, call('c1', { query: 'q1' }))
    s = applySearchRefEvent(s, result('c1', { sources: [{ url: 'https://a.org' }] }))
    s = applySearchRefEvent(s, turnStart(2))
    expect(s.latest).toEqual({ turn: 2, urls: [] })
    // 上一轮的成果仍在会话视图里。
    expect(s.items).toHaveLength(1)
  })

  it('bounds every list but keeps the true totals', () => {
    let s = OPEN
    for (let i = 0; i < CAPS.queries + 12; i++) {
      s = applySearchRefEvent(s, call(`c${i}`, { query: `q${i}` }))
      s = applySearchRefEvent(s, result(`c${i}`, { sources: [{ url: `https://a.org/${i}` }] }))
    }
    expect(s.queries.length).toBeLessThanOrEqual(CAPS.queries)
    expect(s.queryTotal).toBe(CAPS.queries + 12)
    expect(s.items.length).toBeLessThanOrEqual(CAPS.items)
    expect(s.sourceTotal).toBe(CAPS.queries + 12)
  })

  it('caps the latest bucket too', () => {
    let s = OPEN
    const many = Array.from({ length: CAPS.latest + 5 }, (_, i) => ({ url: `https://a.org/${i}` }))
    s = applySearchRefEvent(s, call('c1', { query: 'q' }))
    s = applySearchRefEvent(s, result('c1', { sources: many }))
    expect(s.latest?.urls).toHaveLength(CAPS.latest)
  })
})
