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
