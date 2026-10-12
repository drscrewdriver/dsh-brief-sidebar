/**
 * The write channel back into `dsh-prime-memory`: rating one recalled memory.
 *
 * This is the FIRST write this plugin performs, and deliberately the only one.
 * Reading goes through the host's projection face (`memoryRecall`); there is no
 * projection for writes, so the mark travels over prime-memory's own client RPC
 * route — `POST /dsh-memory/rpc/<method>`, the same envelope its panel uses.
 * That is a cross-plugin HTTP contract, so everything that makes it safe to
 * hold lives here:
 *
 * - **Optional by construction.** A composition without dsh-prime-memory, or an
 *   older one without this endpoint, answers 404/405. That is reported as
 *   `absent`, and the section stops offering the control instead of failing on
 *   every click.
 * - **No invented semantics.** `-1` and `0..5` are prime-memory's domain; this
 *   module refuses anything else locally so a bad click cannot reach the server.
 * - **Nothing is optimistic about retirement.** The caller only hides a row
 *   after the server confirms `retired` — a lost request must not silently
 *   remove a memory from view.
 *
 * `fetch` is injected so the parse and the status mapping are testable without
 * a browser.
 */

/** The route prime-memory's server half registers for its client RPC surface. */
export const RECALL_FEEDBACK_ROUTE = '/dsh-memory/rpc/recall-feedback'

/** A relevance mark (`0..5`) or `-1` = "this is obsolete", prime-memory's domain. */
export const FEEDBACK_SCORES = [-1, 0, 1, 2, 3, 4, 5] as const
export type FeedbackScore = (typeof FEEDBACK_SCORES)[number]

/** Whether a value is a score this plugin is allowed to send. */
export function isFeedbackScore(value: unknown): value is FeedbackScore {
  return typeof value === 'number' && (FEEDBACK_SCORES as readonly number[]).includes(value)
}

/** How long to wait before giving up on one click. */
export const FEEDBACK_TIMEOUT_MS = 8_000

/**
 * Outcome of one rating attempt.
 *
 * `absent` is NOT an error to show the user — it means the capability is not
 * there (prime-memory missing or older), and the caller should stop offering
 * the control. `rejected` carries prime-memory's own reason (e.g. "this memory
 * is no longer in the session's recall set"), which is worth surfacing.
 */
export type FeedbackOutcome =
  | {
      readonly status: 'sent'
      readonly retired: boolean
      readonly announced: boolean
      readonly mean: number
      readonly rated: number
    }
  | { readonly status: 'rejected'; readonly reason: string }
  | { readonly status: 'absent' }
  | { readonly status: 'transport'; readonly reason: string }

/** The minimal fetch shape this module needs (global `fetch` satisfies it). */
export interface FeedbackFetch {
  (url: string, init: {
    method: 'POST'
    headers: Record<string, string>
    body: string
    signal?: AbortSignal
  }): Promise<{
    readonly ok: boolean
    readonly status: number
    json(): Promise<unknown>
  }>
}

export interface FeedbackRequest {
  readonly sessionId: string
  readonly id: string
  readonly score: FeedbackScore
}

/** Whether a status code means "no such route" rather than "the call failed". */
function isAbsentStatus(status: number): boolean {
  return status === 404 || status === 405 || status === 501
}

/** The host's RpcResult envelope, narrowed enough to read the two branches. */
function parseEnvelope(value: unknown): { ok: true; value: Record<string, unknown> } | { ok: false; reason: string } | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const raw = value as Record<string, unknown>
  if (raw['ok'] === true && raw['value'] !== null && typeof raw['value'] === 'object') {
    return { ok: true, value: raw['value'] as Record<string, unknown> }
  }
  if (raw['ok'] === false) {
    const err = raw['error']
    const message = err !== null && typeof err === 'object'
      ? (err as Record<string, unknown>)['message']
      : undefined
    return { ok: false, reason: typeof message === 'string' && message.length > 0 ? message : 'rejected' }
  }
  return undefined
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

/**
 * Send one rating.
 *
 * Never throws: every failure mode comes back as a discriminated outcome, so a
 * click cannot break the render.
 */
export async function sendRecallFeedback(
  fetchImpl: FeedbackFetch | undefined,
  request: FeedbackRequest,
): Promise<FeedbackOutcome> {
  if (typeof fetchImpl !== 'function') return { status: 'absent' }
  if (request.sessionId.length === 0 || request.id.length === 0) {
    return { status: 'rejected', reason: 'missing-session-or-id' }
  }
  if (!isFeedbackScore(request.score)) return { status: 'rejected', reason: 'invalid-score' }

  const abort = typeof AbortController === 'function' ? new AbortController() : undefined
  const timer = abort === undefined
    ? undefined
    : setTimeout(() => { abort.abort() }, FEEDBACK_TIMEOUT_MS)
  try {
    const response = await fetchImpl(RECALL_FEEDBACK_ROUTE, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId: request.sessionId, id: request.id, score: request.score }),
      ...(abort === undefined ? {} : { signal: abort.signal }),
    })
    if (!response.ok) {
      return isAbsentStatus(response.status)
        ? { status: 'absent' }
        : { status: 'transport', reason: `HTTP ${response.status}` }
    }
    let envelope: unknown
    try {
      envelope = await response.json()
    } catch {
      return { status: 'transport', reason: 'unparseable-response' }
    }
    const parsed = parseEnvelope(envelope)
    if (parsed === undefined) return { status: 'transport', reason: 'unexpected-envelope' }
    if (parsed.ok === false) return { status: 'rejected', reason: parsed.reason }
    const value = parsed.value
    const rating = value['rating'] !== null && typeof value['rating'] === 'object'
      ? value['rating'] as Record<string, unknown>
      : {}
    return {
      status: 'sent',
      retired: value['retired'] === true,
      announced: value['announced'] === true,
      mean: num(rating['mean']),
      rated: num(rating['rated']),
    }
  } catch (err) {
    const aborted = err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')
    return { status: 'transport', reason: aborted ? 'timeout' : (err instanceof Error ? err.message : 'network') }
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}
