import type { ReactNode } from 'react';
import type { MemoryRecallItem } from './memory-recall';
/**
 * Clamp the bubble into the viewport.
 *
 * The anchor is the hovered row's rect. The bubble opens to its right and one
 * notch down, then gets pushed back inside the window: never further right than
 * `vw - w - 8`, never below `vh - h - 8`, and never into negative coordinates.
 * Pure and total — callers can pass a zero-size rect and get a usable box.
 *
 * @param r - the hovered row's bounding rect (only `top`/`left` are read).
 * @param vw - viewport width (`window.innerWidth`).
 * @param vh - viewport height (`window.innerHeight`).
 * @param w - bubble width.
 * @param h - bubble height.
 * @returns fixed-position coordinates for the bubble.
 */
export declare function bubblePos(r: {
    top: number;
    left: number;
}, vw: number, vh: number, w?: number, h?: number): {
    top: number;
    left: number;
};
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
