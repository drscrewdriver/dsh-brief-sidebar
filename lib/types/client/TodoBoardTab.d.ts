import type { ReactNode } from 'react';
import type { Context } from '@deepseek-ai/cordis';
/** The session scope better-sidebar hands a tab body. */
export interface TodoScope {
    readonly sessionId?: string;
}
export interface TodoBoardTabProps {
    /** The DSH locale lookup, passed down from `apply`. */
    t: (key: string) => string;
    /** The client root context (the tab body's only way to reach services). */
    ctx?: Context;
    /** The session this tab is scoped to. */
    scope?: TodoScope;
    /** Whether the tab is the active one AND the panel is open. */
    visible?: boolean;
}
/**
 * The task board.
 * @param props - translation, client context, session scope, visibility.
 */
export declare function TodoBoardTab(props: TodoBoardTabProps): ReactNode;
