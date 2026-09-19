/**
 * The `dshSummaryDeliverables` projection — reading and classifying it.
 *
 * The Host computes this projection (this plugin's own node half registers the
 * unit) and pushes finished whole values; the client never folds it. This
 * module is the read side of that contract and is deliberately PURE — no
 * React, no context, no IO — so the narrowing and the codeplan classification
 * can be tested directly.
 */
import type { DeliverablesView } from '../../projection/keys'

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
export function readDeliverables(value: unknown): DeliverablesView | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const raw = value as { latest?: unknown; sessionPaths?: unknown; sessionTotal?: unknown }
  if (raw.latest === undefined || raw.sessionPaths === undefined || raw.sessionTotal === undefined) {
    return undefined
  }
  if (!isBucket(raw.latest) || !Array.isArray(raw.sessionPaths) || typeof raw.sessionTotal !== 'number') {
    return undefined
  }
  const paths = raw.sessionPaths.filter((path): path is string => typeof path === 'string')
  return {
    latest: raw.latest === null ? null : { turn: raw.latest.turn, paths: raw.latest.paths },
    sessionPaths: paths,
    sessionTotal: raw.sessionTotal,
  }
}

/** Whether a value is a well-formed latest-turn bucket (or explicitly null). */
function isBucket(value: unknown): value is { turn: number; paths: readonly string[] } | null {
  if (value === null) return true
  if (typeof value !== 'object') return false
  const bucket = value as { turn?: unknown; paths?: unknown }
  return typeof bucket.turn === 'number' && Array.isArray(bucket.paths)
}

/**
 * The path prefix that identifies a codeplan artifact. The codeplan skill
 * writes its four fixed artifacts under `$workspace\.agents\plans\<任务名>\`;
 * produced paths may spell the separators either way.
 */
const CODEPLAN_SEGMENT = '.agents/plans/'

/**
 * Normalize path separators so one spelling of the codeplan prefix matches.
 * Only classification uses this; the displayed path keeps the tool's exact
 * spelling.
 */
function normalized(path: string): string {
  return path.replaceAll('\\', '/')
}

/** Whether a produced path is a codeplan artifact. */
export function isCodeplanPath(path: string): boolean {
  return normalized(path).includes(CODEPLAN_SEGMENT)
}

/**
 * Split a codeplan path into its task name and file name.
 *
 * @param path - a produced path; need not actually be a codeplan artifact.
 * @returns task and file names, or `null` when the path is not under the
 *   codeplan plans directory (or names no file beneath the task folder).
 */
export function splitCodeplanPath(path: string): { task: string; file: string } | null {
  const marker = normalized(path).indexOf(CODEPLAN_SEGMENT)
  if (marker < 0) return null
  const rest = normalized(path).slice(marker + CODEPLAN_SEGMENT.length)
  const slash = rest.indexOf('/')
  if (slash <= 0 || slash === rest.length - 1) return null
  return { task: rest.slice(0, slash), file: rest.slice(slash + 1) }
}

/** The final path segment, under either separator. */
export function basename(path: string): string {
  const normalizedPath = normalized(path)
  const slash = normalizedPath.lastIndexOf('/')
  return slash < 0 ? normalizedPath : normalizedPath.slice(slash + 1)
}
