/**
 * Opening the prime-memory library page in a chosen mode (cross-bundle deep link).
 *
 * Mirror of `spirit-open.ts`: `dsh-prime-memory` owns the explorer main panel
 * (its sidebar row calls `layout.selectPanel('dsh-memory-explorer')`), so the
 * panel owner performs the jump and answers synchronously. This plugin only
 * sends one cancelable event — no import, no layout access, no version coupling.
 *
 * Three modes map to the explorer's internal views:
 * - `entry` — query mode with the entry pane;
 * - `2d` / `3d` — graph mode with the G6 / canvas view.
 */

/** The event `dsh-prime-memory` listens for (`client/src/entry.tsx`, same literal). */
export const MEMORY_OPEN_EVENT = 'dsh-prime-memory:open-explorer'

/** Which explorer view to reveal. */
export type MemoryOpenMode = 'entry' | '2d' | '3d'

/** Synchronous answer from the panel owner. */
export interface MemoryOpenAck {
  ok: boolean
  /** `disabled` = 记忆库入口被关掉; `unmounted` = 没有 main 页; `unregistered` = key 未注册。 */
  reason?: string
  /** Owner-side diagnostic (which resolver path was tried / what threw). Tooltip only. */
  detail?: string
}

/** Event detail shape (prime-memory reads `mode`/`recordId`, writes `ack`). */
interface MemoryOpenDetail {
  mode: MemoryOpenMode
  recordId?: string
  ack?: MemoryOpenAck
}

/**
 * Ask prime-memory to open its 记忆库 in the given mode.
 *
 * @param mode - which view to show.
 * @param recordId - optional memory id to focus (kept for per-row entry points).
 * @returns the owner's ack, or `absent` when nothing listened.
 */
export function openMemoryLibrary(mode: MemoryOpenMode, recordId?: string): MemoryOpenAck {
  if (typeof window === 'undefined') return { ok: false, reason: 'absent' }
  const detail: MemoryOpenDetail = recordId === undefined || recordId === ''
    ? { mode }
    : { mode, recordId }
  const event = new CustomEvent(MEMORY_OPEN_EVENT, { detail, cancelable: true })
  window.dispatchEvent(event)
  if (detail.ack !== undefined) return detail.ack
  return event.defaultPrevented ? { ok: true } : { ok: false, reason: 'absent' }
}
