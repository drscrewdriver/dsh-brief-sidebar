import type { ReactNode } from 'react';
/**
 * A counted group title. Renders nothing when the group is empty — an empty
 * "活跃召回 · 0" line would ask the reader to explain a heading rather than read
 * a fact.
 * @param props - already-interpolated text, plus an optional DOM marker.
 */
export declare function GroupHeader(props: {
    text: string;
    marker?: string;
}): ReactNode;
/**
 * The fold switch. `marker` is what tests (and the browser probe) click, so it
 * belongs to the component rather than to either caller's markup.
 * @param props - label, current state, DOM marker, click handler.
 */
export declare function FoldToggle(props: {
    label: string;
    open: boolean;
    marker: string;
    onToggle(): void;
}): ReactNode;
/** A quiet caption under a group, used for the "the list is capped" note. */
export declare function GroupCaption(props: {
    text: string;
    marker: string;
}): ReactNode;
