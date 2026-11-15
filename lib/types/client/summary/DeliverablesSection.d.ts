import type { ReactNode } from 'react';
import type { CtxProbe } from '../use-projection';
export interface DeliverablesSectionProps {
    /** The DSH locale lookup, passed down from `apply`. */
    t: (key: string) => string;
    /** The client root context (the tab body's only way to reach services). */
    ctx?: CtxProbe;
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
 *
 * **重载语义**:重新打开一个历史会话时,`latest` 要么是空的(还没跑新回合),
 * 要么指向上一回合——两种情况下「本回合改动」都读不出东西,而历史改动全被
 * 折叠收起,整节看起来像"没有产物"。所以本回合为空时历史区**默认展开并只
 * 预览前 {@link HISTORY_PREVIEW} 条**:读者一进来就能看见这个会话改过什么,
 * 又不至于把侧栏塞满;点「还有 N 条」看全量,点折叠行收起。
 * @param props - translation, client context, session scope.
 */
export declare function DeliverablesSection(props: DeliverablesSectionProps): ReactNode;
