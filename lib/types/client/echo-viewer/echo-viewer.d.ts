import type { ReactNode } from 'react';
/** `path` = `<sessionId>|<echoId>`；任何一半缺失都不发请求。 */
export declare function splitEchoPath(path: string | undefined): {
    sessionId: string;
    id: string;
};
export interface EchoViewerProps {
    tab?: {
        path?: string;
    };
    t?: (key: string) => string;
    /** The tab seat hands the client context down; the viewer reads nothing from it today. */
    ctx?: unknown;
}
/**
 * The echo viewer body.
 * @param props - the better-sidebar tab seat (path carries sessionId|id).
 */
export declare function EchoViewer(props: EchoViewerProps): ReactNode;
