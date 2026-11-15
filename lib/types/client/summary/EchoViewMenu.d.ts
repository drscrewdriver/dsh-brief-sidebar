import type { ReactNode } from 'react';
export interface EchoViewMenuProps {
    /** The DSH locale lookup, passed down from `apply`. */
    t: (key: string) => string;
    /** The session the row belongs to (the viewer tab needs it). */
    sessionId?: string;
    /** The echo id this row points at; absent = section-level menu. */
    echoId?: string;
    /** Trigger copy; defaults to `echo.viewMenu` + caret. */
    label?: string;
}
/**
 * The echo row menu. All hooks run before any conditional rendering.
 * @param props - translation, session scope, row id.
 */
export declare function EchoViewMenu(props: EchoViewMenuProps): ReactNode;
