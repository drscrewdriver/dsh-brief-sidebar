import type { ReactNode } from 'react';
import type { Context } from '@deepseek-ai/cordis';
import type { TodoScope } from './TodoBoardTab';
export interface SummaryTabProps {
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
 * The summary tab.
 * @param props - translation, client context, session scope, visibility.
 */
export declare function SummaryTab(props: SummaryTabProps): ReactNode;
