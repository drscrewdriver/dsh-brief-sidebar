import type { ReactNode } from 'react';
import type { MemoryRecallItem } from './memory-recall';
/**
 * Clamp the bubble into the viewport.
 *
 * It opens to the **left** of the row on purpose. The sidebar is right-docked
 * and only a few hundred pixels wide, so the old "anchor + 8" placement dropped
 * the box straight onto the row it came from — covering that row's rating strip
 * (the bubble is click-transparent, so the buttons stayed clickable *under* it:
 * blind-clicking a score is not an option). Opening left puts the text over the
 * chat area and leaves the whole list readable.
 *
 * Order of preference: left of the row → right of the row (only when the row
 * sits so far left that the box would run off the window) → clamped inside the
 * viewport. Pure and total.
 *
 * @param r - the hovered row's rect (`top`/`left`/`right` are read).
 * @param vw - viewport width (`window.innerWidth`).
 * @param vh - viewport height (`window.innerHeight`).
 * @param w - bubble width.
 * @param h - bubble height.
 * @returns fixed-position coordinates for the bubble.
 */
export declare function bubblePos(r: {
    top: number;
    left: number;
    right?: number;
}, vw: number, vh: number, w?: number, h?: number): {
    top: number;
    left: number;
};
/**
 * Render a markdown string into React nodes.
 * Supports: headings (h1-h6), unordered/ordered lists, bold, inline code, paragraphs.
 */
export declare function renderMd(md: string): ReactNode;
/**
 * The bubble itself.
 *
 * @param props - the item to show, the clamped coordinates, and the lookup.
 * @returns the bubble element.
 */
export declare function RecallBubble(props: {
    item: MemoryRecallItem;
    pos: {
        top: number;
        left: number;
    };
    t: (key: string) => string;
}): ReactNode;
