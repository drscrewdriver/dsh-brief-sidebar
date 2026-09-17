/**
 * Tab glyph for the task board.
 *
 * Skin contract: plugin-drawn glyphs take their colour from the `--dsw-alias-*`
 * tokens — no colour literals anywhere in this file.
 */
import type { ReactNode } from 'react';
/**
 * A checklist mark: three rows with ticks and text rails — the same status
 * vocabulary the board paints.
 * @param size - square edge in px (the host passes its own tab-icon size).
 */
export declare function TodoIcon(size: number): ReactNode;
