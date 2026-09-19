import type { ReactNode } from 'react';
import type { Context } from '@deepseek-ai/cordis';
/** The session scope better-sidebar hands a tab body. */
export interface TodoScope {
    readonly sessionId?: string;
}
export interface TodoSectionProps {
    /** The DSH locale lookup, passed down from `apply`. */
    t: (key: string) => string;
    /** The client root context (the tab body's only way to reach services). */
    ctx?: Context;
    /** The session this tab is scoped to. */
    scope?: TodoScope;
}
/** Centred message block used by every non-list state. */
export declare function Notice(props: {
    title: string;
    detail?: string;
}): ReactNode;
/**
 * The progress section. The subscription is unconditional (a plain listener,
 * not IO); the three-state contract of the projection is preserved verbatim.
 * @param props - translation, client context, session scope.
 */
export declare function TodoSection(props: TodoSectionProps): ReactNode;
/**
 * Backwards-compatible alias for the pre-summary export name. The component
 * no longer owns the full-height shell — that moved to `SummaryTab` — so the
 * alias exists only to keep import sites honest during the transition.
 */
export declare const TodoBoardTab: typeof TodoSection;
