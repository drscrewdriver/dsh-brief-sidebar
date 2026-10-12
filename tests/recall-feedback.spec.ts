/**
 * The rating write channel (`recall-feedback.ts`) — parse and status mapping.
 *
 * This is the one place this plugin writes to another plugin, over a route it
 * does not own. Everything that has to hold is pinned here without a browser:
 *
 * - the local domain guard runs BEFORE any network call (a bad click must not
 *   reach the server at all);
 * - "no such route" is `absent`, not an error — the section turns the control
 *   off instead of failing on every click;
 * - a business rejection carries prime-memory's own message to the user;
 * - no failure mode is allowed to throw out of the call.
 */
import { describe, expect, it } from 'vitest'
import {
  FEEDBACK_SCORES,
  RECALL_FEEDBACK_ROUTE,
  isFeedbackScore,
  sendRecallFeedback,
} from '../src/client/summary/recall-feedback'
import type { FeedbackFetch, FeedbackScore } from '../src/client/summary/recall-feedback'

/** A fetch stub recording calls and replying with whatever the case needs. */
function stubFetch(reply: {
  ok?: boolean
  status?: number
  body?: unknown
  throwWith?: Error
  jsonThrows?: boolean
}): { fetch: FeedbackFetch; calls: Array<{ url: string; body: Record<string, unknown> }> } {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = []
  const fetchImpl: FeedbackFetch = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) as Record<string, unknown> })
    if (reply.throwWith !== undefined) throw reply.throwWith
    return {
      ok: reply.ok ?? true,
      status: reply.status ?? 200,
      json: async () => {
        if (reply.jsonThrows === true) throw new Error('boom')
        return reply.body
      },
    }
  }
  return { fetch: fetchImpl, calls }
}

const REQ = { sessionId: 'sess-1', id: 'm1', score: 4 as FeedbackScore }

describe('isFeedbackScore', () => {
  it('accepts exactly -1 and 0..5', () => {
    for (const s of FEEDBACK_SCORES) expect(isFeedbackScore(s)).toBe(true)
    expect(FEEDBACK_SCORES).toEqual([-1, 0, 1, 2, 3, 4, 5])
    for (const bad of [-2, 6, 4.5, NaN, '4', null, undefined, true]) expect(isFeedbackScore(bad)).toBe(false)
  })
})

describe('sendRecallFeedback — local guards (no network)', () => {
  it('a missing transport is a capability miss, not a crash', async () => {
    expect(await sendRecallFeedback(undefined, REQ)).toEqual({ status: 'absent' })
  })

  it('refuses an out-of-domain score before touching the wire', async () => {
    const { fetch, calls } = stubFetch({ body: { ok: true, value: {} } })
    const out = await sendRecallFeedback(fetch, { ...REQ, score: 9 as unknown as FeedbackScore })
    expect(out.status).toBe('rejected')
    expect(calls).toHaveLength(0)
  })

  it('refuses an empty session or id (a click before the scope resolved)', async () => {
    for (const req of [{ ...REQ, sessionId: '' }, { ...REQ, id: '' }]) {
      const { fetch, calls } = stubFetch({ body: { ok: true, value: {} } })
      expect((await sendRecallFeedback(fetch, req)).status).toBe('rejected')
      expect(calls).toHaveLength(0)
    }
  })
})

describe('sendRecallFeedback — the request', () => {
  it('posts the triple to prime-memory\'s client RPC route as JSON', async () => {
    const { fetch, calls } = stubFetch({ body: { ok: true, value: { retired: false, announced: false, rating: { mean: 4, rated: 1 } } } })
    await sendRecallFeedback(fetch, REQ)
    expect(calls[0]!.url).toBe(RECALL_FEEDBACK_ROUTE)
    expect(calls[0]!.body).toEqual({ sessionId: 'sess-1', id: 'm1', score: 4 })
  })
})

describe('sendRecallFeedback — outcome mapping', () => {
  it('reads back the confirmation fields the caller acts on', async () => {
    const { fetch } = stubFetch({
      body: { ok: true, value: { retired: true, announced: true, rating: { mean: 3.5, rated: 2 } } },
    })
    expect(await sendRecallFeedback(fetch, REQ)).toEqual({
      status: 'sent', retired: true, announced: true, mean: 3.5, rated: 2,
    })
  })

  it('missing rating block degrades to zeroes, not to a crash', async () => {
    const { fetch } = stubFetch({ body: { ok: true, value: {} } })
    expect(await sendRecallFeedback(fetch, REQ)).toEqual({
      status: 'sent', retired: false, announced: false, mean: 0, rated: 0,
    })
  })

  it('404/405/501 mean the endpoint is not there', async () => {
    for (const status of [404, 405, 501]) {
      const { fetch } = stubFetch({ ok: false, status })
      expect(await sendRecallFeedback(fetch, REQ)).toEqual({ status: 'absent' })
    }
  })

  it('any other HTTP failure is transport, with the status for the message', async () => {
    const { fetch } = stubFetch({ ok: false, status: 500 })
    expect(await sendRecallFeedback(fetch, REQ)).toEqual({ status: 'transport', reason: 'HTTP 500' })
  })

  it('carries prime-memory\'s rejection reason to the user', async () => {
    const { fetch } = stubFetch({
      body: { ok: false, error: { code: 'x', message: '该记忆不在本会话的召回集里' } },
    })
    expect(await sendRecallFeedback(fetch, REQ)).toEqual({
      status: 'rejected', reason: '该记忆不在本会话的召回集里',
    })
  })

  it('a rejection without a message still reads as rejected, not as success', async () => {
    const { fetch } = stubFetch({ body: { ok: false, error: {} } })
    expect(await sendRecallFeedback(fetch, REQ)).toEqual({ status: 'rejected', reason: 'rejected' })
  })

  it('unparseable body and unexpected envelope shapes are transport failures', async () => {
    const broken = stubFetch({ jsonThrows: true })
    expect(await sendRecallFeedback(broken.fetch, REQ)).toEqual({ status: 'transport', reason: 'unparseable-response' })
    for (const body of ['plain text', 42, null, [], { status: 'ok' }]) {
      const { fetch } = stubFetch({ body })
      expect(await sendRecallFeedback(fetch, REQ)).toEqual({ status: 'transport', reason: 'unexpected-envelope' })
    }
  })

  it('a throwing transport (offline, aborted) never escapes', async () => {
    const { fetch } = stubFetch({ throwWith: Object.assign(new Error('Failed to fetch'), { name: 'TypeError' }) })
    expect(await sendRecallFeedback(fetch, REQ)).toEqual({ status: 'transport', reason: 'Failed to fetch' })
    const aborted = stubFetch({ throwWith: Object.assign(new Error('signal aborted'), { name: 'AbortError' }) })
    expect(await sendRecallFeedback(aborted.fetch, REQ)).toEqual({ status: 'transport', reason: 'timeout' })
  })
})
