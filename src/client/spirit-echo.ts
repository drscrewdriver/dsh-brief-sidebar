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
export const SPIRIT_ECHO_KEY = 'spiritEcho'

/** One recalled passage as the projection publishes it. */
export interface SpiritEchoSegment {
  /** The recalled passage itself (already truncated by spirit). */
  readonly excerpt: string
  /** First time this session recalled it (ms). */
  readonly firstTs: number
  /** Most recent recall (ms). */
  readonly lastTs: number
  /** Recall count within this session. */
  readonly times: number
}

/** One referent of an echo entry (spirit v0.8.7): the memory item it points at. */
export interface SpiritEchoRef {
  readonly kind: string
  readonly id: string
  readonly label: string
}

/** The latest pre-step decision (answers "why no card this round"). */
export interface SpiritEchoStep {
  /** Entry id (`echo-<ts>`); the viewer fetches the original card by it. */
  readonly id: string
  readonly at: number
  readonly kind: 'injected' | 'skipped'
  readonly reason: string
  /** One-line summary of the injected card (`''` for skipped rows). */
  readonly preview: string
  /**
   * Content-first title (spirit frame v5+): e.g. the thread task name
   * `plugin-9lang-five-dim`. Absent on older frames ⇒ fall back to `preview`.
   */
  readonly title?: string
  /** The memory items this echo points at (memid), for entry/graph jumps. */
  readonly refs?: readonly SpiritEchoRef[]
}

/** One recalled **record** (spirit frame v7): `echoId = echo-<uuid>` belongs to the record itself. */
export interface SpiritEchoRecordRow {
  readonly echoId: string
  readonly sessionId: string
  readonly kind: string
  readonly memId: string
  readonly title: string
  readonly times: number
  /** The record's own timestamp (shown as "记录时间"). */
  readonly recordTs: number
  readonly firstTs: number
  readonly lastTs: number
  /** Latest recall event id (`recall-<uuid>`). */
  readonly lastRecallId: string
}

/** Old alias (one release). */
export type SpiritEchoRefRow = SpiritEchoRecordRow

/** One recall event (v7): `recall-<uuid>`, one per injection round. */
export interface SpiritEchoRecall {
  readonly recallId: string
  readonly at: number
  readonly flashback: boolean
}

/** Tone/state (special format, not a reference). */
export interface SpiritEchoTone {
  readonly at: number
  readonly state?: string
  readonly opening?: string
}

/** The whole wire view of one frame. */
export interface SpiritEchoView {
  /** DB-derived token; changes whenever this session's echo store changes. */
  readonly token: number
  /** Distinct recalled passages in this session. */
  readonly total: number
  /** This session's recalled passages, newest first, ≤20. */
  readonly segments: readonly SpiritEchoSegment[]
  /** This session's recent echo entries (injected/skipped), newest first, ≤5. */
  readonly steps: readonly SpiritEchoStep[]
  readonly lastStep?: SpiritEchoStep
  /** Recalled records (v7 main data): one row per record (echo-<uuid>). */
  readonly records?: readonly SpiritEchoRecordRow[]
  /** Old alias (same content as records). */
  readonly refs?: readonly SpiritEchoRecordRow[]
  /** Latest recall event (recall-<uuid>). */
  readonly recall?: SpiritEchoRecall
  /** Tone/state (special format). */
  readonly tone?: SpiritEchoTone
}

/**
 * Narrow a raw projection value into an echo view.
 *
 * @param value - the raw `unknown` snapshot of the `spiritEcho` face.
 * @returns the validated view, or `undefined` when the capability is absent.
 */
export function readSpiritEcho(value: unknown): SpiritEchoView | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const raw = value as Record<string, unknown>
  if (!isCounter(raw['token']) || !isCounter(raw['total'])) return undefined
  if (!Array.isArray(raw['segments'])) return undefined
  const segments: SpiritEchoSegment[] = []
  for (const entry of raw['segments']) {
    const segment = readSegment(entry)
    if (segment !== undefined) segments.push(segment)
  }
  const step = readStep(raw['lastStep'])
  const steps: SpiritEchoStep[] = []
  if (Array.isArray(raw['steps'])) {
    for (const entry of raw['steps']) {
      const row = readStep(entry)
      if (row !== undefined) steps.push(row)
    }
  }
  const records: SpiritEchoRecordRow[] = []
  for (const source of [raw['records'], raw['refs']]) {
    if (!Array.isArray(source)) continue
    for (const entry of source) {
      const row = readRecord(entry)
      if (row !== undefined && !records.some((item) => item.echoId === row.echoId && item.sessionId === row.sessionId)) records.push(row)
    }
  }
  const recall = readRecall(raw['recall'])
  const tone = readTone(raw['tone'])
  return {
    token: raw['token'],
    total: raw['total'],
    segments,
    steps,
    ...(step === undefined ? {} : { lastStep: step }),
    ...(records.length === 0 ? {} : { records, refs: records }),
    ...(recall === undefined ? {} : { recall }),
    ...(tone === undefined ? {} : { tone }),
  };
}

