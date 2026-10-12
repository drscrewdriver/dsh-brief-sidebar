import type { ReactNode } from 'react';
import type { Context } from '@deepseek-ai/cordis';
import type { FeedbackFetch, FeedbackScore } from './recall-feedback';
export interface MemoryRecallSectionProps {
    /** The DSH locale lookup, passed down from `apply`. */
    t: (key: string) => string;
    /** The client root context (the tab body's only way to reach services). */
    ctx?: Context;
    /** The session this tab is scoped to. */
    scope?: {
        readonly sessionId?: string;
    };
    /**
     * The transport for rating. Defaults to the page's `fetch`; injectable so the
     * click path is testable without a browser.
     */
    fetchImpl?: FeedbackFetch;
}
/**
 * The rating strip of one selected row: `-1` (two-step) plus `0..5`.
 *
 * Exported for tests — the section itself only mounts it for the selected row,
 * and a static render never has one selected.
 *
 * **Every click here must stop propagating.** The strip lives INSIDE the row,
 * and the row's own `onClick` toggles the selection — so an un-stopped click
 * deselects the row, this strip unmounts mid-gesture, and the `-1` button's
 * armed "确认退场？" state is rendered on a node that is already gone. That is
 * the whole "按了没反应、也没有删除线" report: the request was never sent, the
 * confirmation was never shown, the control simply vanished on the first press.
 * @param props - labels, current mark, and the click handlers.
 */
export declare function RatingStrip(props: {
    current: number | undefined;
    pending: boolean;
    armed: boolean;
    obsoleteLabel: string;
    confirmLabel: string;
    whyLabel: string;
    onScore(score: FeedbackScore): void;
}): ReactNode;
/**
 * The session-recall section. All hooks run unconditionally (a conditional hook
 * order would break the moment the switch flips); the gates only decide whether
 * the resolved view paints and whether rows are clickable.
 * @param props - translation, client context, session scope, transport.
 */
export declare function MemoryRecallSection(props: MemoryRecallSectionProps): ReactNode;
