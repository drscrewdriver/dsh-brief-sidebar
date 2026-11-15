/**
 * Opening the spirit echo page (cross-bundle deep link).
 *
 * `dsh-spirit` owns the Memory Sea panel; this plugin must not import it and
 * must not call `layout.selectPanel` itself — that call THROWS when the main
 * key is not registered (host contract). So the request rides one cancelable
 * `CustomEvent` and the owner answers synchronously: it writes `detail.ack`
 * and calls `preventDefault()` on success.
 *
 * Absence is a normal outcome: no listener → `ack` missing and the event not
 * prevented → `{ok:false, reason:'absent'}` and the caller shows fallback copy.
 */

/** The event `dsh-spirit` listens for (`client/src/entry.ts`, same literal). */
export const SPIRIT_OPEN_EVENT = 'dsh-spirit:open-sea'

/** Synchronous answer from the panel owner. */
export interface SpiritOpenAck {
  ok: boolean
  /** `unmounted` = panel not in the composition; `unregistered` = main key not registered. */
  reason?: string
  /** Owner-side diagnostic (which resolver path was tried / what threw). Tooltip only. */
  detail?: string
}

/** Which spirit view to reveal: `echo` = 翻阅 → 回响（条目面）; `graph` = 星海星图面。 */
export type SpiritOpenTarget = 'echo' | 'graph'

/** Event detail shape (spirit reads `target`, writes `ack`). */
interface SpiritOpenDetail {
  target: SpiritOpenTarget
  ack?: SpiritOpenAck
}

/**
 * Ask spirit to reveal one of its echo views.
 *
 * @param target - `echo` (default, the recalled-passage list) or `graph` (the star map).
 * @returns `{ok:true}` when the owner opened the panel; otherwise the owner's
 *   reason, or `absent` when nothing listened.
 */
export function openSpiritEcho(target: SpiritOpenTarget = 'echo'): SpiritOpenAck {
  if (typeof window === 'undefined') return { ok: false, reason: 'absent' }
  const detail: SpiritOpenDetail = { target }
  const event = new CustomEvent(SPIRIT_OPEN_EVENT, { detail, cancelable: true })
  window.dispatchEvent(event)
  if (detail.ack !== undefined) return detail.ack
  return event.defaultPrevented ? { ok: true } : { ok: false, reason: 'absent' }
}
