import type { JSX } from 'react';
/** 账本条目（id/order/label，label 已解析成字符串）。 */
export interface FamilyTabEntry {
    id: string;
    order: number;
    label: string;
}
/** 只用到槽门面的这几件事，避免与 index.tsx 的类型互相拖累。 */
export interface FamilyHostSlots {
    inject: (name: string, factory: () => unknown) => unknown;
    register: (options: Record<string, unknown>, component: unknown) => unknown;
    entries: (name: string) => readonly Record<string, unknown>[];
    subscribe?: (name: string, fn: () => void) => () => void;
}
/**
 * 接管分级——唯一真源是 `mine-dsh-plugins/_tools/family-rank.mjs`（离线实测 GitHub
 * star + npm 周下载量加权）。延迟 = BASE + RANK * STEP；rank 越大越靠后兜底。
 */
export declare const FAMILY_CLAIM_RANK = 6;
/** 派生而非硬编码：改 rank 表就自动改时刻。 */
export declare const FAMILY_CLAIM_DELAY_MS: number;
type HostObservable<T> = {
    getSnapshot(): T;
    subscribe(listener: () => void): () => void;
};
export interface FamilyHostSectionProps {
    renderSlot?: (key: 'dsh-family.tab', owner?: object, opts?: {
        only?: string;
        fallback?: JSX.Element | null;
    }) => JSX.Element | null;
    useTabs?: <S>(selector: (value: readonly FamilyTabEntry[]) => S) => S;
    hooks?: {
        tabs: HostObservable<readonly FamilyTabEntry[]>;
    };
    renderContributor?: (id: string) => JSX.Element | null;
}
/** 通用容器渲染：按 order 依次画出账本里每张贡献卡，不含任何"本插件特例"。 */
export declare function FamilyHostSection(props: FamilyHostSectionProps): JSX.Element;
/** 把账本条目投影成标题行：label 可能是函数，抛错退化成 id，绝不带崩整节。 */
export declare function projectLedger(slots: FamilyHostSlots): readonly FamilyTabEntry[];
/**
 * 若到点仍无人声明子席位，则自己接管容器。
 * @param slots - 客户端槽门面。
 * @param isHeld - 探针：本插件的 tab 工厂是否已被执行（= 有人声明了子席位）。
 * @param label - 导航标题；家族共享节的标题，不是本插件名。
 * @param log - console 前缀（带插件名）。
 * @returns 取消定时器与撤销接管注册的 disposer。
 */
export declare function claimFamilyHostIfOrphaned(slots: FamilyHostSlots, isHeld: () => boolean, label: () => string, log: string): () => void;
export {};
