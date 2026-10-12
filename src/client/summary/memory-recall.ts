/**
 * The `memoryRecall` projection — reading it.
 *
 * The projection unit is registered by `dsh-prime-memory` (key `memoryRecall`,
 * wire view `{rev, sessionId, count, items[]}`): the memories this session has
 * actually injected and that compaction has not overwritten yet. Unlike
 * `memorySlots` (pinned, resident conventions written by hand), this set is
 * NOT resident — it is the at-a-glance answer to "what is the model seeing
 * right now", and it empties itself when the context is compacted.
 *
 * This plugin does NOT depend on prime-memory: with the unit unregistered the
 * client reads `undefined` from the face and the section hides. The module is
 * deliberately PURE — no React, no context, no IO — so the narrowing is
 * testable directly, exactly like `memory-slots.ts`.
 */

/** The projection key `dsh-prime-memory` registers (its canonical constant). */
export const MEMORY_RECALL_KEY = 'memoryRecall'

/** One recalled memory of the wire view. */
export interface MemoryRecallItem {
  readonly id: string
  /** prime-memory's memory type: work_fact / work_method / episodic / … */
  readonly type: string
  /** First line of the record body (prime-memory truncates for the wire). */
  readonly title: string
  /** 0–100, the record's own priority. */
  readonly priority: number
  /** "When should this surface" phrases, once prime-memory exposes them. */
  readonly scenario?: readonly string[]
  /**
   * The last mark a HUMAN put on this record: `-1` (declared obsolete) or
   * `0..5` (relevance). Absent means never rated — which is NOT the same as
   * a zero. prime-memory publishes it on the `memoryRecall` view so the row
   * can show the existing mark without a second round-trip.
   */
  readonly rating?: number
}

/** The whole wire view of one frame. */
export interface MemoryRecallView {
  readonly rev: number
  readonly sessionId: string
  /** Total recalled-and-alive count; `items` may be a capped prefix of it. */
  readonly count: number
  /** Most recently injected first. */
  readonly items: readonly MemoryRecallItem[]
}

/** Whether a value is a non-negative safe integer (the view's counter shape). */
function isCounter(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

/** Narrow one item entry; `undefined` = malformed, dropped. */
function readItem(value: unknown): MemoryRecallItem | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const raw = value as Record<string, unknown>
  if (typeof raw['id'] !== 'string' || raw['id'].length === 0) return undefined
  if (typeof raw['type'] !== 'string' || typeof raw['title'] !== 'string') return undefined
  if (typeof raw['priority'] !== 'number') return undefined
  const item: { -readonly [K in keyof MemoryRecallItem]: MemoryRecallItem[K] } = {
    id: raw['id'],
    type: raw['type'],
    title: raw['title'],
    priority: raw['priority'],
  }
  if (Array.isArray(raw['scenario'])) {
    const phrases = raw['scenario'].filter((s): s is string => typeof s === 'string' && s.length > 0)
    if (phrases.length > 0) item.scenario = phrases
  }
  // A drifted rating (non-number, or outside the -1..5 domain) is dropped
  // rather than trusted: the row then simply looks unrated.
  const rating = raw['rating']
  if (typeof rating === 'number' && Number.isInteger(rating) && rating >= -1 && rating <= 5) item.rating = rating
  return item
}

/**
 * Narrow a raw projection value into a recall view.
 *
 * `undefined` means the capability is ABSENT (prime-memory not in the
 * composition, or no frame carried the key) or the frame drifted beyond repair;
 * a view with `items: []` IS the honest empty state (prime-memory publishes as
 * soon as the unit registers). Malformed items are dropped, never thrown on.
 *
 * @param value - the raw `unknown` snapshot of the `memoryRecall` face.
 * @returns the validated view, or `undefined` when the capability is absent.
 */
export function readRecall(value: unknown): MemoryRecallView | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const raw = value as Record<string, unknown>
  if (!isCounter(raw['rev']) || !isCounter(raw['count'])) return undefined
  if (typeof raw['sessionId'] !== 'string') return undefined
  if (!Array.isArray(raw['items'])) return undefined
  const items: MemoryRecallItem[] = []
  for (const entry of raw['items']) {
    const item = readItem(entry)
    if (item !== undefined) items.push(item)
  }
  return { rev: raw['rev'], sessionId: raw['sessionId'], count: raw['count'], items }
}
