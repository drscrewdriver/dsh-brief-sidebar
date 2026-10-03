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
 *
 * 分层:活跃文件(本回合 latest)直接列表;全会话更早改动折叠在开关行后面
 * (与活跃文件按归一化路径去重),展开后是与活跃区相同的可点击文件行。
 * @param props - translation, client context, session scope.
 */
export declare function DeliverablesSection(props: DeliverablesSectionProps): ReactNode;
