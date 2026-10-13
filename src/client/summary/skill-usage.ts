/**
 * The `dshSummarySkillUsage` projection — reading it.
 *
 * The unit is registered by THIS plugin's host half (key `dshSummarySkillUsage`):
 * the skills this session actually loaded through the host's `skill` tool. It
 * answers a different question from `memorySlots`/`memoryRecall` — those say
 * what the model was *told*, this says which instruction packs it *pulled*.
 *
 * The module is deliberately PURE — no React, no context, no IO — so the
 * narrowing is testable directly, exactly like `deliverables.ts`.
 *
 * Reading discipline (the same three-way split every brief section uses):
 * - `undefined` = the capability is ABSENT (host half never registered, older
 *   composition without the projection registry, or a frame drifted beyond
 *   repair) → the section hides;
 * - `session: []` = the honest empty state (the `skill` tool exists on all six
 *   supported lines; this session simply has not loaded anything yet);
 * - a malformed entry is dropped, never thrown — one bad row must not blank
 *   the whole list.
 */
import { SKILL_USAGE_KEY } from '../../projection/keys'
import type { SkillUsageEntryView, SkillUsageView } from '../../projection/keys'

/** The key this plugin's client half subscribes to (re-exported for callers). */
export { SKILL_USAGE_KEY }

/** Whether a value is a non-negative safe integer (the view's counter shape). */
function isCounter(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

/** Narrow one skill tally; `undefined` = malformed, dropped. */
function readEntry(value: unknown): SkillUsageEntryView | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const raw = value as Record<string, unknown>
  if (typeof raw['name'] !== 'string' || raw['name'].length === 0) return undefined
  if (!isCounter(raw['count']) || !isCounter(raw['lastTurn'])) return undefined
  return { name: raw['name'], count: raw['count'], lastTurn: raw['lastTurn'] }
}

/**
 * The latest-turn bucket, or `null` when it is absent OR drifted. A drifted
 * bucket only costs the "本轮" tag, so it degrades instead of voiding the view.
 */
function readLatest(value: unknown): SkillUsageView['latest'] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null
  const raw = value as Record<string, unknown>
  if (!isCounter(raw['turn']) || !Array.isArray(raw['names'])) return null
  return { turn: raw['turn'], names: raw['names'].filter((n): n is string => typeof n === 'string' && n.length > 0) }
}

/**
 * Narrow a raw projection value into a skill-usage view.
 *
 * @param value - the raw `unknown` snapshot of the `dshSummarySkillUsage` face.
 * @returns the validated view, or `undefined` when the capability is absent.
 */
export function readSkillUsage(value: unknown): SkillUsageView | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const raw = value as Record<string, unknown>
  // The counters and the list are the contract; their drift means the frame was
  // written by a different shape than this reader speaks.
  if (!Array.isArray(raw['session'])) return undefined
  if (!isCounter(raw['sessionTotal']) || !isCounter(raw['callTotal'])) return undefined
  const session: SkillUsageEntryView[] = []
  for (const entry of raw['session']) {
    const narrowed = readEntry(entry)
    if (narrowed !== undefined) session.push(narrowed)
  }
  return { latest: readLatest(raw['latest']), session, sessionTotal: raw['sessionTotal'], callTotal: raw['callTotal'] }
}

/**
 * Fill both placeholders of a template. `expandCount` only speaks `{count}`, and
 * this section's footer carries a second number on purpose: the capped list
 * needs the truthful distinct total next to the load count.
 *
 * @param template - a locale string carrying `{count}` and/or `{total}`.
 * @param count - the `{count}` value.
 * @param total - the `{total}` value.
 * @returns the filled string.
 */
export function expandPair(template: string, count: number, total: number): string {
  return template.replace('{count}', String(count)).replace('{total}', String(total))
}
