/**
 * The `dshSummaryDeliverables` projection — reading and classifying it.
 *
 * The Host computes this projection (this plugin's own node half registers the
 * unit) and pushes finished whole values; the client never folds it. This
 * module is the read side of that contract and is deliberately PURE — no
 * React, no context, no IO — so the narrowing and the codeplan classification
 * can be tested directly.
 */
import type { DeliverablesView } from '../../projection/keys';
/**
 * Narrow a raw projection value into a deliverables view.
 *
 * Two outcomes are kept apart on purpose, mirroring the store's contract:
 * - `undefined` — the capability is ABSENT (the host half never registered —
 *   e.g. an older composition — or no frame carried the key yet);
 * - a view — the projection is live. A view with `latest: null` and
 *   `sessionTotal: 0` IS the empty state; the fold starts publishing as soon
 *   as the unit registers, so "present but empty" is a real value here, not a
 *   sentinel.
 *
 * @param value - the raw `unknown` snapshot of the deliverables face.
 * @returns the validated view, or `undefined` when the capability is absent.
 */
export declare function readDeliverables(value: unknown): DeliverablesView | undefined;
/** Whether a produced path is a codeplan artifact. */
export declare function isCodeplanPath(path: string): boolean;
/**
 * Split a codeplan path into its task name and file name.
 *
 * @param path - a produced path; need not actually be a codeplan artifact.
 * @returns task and file names, or `null` when the path is not under the
 *   codeplan plans directory (or names no file beneath the task folder).
 */
export declare function splitCodeplanPath(path: string): {
    task: string;
    file: string;
} | null;
/** The final path segment, under either separator. */
export declare function basename(path: string): string;
