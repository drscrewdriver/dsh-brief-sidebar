import type { ReactNode } from 'react';
export interface MemoryViewMenuProps {
    /** The DSH locale lookup, passed down from `apply`. */
    t: (key: string) => string;
    /** Optional memory id to focus; row-level menus pass the row's id. */
    recordId?: string;
    /** Trigger copy; defaults to `memoryView.button` + caret. */
    label?: string;
    /** Compact = inline text-link trigger for a row's rating strip. */
    compact?: boolean;
}
/**
 * The memory view menu. All hooks run before any conditional rendering.
 * @param props - translation.
 */
export declare function MemoryViewMenu(props: MemoryViewMenuProps): ReactNode;
