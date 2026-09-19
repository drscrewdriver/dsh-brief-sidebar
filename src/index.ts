/**
 * Node half of the todo sidebar plugin.
 *
 * The Cordis loader needs an entry point for the profile row; the browser half
 * (`./client`, served by `dsh-client-modules`) renders the summary tab.
 *
 * Since the summary upgrade, this half owns ONE behaviour: contributing the
 * `dshSummaryDeliverables` projection unit (see `./projection/register`), which
 * folds successful mutation calls into a live produced-file feed. The
 * contribution is optional — `registerDeliverablesProjection` waits for the
 * `sessionProjections` service via `ctx.inject`, so a composition without the
 * registry still loads this profile row and simply hides the deliverables
 * section client-side.
 *
 * In particular this half still never touches the filesystem at load time: a
 * profile row is instantiated on the boot path, and a synchronous read there
 * would delay the host's startup. The fold is event-driven and stores paths
 * only.
 */
import type { Context } from '@deepseek-ai/cordis'
import { registerDeliverablesProjection } from './projection/register'

/** Profile row identity. */
export const name = 'dsh-todo-sidebar'

/**
 * Node-face apply.
 * @param ctx - the host context the loader hands this profile row.
 */
export function apply(ctx: Context): void {
  registerDeliverablesProjection(ctx)
}
