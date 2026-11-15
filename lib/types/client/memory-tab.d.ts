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
/** 回响原文查看器 tab 的类型（与 index.tsx 的注册串一致）。 */
export declare const ECHO_VIEWER_TAB = "dsh-md-echo-viewer:echo";
/**
 * Open the echo viewer for one echo entry.
 *
 * `path` 里同时带 sessionId 与编号（`<sessionId>|<id>`）：回响编号只在本会话内唯一，
 * 只传 id 会让“看原文”变成跨会话张冠李戴。
 */
export declare function openEchoTab(sessionId: string, id: string): void;
