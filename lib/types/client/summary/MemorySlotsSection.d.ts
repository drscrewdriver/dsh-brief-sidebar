import type { ReactNode } from 'react';
import type { CtxProbe } from '../use-projection';
export interface MemorySlotsSectionProps {
    /** The DSH locale lookup, passed down from `apply`. */
    t: (key: string) => string;
    /** The client root context (the tab body's only way to reach services). */
    ctx?: CtxProbe;
    /** The session this tab is scoped to. */
    scope?: {
        readonly sessionId?: string;
    };
}
/**
 * Subscribe to this plugin's entry config and resolve the slots switch.
 * Plumbing lives in `use-config-flag`; the default (off) lives in the resolver.
 *
 * @param ctx - the client root context handed to the tab body.
 * @returns whether the memory-slots section may render at all.
 */
export declare function useShowMemorySlots(ctx: CtxProbe | undefined): boolean;
/**
 * The memory-slots section. Both hooks run unconditionally (a conditional
 * hook order would break the moment the switch flips); the switch only
 * decides whether the resolved view paints.
 * @param props - translation, client context, session scope.
 */
export declare function MemorySlotsSection(props: MemorySlotsSectionProps): ReactNode;
