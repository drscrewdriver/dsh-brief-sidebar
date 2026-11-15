/**
 * The `spiritEcho` projection — reading it.
 *
 * Registered by `dsh-spirit` (key `spiritEcho`). Since spirit 0.8.3 the wire view is
 * `{token, total, segments, lastStep?}` and its source is spirit's `echo_recall` table,
 * so what rides this face is **this session's recalled echo passages** — and they
 * survive a restart (that is the whole point of moving off the in-process buffer).
 *
 * Two outcomes stay apart, mirroring the memory-slots reader:
 * - `undefined` — capability ABSENT (spirit not composed, or a shape drift bad enough
 *   that rendering it would lie);
 * - a view — `segments: []` IS the empty state (a fresh session simply has no recall yet).
 *
 * Malformed rows are dropped rather than thrown on: this is a trusted-Host value
 * rendered defensively. The excerpt is already capped by spirit (≤240 chars).
 */
/** The projection key `dsh-spirit` registers (its canonical constant). */
export declare const SPIRIT_ECHO_KEY = "spiritEcho";
/** One recalled passage as the projection publishes it. */
export interface SpiritEchoSegment {
    /** The recalled passage itself (already truncated by spirit). */
    readonly excerpt: string;
    /** First time this session recalled it (ms). */
    readonly firstTs: number;
    /** Most recent recall (ms). */
    readonly lastTs: number;
    /** Recall count within this session. */
    readonly times: number;
}
/** One referent of an echo entry (spirit v0.8.7): the memory item it points at. */
export interface SpiritEchoRef {
    readonly kind: string;
    readonly id: string;
    readonly label: string;
}
/** The latest pre-step decision (answers "why no card this round"). */
export interface SpiritEchoStep {
    /** Entry id (`echo-<ts>`); the viewer fetches the original card by it. */
    readonly id: string;
    readonly at: number;
    readonly kind: 'injected' | 'skipped';
    readonly reason: string;
    /** One-line summary of the injected card (`''` for skipped rows). */
    readonly preview: string;
    /**
     * Content-first title (spirit frame v5+): e.g. the thread task name
     * `plugin-9lang-five-dim`. Absent on older frames ⇒ fall back to `preview`.
     */
    readonly title?: string;
    /** The memory items this echo points at (memid), for entry/graph jumps. */
    readonly refs?: readonly SpiritEchoRef[];
}
/** One recalled **record** (spirit frame v7): `echoId = echo-<uuid>` belongs to the record itself. */
export interface SpiritEchoRecordRow {
    readonly echoId: string;
    readonly sessionId: string;
    readonly kind: string;
    readonly memId: string;
    readonly title: string;
    readonly times: number;
    /** The record's own timestamp (shown as "记录时间"). */
    readonly recordTs: number;
    readonly firstTs: number;
    readonly lastTs: number;
    /** Latest recall event id (`recall-<uuid>`). */
    readonly lastRecallId: string;
}
/** Old alias (one release). */
export type SpiritEchoRefRow = SpiritEchoRecordRow;
/** One recall event (v7): `recall-<uuid>`, one per injection round. */
export interface SpiritEchoRecall {
    readonly recallId: string;
    readonly at: number;
    readonly flashback: boolean;
}
/** Tone/state (special format, not a reference). */
export interface SpiritEchoTone {
    readonly at: number;
    readonly state?: string;
    readonly opening?: string;
}
/** The whole wire view of one frame. */
export interface SpiritEchoView {
    /** DB-derived token; changes whenever this session's echo store changes. */
    readonly token: number;
    /** Distinct recalled passages in this session. */
    readonly total: number;
    /** This session's recalled passages, newest first, ≤20. */
    readonly segments: readonly SpiritEchoSegment[];
    /** This session's recent echo entries (injected/skipped), newest first, ≤5. */
    readonly steps: readonly SpiritEchoStep[];
    readonly lastStep?: SpiritEchoStep;
    /** Recalled records (v7 main data): one row per record (echo-<uuid>). */
    readonly records?: readonly SpiritEchoRecordRow[];
    /** Old alias (same content as records). */
    readonly refs?: readonly SpiritEchoRecordRow[];
    /** Latest recall event (recall-<uuid>). */
    readonly recall?: SpiritEchoRecall;
    /** Tone/state (special format). */
    readonly tone?: SpiritEchoTone;
}
/**
 * Narrow a raw projection value into an echo view.
 *
 * @param value - the raw `unknown` snapshot of the `spiritEcho` face.
 * @returns the validated view, or `undefined` when the capability is absent.
 */
export declare function readSpiritEcho(value: unknown): SpiritEchoView | undefined;
