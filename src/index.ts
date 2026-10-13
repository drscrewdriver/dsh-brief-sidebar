/**
 * Node half of the brief sidebar plugin.
 *
 * The Cordis loader needs an entry point for the profile row; the browser half
 * (`./client`, served by `dsh-client-modules`) renders the summary tab.
 *
 * Since the summary upgrade, this half owns THREE behaviours:
 *
 * 1. contributing the `dshSummaryDeliverables` projection unit (see
 *    `./projection/register`), which folds successful mutation calls into a
 *    live produced-file feed. The contribution is optional —
 *    `registerDeliverablesProjection` waits for the `sessionProjections`
 *    service via `ctx.inject`, so a composition without the registry still
 *    loads this profile row and simply hides the deliverables section
 *    client-side.
 * 2. declaring the entry's `Config` schema — two `.volatile()` booleans,
 *    `showMemorySlots` and `showMemoryRecall`, that gate the summary tab's two
 *    memory sections (both come from `dsh-prime-memory` projections:
 *    `memorySlots` = hand-pinned resident conventions, default OFF; and
 *    `memoryRecall` = what this session actually injected, default ON). The
 *    value is read CLIENT-side through the `configForms` service; this half
 *    never reads it, the export exists so the host has a settings surface to
 *    validate and persist against (the DSH 0.1.7+ declarative-settings
 *    contract, same as dsh-thinking-levels).
 * 3. contributing the `dshSummarySkillUsage` projection unit, which folds the
 *    host's `skill` tool calls into "which skills did this session actually
 *    load". Same optional-contribution shape as (1), and the same reason for
 *    reading it off `tool/call.arguments`: the skill tool publishes no
 *    `presentationMeta` on any supported line (verified per tag from
 *    `dsh-v0.1.0-rc.8` to `dsh-v0.2.0-rc.2`), so the argument is the only
 *    durable fact about a skill load.
 *
 * In particular this half still never touches the filesystem at load time: a
 * profile row is instantiated on the boot path, and a synchronous read there
 * would delay the host's startup. The fold is event-driven and stores paths
 * only.
 */
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { registerDeliverablesProjection, registerSkillUsageProjection } from './projection/register'

/** Profile row identity. */
export const name = 'dsh-brief-sidebar'

/**
 * Composition-entry schema: the runtime switches the settings faces write
 * (family settings card + Plugins-page config card) and the summary tab's
 * memory sections read. `.volatile()` = editable at runtime without a plugin
 * remount; the defaults mirror {@link DEFAULT_SHOW_MEMORY_SLOTS} and
 * {@link DEFAULT_SHOW_MEMORY_RECALL} in the client.
 *
 * Why slots default off: a permanent "resident slots" card taught users to read
 * memory as resident, which is the opposite of relevance recall. The switch
 * stays there for anyone who wants the pinned list back.
 */
export const Config = z.object({
  showMemorySlots: z.boolean().default(false).volatile(),
  showMemoryRecall: z.boolean().default(true).volatile(),
})

/**
 * Node-face apply. The loader hands the resolved entry config as the second
 * argument (volatile fields as live refs); this half has no server-side use
 * for it — the gate is consumed in the browser half.
 *
 * @param ctx - the host context the loader hands this profile row.
 */
export function apply(ctx: Context): void {
  registerDeliverablesProjection(ctx)
  registerSkillUsageProjection(ctx)
}
