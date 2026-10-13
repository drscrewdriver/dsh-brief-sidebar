/**
 * The `memoryRecall` projection — reading it.
 *
 * The projection unit is registered by `dsh-prime-memory` (key `memoryRecall`,
 * wire view `{rev, sessionId, count, items[]}`): the memories this session has
 * actually injected. Unlike
 * `memorySlots` (pinned, resident conventions written by hand), this set is
 * NOT resident — it is the at-a-glance answer to "what did the model see".
 * It survives compaction on purpose: `compact` only marks the entries whose
 * text left the context as `superseded` (and `/clear` empties the set), so a
 * retired row keeps its strike-through instead of vanishing.
 *
 * This plugin does NOT depend on prime-memory: with the unit unregistered the
 * client reads `undefined` from the face and the section hides. The module is
 * deliberately PURE — no React, no context, no IO — so the narrowing is
 * testable directly, exactly like `memory-slots.ts`.
 */
/** The projection key `dsh-prime-memory` registers (its canonical constant). */
export declare const MEMORY_RECALL_KEY = "memoryRecall";
/** One recalled memory of the wire view. */
export interface MemoryRecallItem {
    readonly id: string;
    /** prime-memory's memory type: work_fact / work_method / episodic / … */
    readonly type: string;
    /** First line of the record body (prime-memory truncates for the wire). */
    readonly title: string;
    /** 0–100, the record's own priority. */
    readonly priority: number;
    /** "When should this surface" phrases, once prime-memory exposes them. */
    readonly scenario?: readonly string[];
    /**
     * The last mark a HUMAN put on this record: `-1` (declared obsolete) or
     * `0..5` (relevance). Absent means never rated — which is NOT the same as
     * a zero. prime-memory publishes it on the `memoryRecall` view so the row
     * can show the existing mark without a second round-trip.
     */
    readonly rating?: number;
    /**
     * The record body, whitespace-trimmed and capped by prime-memory. The hover
     * bubble reads it straight off the frame — no second round-trip. Absent on
     * frames published before that field existed, so the row falls back to
     * `title` and the bubble says it has no body.
     */
    readonly body?: string;
    /**
     * prime-memory says this record has been retired (soft-deleted). It stays in
     * the list because its text is still part of what the model saw — and because
     * the retirement is the human's verdict; the row just draws a strike-through.
     * Absent means alive.
     */
    readonly retired?: boolean;
    /**
     * The text of this recall has been replaced by a compaction summary, so it is
     * no longer in the model's context. Orthogonal to `retired` (both can be set).
     * The section hides these by default and reports the count in its footer;
     * a retired row is the exception and stays visible. Absent means still in context.
     */
    readonly superseded?: boolean;
}
/** The whole wire view of one frame. */
export interface MemoryRecallView {
    readonly rev: number;
    readonly sessionId: string;
    /** Total recalled-and-alive count; `items` may be a capped prefix of it. */
    readonly count: number;
    /** Most recently injected first. */
    readonly items: readonly MemoryRecallItem[];
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
export declare function readRecall(value: unknown): MemoryRecallView | undefined;