/** Whether a value is a non-negative safe integer (the view's counter shape). */
function isCounter(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

/** Narrow one record; `undefined` = malformed, dropped (old frames lack it). */
function readRecord(value: unknown): SpiritEchoRecordRow | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const raw = value as Record<string, unknown>
  // v7: echoId + lastRecallId；v6: refId + lastEchoStepId
  const echoId = typeof raw['echoId'] === 'string' && raw['echoId'] !== ''
    ? raw['echoId']
    : typeof raw['refId'] === 'string' ? raw['refId'] : ''
  if (echoId === '') return undefined
  if (typeof raw['kind'] !== 'string' || raw['kind'] === '') return undefined
  if (typeof raw['memId'] !== 'string' || raw['memId'] === '') return undefined
  if (!isCounter(raw['times']) || !isCounter(raw['firstTs']) || !isCounter(raw['lastTs'])) return undefined
  const recordTs = isCounter(raw['recordTs']) ? raw['recordTs'] : raw['firstTs']
  const lastRecallId = typeof raw['lastRecallId'] === 'string'
    ? raw['lastRecallId']
    : typeof raw['lastEchoStepId'] === 'string' ? raw['lastEchoStepId'] : ''
  return {
    echoId,
    sessionId: typeof raw['sessionId'] === 'string' ? raw['sessionId'] : '',
    kind: raw['kind'],
    memId: raw['memId'],
    title: typeof raw['title'] === 'string' ? raw['title'] : '',
    times: raw['times'],
    recordTs,
    firstTs: raw['firstTs'],
    lastTs: raw['lastTs'],
    lastRecallId,
  }
}

/** Narrow the optional recall event row. */
function readRecall(value: unknown): SpiritEchoRecall | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const raw = value as Record<string, unknown>
  if (typeof raw['recallId'] !== 'string' || raw['recallId'] === '') return undefined
  if (!isCounter(raw['at'])) return undefined
  return { recallId: raw['recallId'], at: raw['at'], flashback: raw['flashback'] === true }
}

/** Narrow the optional tone row (special format; absent on old frames). */
function readTone(value: unknown): SpiritEchoTone | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const raw = value as Record<string, unknown>
  if (!isCounter(raw['at'])) return undefined
  const state = typeof raw['state'] === 'string' && raw['state'] !== '' ? raw['state'] : undefined
  const opening = typeof raw['opening'] === 'string' && raw['opening'] !== '' ? raw['opening'] : undefined
  if (state === undefined && opening === undefined) return undefined
  return { at: raw['at'], ...(state === undefined ? {} : { state }), ...(opening === undefined ? {} : { opening }) }
}

/** Narrow one recalled passage; `undefined` = malformed, dropped. */
function readSegment(value: unknown): SpiritEchoSegment | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const raw = value as Record<string, unknown>
  if (typeof raw['excerpt'] !== 'string' || raw['excerpt'] === '') return undefined
  if (!isCounter(raw['firstTs']) || !isCounter(raw['lastTs']) || !isCounter(raw['times'])) return undefined
  return {
    excerpt: raw['excerpt'],
    firstTs: raw['firstTs'],
    lastTs: raw['lastTs'],
    times: raw['times'],
  }
}

/** Narrow the optional last-step row. */
function readStep(value: unknown): SpiritEchoStep | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const raw = value as Record<string, unknown>
  if (!isCounter(raw['at'])) return undefined
  if (raw['kind'] !== 'injected' && raw['kind'] !== 'skipped') return undefined
  if (typeof raw['reason'] !== 'string') return undefined
  // 编号缺席时按 `echo-<ts>` 兜底：老帧没有 id 也能打开原文（查不到就是查不到）。
  const id = typeof raw['id'] === 'string' && raw['id'] !== '' ? raw['id'] : `echo-${raw['at']}`
  const refs: SpiritEchoRef[] = []
  if (Array.isArray(raw['refs'])) {
    for (const entry of raw['refs']) {
      if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) continue
      const ref = entry as Record<string, unknown>
      if (typeof ref['kind'] !== 'string' || ref['kind'] === '') continue
      if (typeof ref['id'] !== 'string' || ref['id'] === '') continue
      refs.push({ kind: ref['kind'], id: ref['id'], label: typeof ref['label'] === 'string' ? ref['label'] : '' })
    }
  }
  return {
    id,
    at: raw['at'],
    kind: raw['kind'],
    reason: raw['reason'],
    preview: typeof raw['preview'] === 'string' ? raw['preview'] : '',
    ...(typeof raw['title'] === 'string' && raw['title'] !== '' ? { title: raw['title'] } : {}),
    ...(refs.length === 0 ? {} : { refs }),
  }
}
