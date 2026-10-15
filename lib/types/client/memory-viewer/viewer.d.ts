import type { ReactNode } from 'react';
import type { Context } from '@deepseek-ai/cordis';
interface Props {
    ctx: Context;
    memoryId: string;
    scope: {
        sessionId?: string;
    };
}
export declare function MemoryViewer(props: Props): ReactNode;
export {};
