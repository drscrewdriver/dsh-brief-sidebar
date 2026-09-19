import type { ReactNode } from 'react';
import type { Context } from '@deepseek-ai/cordis';
export interface DeliverablesSectionProps {
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
 * The deliverables section. The subscription is unconditional (a plain
 * listener, not IO).
 * @param props - translation, client context, session scope.
 */
export declare function DeliverablesSection(props: DeliverablesSectionProps): ReactNode;
