import type { ReactNode } from 'react';
import type { CtxProbe } from '../use-projection';
export interface SpiritEchoSectionProps {
    /** The DSH locale lookup, passed down from `apply`. */
    t: (key: string) => string;
    /** The client root context (the tab body's only way to reach services). */
    ctx?: CtxProbe;
    /** The session this tab is scoped to. */
    scope?: {
        readonly sessionId?: string;
    };
    /** True when the section is rendered inside a tab that already names it (引用 → 回响). */
    hideHeader?: boolean;
}
/**
 * The echo section. The hook runs unconditionally so the absent case never
 * changes hook order.
 * @param props - translation, client context, session scope.
 */
export declare function SpiritEchoSection(props: SpiritEchoSectionProps): ReactNode;
