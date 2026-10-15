/**
 * Module-level reference to the better-sidebar service, set during client apply.
 * This avoids the strict-proxy denial on ctx.get('betterSidebar') from deep
 * component callbacks (MemorySlotsSection / MemoryRecallSection).
 */
export interface OpenTabSeed {
  type: string
  title?: string
  path?: string
}

let _openTab: ((seed: OpenTabSeed) => void) | undefined

/** Set by apply() once the better-sidebar service is available. */
export function setOpenTab(fn: (seed: OpenTabSeed) => void): void {
  _openTab = fn
}

/** Open a memory viewer tab by memoryId. No-op if the service is absent. */
export function openMemoryTab(memoryId: string): void {
  _openTab?.({ type: 'dsh-md-memory-viewer:memory', path: memoryId, title: memoryId.slice(0, 16) })
}
