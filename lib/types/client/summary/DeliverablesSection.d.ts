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
 * 分层:本回合改动(latest)与全会话更早改动分成两组各自计数——前者直列,后者
 * 折叠在开关行后面(与活跃文件按归一化路径去重),展开后是与活跃区相同的可点击
 * 文件行。列表有上限时,开关行说折叠区条数、附注说会话真数,两个数不混为一谈。
 * @param props - translation, client context, session scope.
 */
export declare function DeliverablesSection(props: DeliverablesSectionProps): ReactNode;
