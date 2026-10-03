/**
 * Node half of the brief sidebar plugin.
 *
 * The Cordis loader needs an entry point for the profile row; the browser half
 * (`./client`, served by `dsh-client-modules`) renders the summary tab.
 *
 * Since the summary upgrade, this half owns TWO behaviours:
 *
 * 1. contributing the `dshSummaryDeliverables` projection unit (see
 *    `./projection/register`), which folds successful mutation calls into a
 *    live produced-file feed. The contribution is optional —
 *    `registerDeliverablesProjection` waits for the `sessionProjections`
 *    service via `ctx.inject`, so a composition without the registry still
 *    loads this profile row and simply hides the deliverables section
 *    client-side.
 * 2. declaring the entry's `Config` schema — one `.volatile()` boolean,
 *    `showMemorySlots`, that gates the summary tab's memory-slots section
 *    (slots come from the `dsh-prime-memory` projection `memorySlots`). The
 *    value is read CLIENT-side through the `configForms` service; this half
 *    never reads it, the export exists so the host has a settings surface to
 *    validate and persist against (the DSH 0.1.7+ declarative-settings
 *    contract, same as dsh-thinking-levels).
 *
 * In particular this half still never touches the filesystem at load time: a
 * profile row is instantiated on the boot path, and a synchronous read there
 * would delay the host's startup. The fold is event-driven and stores paths
 * only.
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
/** Profile row identity. */
export declare const name = "dsh-brief-sidebar";
/**
 * Composition-entry schema: the runtime switch the settings faces write
 * (family settings card + Plugins-page config card) and the summary tab's
 * memory section reads. `.volatile()` = editable at runtime without a plugin
 * remount; the default mirrors {@link DEFAULT_SHOW_MEMORY_SLOTS} in the client.
 */
export declare const Config: z<Schemastery.ObjectS<NoInfer<{
    showMemorySlots: z<boolean, boolean, "volatile-defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    showMemorySlots: z<boolean, boolean, "volatile-defined">;
}>>, "plain">;
/**
 * Node-face apply. The loader hands the resolved entry config as the second
 * argument (volatile fields as live refs); this half has no server-side use
 * for it — the gate is consumed in the browser half.
 *
 * @param ctx - the host context the loader hands this profile row.
 */
export declare function apply(ctx: Context): void;
