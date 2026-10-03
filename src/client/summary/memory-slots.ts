/**
 * The `memorySlots` projection — reading it.
 *
 * The projection unit is registered by `dsh-prime-memory` (key `memorySlots`,
 * wire view `{rev, count, openCount, slots[]}`); this plugin does NOT depend
 * on it — when the unit is not registered the client reads `undefined` from
 * `faceOf` and the section hides. This module is the read side of that
 * contract and is deliberately PURE — no React, no context, no IO — so the
 * narrowing can be tested directly.
 *
 * Forward compatibility: the shipped view carries `{id, title, kind, status,
 * priority}` only. A future prime-memory release may add `body`/`refs` to the
 * wire view (its projection plan keeps that door open); those fields are
 * narrowed opportunistically — present and well-formed → kept, absent or
 * malformed → dropped — so the section renders them without a brief-sidebar
 * change, and a malformed extra field can never blank the section.
 */

/** The projection key `dsh-prime-memory` registers (its canonical constant). */
export const MEMORY_SLOTS_KEY = 'memorySlots'

/** One slot of the wire view. */
export interface MemorySlotView {
  readonly id: string
  readonly title: string
  /** One of prime-memory's `SLOT_KINDS`: rule / todo / anchor / pointer. */
  readonly kind: string
  /** One of prime-memory's `SLOT_STATUSES`: open / done / dropped / expired. */
  readonly status: string
  /** 0–100; higher wins the activation competition. */
  readonly priority: number
  /** Slot body, once prime-memory exposes it on the wire (truncated at render). */
  readonly body?: string
  /** Reference targets, once prime-memory exposes them on the wire. */
  readonly refs?: readonly string[]
  /**
   * record_id 引用的展示解析(v0.5.0 契约:ref → `[type] 名称简述`),由
   * prime-memory 在投影帧构建时解析;路径/URL 类引用不产生条目。存在才收。
   */
  readonly refViews?: readonly SlotRefView[]
}

/** 一条 record_id 引用的展示解析(与 prime-memory 的 SlotRefView 同形)。 */
export interface SlotRefView {
  readonly ref: string
  readonly title: string
}

/** The whole wire view of one frame. */
export interface MemorySlotsView {
  readonly rev: number
  readonly count: number
  readonly openCount: number
  readonly slots: readonly MemorySlotView[]
}

/**
 * Narrow a raw projection value into a memory-slots view.
 *
 * Two outcomes are kept apart, mirroring the deliverables read side:
 * - `undefined` — the capability is ABSENT (prime-memory is not in the
 *   composition, or no frame has carried the key yet), or the frame is
 *   malformed beyond repair (a shape drift must not blank the whole tab);
 * - a view — the projection is live. A view with `slots: []` IS the empty
 *   state: prime-memory publishes as soon as the unit registers, so "present
 *   but empty" is a real value, not a sentinel.
 *
 * Malformed slot entries are dropped rather than thrown on (trusted-Host
 * value, defensive display), like `readTodos`.
 *
 * @param value - the raw `unknown` snapshot of the `memorySlots` face.
 * @returns the validated view, or `undefined` when the capability is absent.
 */
export function readSlots(value: unknown): MemorySlotsView | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const raw = value as Record<string, unknown>
  if (!isCounter(raw['rev']) || !isCounter(raw['count']) || !isCounter(raw['openCount'])) return undefined
  if (!Array.isArray(raw['slots'])) return undefined
  const slots: MemorySlotView[] = []
  for (const entry of raw['slots']) {
    const slot = readSlot(entry)
    if (slot !== undefined) slots.push(slot)
  }
  return { rev: raw['rev'], count: raw['count'], openCount: raw['openCount'], slots }
}

/** Whether a value is a non-negative safe integer (the view's counter shape). */
function isCounter(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

/** Narrow one slot entry; `undefined` = malformed, dropped. */
function readSlot(value: unknown): MemorySlotView | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const raw = value as Record<string, unknown>
  if (typeof raw['id'] !== 'string' || raw['id'].length === 0) return undefined
  if (typeof raw['title'] !== 'string') return undefined
  if (typeof raw['kind'] !== 'string' || typeof raw['status'] !== 'string') return undefined
  if (typeof raw['priority'] !== 'number') return undefined
  const slot: { -readonly [K in keyof MemorySlotView]: MemorySlotView[K] } = {
    id: raw['id'],
    title: raw['title'],
    kind: raw['kind'],
    status: raw['status'],
    priority: raw['priority'],
  }
  if (typeof raw['body'] === 'string' && raw['body'].length > 0) slot.body = raw['body']
  if (Array.isArray(raw['refs'])) {
    const refs = raw['refs'].filter((ref): ref is string => typeof ref === 'string' && ref.length > 0)
    if (refs.length > 0) slot.refs = refs
  }
  if (Array.isArray(raw['refViews'])) {
    const views: SlotRefView[] = []
    for (const entry of raw['refViews']) {
      if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) continue
      const view = entry as Record<string, unknown>
      if (typeof view['ref'] !== 'string' || view['ref'].length === 0) continue
      if (typeof view['title'] !== 'string' || view['title'].length === 0) continue
      views.push({ ref: view['ref'], title: view['title'] })
    }
    if (views.length > 0) slot.refViews = views
  }
  return slot
}

/** The body length at which the section truncates (full text rides the title tooltip). */
export const BODY_TRUNCATE_AT = 120

/**
 * One-line truncation for a slot body. Already-short bodies pass through;
 * longer ones are cut at the limit with an ellipsis.
 */
export function truncateBody(body: string, limit = BODY_TRUNCATE_AT): string {
  const flat = body.replaceAll(/\s+/g, ' ').trim()
  return flat.length <= limit ? flat : `${flat.slice(0, limit)}…`
}
