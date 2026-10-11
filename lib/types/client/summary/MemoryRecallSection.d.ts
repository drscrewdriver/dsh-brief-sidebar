import type { ReactNode } from 'react';
import type { Context } from '@deepseek-ai/cordis';
export interface MemoryRecallSectionProps {
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
 * The session-recall section. Both hooks run unconditionally (a conditional
 * hook order would break the moment the switch flips); the switch only decides
 * whether the resolved view paints.
 * @param props - translation, client context, session scope.
 */
export declare function MemoryRecallSection(props: MemoryRecallSectionProps): ReactNode;
