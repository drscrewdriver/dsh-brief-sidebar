import type { ReactNode } from 'react';
import type { Context } from '@deepseek-ai/cordis';
export interface SearchRefSectionProps {
    /** The DSH locale lookup, passed down from `apply`. */
    t: (key: string) => string;
    /** The client root context (the tab body's only way to reach services). */
    ctx?: Context;
    /** The session this tab is scoped to. */
    scope?: {
        readonly sessionId?: string;
    };
    /** Drop the section header (the references tab already names it). */
    hideHeader?: boolean;
}
/**
 * The search-reference section. The subscription is unconditional (a plain
 * listener, not IO); the view decides whether anything is drawn.
 *
 * @param props - translation, client context, session scope, header switch.
 */
export declare function SearchRefSection(props: SearchRefSectionProps): ReactNode;
