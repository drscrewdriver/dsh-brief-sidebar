/**
 * Hiding the official todo dock.
 *
 * `conversation.input.dock` is a LIST slot, and its cells are keyed by each
 * entry's `id`. The slot core keeps one live entry per cell — entries are
 * sorted by `priority` ascending (then by `order`) and the first live entry of
 * a cell is the one the outlet renders, so a SECOND registration with the same
 * `id` at a LOWER priority shadows the first. The official todo entry
 * (`conversation-todo-dock` in `dsh-client-ui-conversation`) registers
 * `{ id: 'todo', order: 0 }` with the default priority 0, so
 * `{ id: 'todo', priority: -1 }` wins the cell and the official panel never
 * renders while this plugin is mounted.
 *
 * This is the same mechanism `dsh-input-traffic` uses on the sibling `queue`
 * cell (`{ id: 'queue', priority: -1 }`), so it is a proven seam on this host
 * generation, not a guess.
 *
 * Binding to a built-in id is a real coupling: if upstream renames the cell,
 * the shadow silently stops winning and the official dock simply reappears
 * (fail-open — the data is still shown, just twice). `slots.inject` is used
 * rather than a bare `register` because the slot is declared by a built-in
 * entry whose lifetime we do not control: `inject` waits for the declaration
 * and re-installs the entry if the declaration is ever recreated.
 *
 * Renders nothing on purpose: the todo UI now lives in this plugin's sidebar
 * tab. Return a summary chip here instead to keep a one-line entry point in the
 * composer band.
 */
import type { ReactNode } from 'react';
import type { Context } from '@deepseek-ai/cordis';
/** The built-in cell id of the official todo dock. */
export declare const TODO_CELL_ID = "todo";
/** Lower than the built-in's default 0 — the winner of the `todo` cell. */
export declare const TODO_SHADOW_PRIORITY = -1;
/** Structural view of the client slots service (avoids a second type graph). */
export interface SlotsLike {
    inject(key: string, callback: () => (() => void) | undefined): () => void;
    register(options: Record<string, unknown>, component: (props: unknown) => ReactNode): () => void;
}
/**
 * Register the shadowing entry.
 *
 * The caller wraps this in `ctx.effect(...)` so the returned disposer rides the
 * plugin fiber: unloading the plugin restores the official dock.
 *
 * @param ctx - the client root context.
 * @returns the disposer, or undefined when the slots service is unreachable.
 */
export declare function registerTodoDockShadow(ctx: Context): (() => void) | undefined;
