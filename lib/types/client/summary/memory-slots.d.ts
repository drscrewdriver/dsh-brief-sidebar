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
export declare const MEMORY_SLOTS_KEY = "memorySlots";
/** One slot of the wire view. */
export interface MemorySlotView {
    readonly id: string;
    readonly title: string;
    /** One of prime-memory's `SLOT_KINDS`: rule / todo / anchor / pointer. */
    readonly kind: string;
    /** One of prime-memory's `SLOT_STATUSES`: open / done / dropped / expired. */
    readonly status: string;
    /** 0–100; higher wins the activation competition. */
    readonly priority: number;
    /** Slot body, once prime-memory exposes it on the wire (truncated at render). */
    readonly body?: string;
    /** Reference targets, once prime-memory exposes them on the wire. */
    readonly refs?: readonly string[];
    /**
     * record_id 引用的展示解析(v0.5.0 契约:ref → `[type] 名称简述`),由
     * prime-memory 在投影帧构建时解析;路径/URL 类引用不产生条目。存在才收。
     */
    readonly refViews?: readonly SlotRefView[];
}
/** 一条 record_id 引用的展示解析(与 prime-memory 的 SlotRefView 同形)。 */
export interface SlotRefView {
    readonly ref: string;
    readonly title: string;
}
/** The whole wire view of one frame. */
export interface MemorySlotsView {
    readonly rev: number;
    readonly count: number;
    readonly openCount: number;
    readonly slots: readonly MemorySlotView[];
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
export declare function readSlots(value: unknown): MemorySlotsView | undefined;
/** The body length at which the section truncates (full text rides the title tooltip). */
export declare const BODY_TRUNCATE_AT = 120;
/**
 * One-line truncation for a slot body. Already-short bodies pass through;
 * longer ones are cut at the limit with an ellipsis.
 */
export declare function truncateBody(body: string, limit?: number): string;
