import type { ReactNode } from 'react';
import type { CtxProbe } from '../use-projection';
import type { FeedbackFetch } from './recall-feedback';
export interface ReferenceSectionProps {
    /** The DSH locale lookup, passed down from `apply`. */
    t: (key: string) => string;
    /** The client root context (the tab body's only way to reach services). */
    ctx?: CtxProbe;
    /** The session this tab is scoped to. */
    scope?: {
        readonly sessionId?: string;
    };
    /** The rating transport, handed straight to the recall pane. */
    fetchImpl?: FeedbackFetch;
}
/** Which pane is showing. Three values, no fourth tab by design. */
export type ReferenceTab = 'skills' | 'memory' | 'search';
/**
 * The references section. All hooks run before any early return, so the tab
 * strip can disappear (no capability at all) without ever changing hook order.
 *
 * @param props - translation, client context, session scope, rating transport.
 */
export declare function ReferenceSection(props: ReferenceSectionProps): ReactNode;
