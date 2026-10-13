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
import { SKILL_USAGE_KEY } from '../../projection/keys';
import type { SkillUsageView } from '../../projection/keys';
/** The key this plugin's client half subscribes to (re-exported for callers). */
export { SKILL_USAGE_KEY };
/**
 * Narrow a raw projection value into a skill-usage view.
 *
 * @param value - the raw `unknown` snapshot of the `dshSummarySkillUsage` face.
 * @returns the validated view, or `undefined` when the capability is absent.
 */
export declare function readSkillUsage(value: unknown): SkillUsageView | undefined;
/**
 * The available list minus the names already shown as referenced.
 *
 * One skill must not occupy a row in both groups: the reference row is the
 * stronger fact, and a duplicate under "available" would read as "the model
 * had a choice it didn't make".
 *
 * @param available - the session's current catalog names, in catalog order.
 * @param referenced - names the fold counted as loaded or invoked.
 * @returns the remaining catalog names, order preserved.
 */
export declare function availableExcept(available: readonly string[], referenced: readonly string[]): string[];
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
export declare function expandPair(template: string, count: number, total: number): string;
