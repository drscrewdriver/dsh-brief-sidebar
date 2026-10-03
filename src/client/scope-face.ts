/**
 * Structural views of the `configForms` settings seam (DSH 0.1.7+).
 *
 * The settings card and the memory-section gate consume only these members of
 * the `ConfigForm` handle that `configForms.get(entryId)` returns, so the real
 * `@deepseek-ai/dsh-client-ui-settings/client` type graph is never imported —
 * the same reason `use-projection.ts` declares its own session faces and
 * `dock-shadow.tsx` its own slots face.
 *
 * `configForms` serves the STORED doc: a `.volatile()` field arrives as a
 * plain value here (the host unwraps the live refs before persistence), so
 * the client reads a plain config shape.
 */

/** One snapshot of an entry's stored config. */
export interface SettingsScopeSnapshot<T> {
  status: 'loading' | 'ready' | 'unavailable'
  value: T | undefined
  revision: number | undefined
  /** Whether the current face may write (a read-only seat disables the controls). */
  writable: boolean
}

/** The `ConfigForm` handle face this plugin uses. */
export interface SettingsScope<T> {
  getSnapshot(): SettingsScopeSnapshot<T>
  subscribe(listener: () => void): () => void
  set(field: string, value: unknown): Promise<boolean>
  unset(field: string): Promise<boolean>
}

/** Structural view of the `configForms` cordis service, keyed by entry id. */
export interface ConfigFormsLike {
  get<T>(entryId: string): SettingsScope<T>
}

/**
 * This plugin's entry config, as the client reads it. Only the fields the
 * browser half consumes are declared; the schema (node half `Config`) owns
 * the full surface.
 */
export interface BriefClientConfig {
  /** Whether the summary tab renders the memory-slots section (default: on). */
  showMemorySlots?: boolean
}

/**
 * The switch's default. Applies wherever the config face cannot answer:
 * `configForms` absent, the scope not `ready`, or the field unset. The
 * section still only appears when the `memorySlots` projection exists, so
 * "default on" cannot paint anything on a host without prime-memory.
 */
export const DEFAULT_SHOW_MEMORY_SLOTS = true

/**
 * Resolve the switch from one snapshot (pure; testable). Any
 * cannot-answer shape falls back to {@link DEFAULT_SHOW_MEMORY_SLOTS}; an
 * explicit `false` is the only off.
 */
export function resolveShowMemorySlots(
  snapshot: SettingsScopeSnapshot<BriefClientConfig> | undefined,
): boolean {
  if (snapshot === undefined || snapshot.status !== 'ready') return DEFAULT_SHOW_MEMORY_SLOTS
  return snapshot.value?.showMemorySlots !== false
}
