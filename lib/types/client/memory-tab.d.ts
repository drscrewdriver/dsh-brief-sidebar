/**
 * Module-level reference to the better-sidebar service, set during client apply.
 * This avoids the strict-proxy denial on ctx.get('betterSidebar') from deep
 * component callbacks (MemorySlotsSection / MemoryRecallSection).
 */
export interface OpenTabSeed {
    type: string;
    title?: string;
    path?: string;
}
/** Set by apply() once the better-sidebar service is available. */
export declare function setOpenTab(fn: (seed: OpenTabSeed) => void): void;
/** Open a memory viewer tab by memoryId. No-op if the service is absent. */
export declare function openMemoryTab(memoryId: string): void;
