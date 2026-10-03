import type { ReactNode } from 'react';
import type { Context } from '@deepseek-ai/cordis';
export interface MemorySlotsSectionProps {
    /** The DSH locale lookup, passed down from `apply`. */
    t: (key: string) => string;
    /** The client root context (the tab body's only way to reach services). */
    ctx?: Context;
    /** The session this tab is scoped to. */
    scope?: {
        readonly sessionId?: string;
    };
}
/**
 * Subscribe to this plugin's entry config and resolve the section switch.
 *
 * The scope is resolved defensively (a host without `configForms` degrades to
 * the default instead of throwing inside a render) and subscribed with
 * `useSyncExternalStore`, so flipping the switch in settings updates the open
 * tab without a reload.
 *
 * @param ctx - the client root context handed to the tab body.
 * @returns whether the memory-slots section may render at all.
 */
export declare function useShowMemorySlots(ctx: Context | undefined): boolean;
/**
 * The memory-slots section. Both hooks run unconditionally (a conditional
 * hook order would break the moment the switch flips); the switch only
 * decides whether the resolved view paints.
 * @param props - translation, client context, session scope.
 */
export declare function MemorySlotsSection(props: MemorySlotsSectionProps): ReactNode;
