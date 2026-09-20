/**
 * Browser half: the task board tab, plus the shadow that hides the official
 * composer-band todo panel.
 *
 * Registration order matters and is deliberate:
 *
 * 1. **Dictionaries first.** Every later registration can render translated
 *    copy, and a dictionary that lands after the first paint would show raw
 *    keys for a frame.
 * 2. **Soft-dependency check.** `inject` already waits for `betterSidebar`, so
 *    the guard only fires in a composition that relaxes the inject list. It is
 *    kept because it is what stops the plugin from hiding the official panel
 *    when it has no board to replace it with.
 * 3. **Shadow the official dock.** Deliberately BEFORE the tab registration:
 *    the panel is the only other carrier of the list, so the replacement has to
 *    exist in the same activation.
 * 4. **Register the tab.**
 *
 * Every registration rides `ctx.effect(fn, label)` so its disposer is revoked on
 * fiber teardown (HMR / disable), which is also what makes the shadow
 * reversible: unload the plugin and the official dock renders again.
 *
 * Contract notes for the two surfaces touched here:
 * - better-sidebar tabs are hosted by DSH's native right Sidebar, so the tab
 *   body receives `TabComponentProps` (`ctx` + `scope` + `visible`) and NOT the
 *   framework's session-scoped slot props.
 * - `conversation.input.dock` is the DSH slot the official todo panel occupies;
 *   see `brief/dock-shadow.tsx` for why a lower priority wins the cell.
 */
import { createElement } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { BetterSidebarService, TabComponentProps } from 'dsh-better-sidebar/client/service'
import { SummaryTab } from './SummaryTab'
import { BriefIcon } from './BriefIcon'
import { NS, dictionaries } from './locales'
import { readTodos, unfinishedCount } from './brief/board'
import { registerTodoDockShadow } from './brief/dock-shadow'
import { TODOS_KEY } from './brief/use-todos'
import { projectionSnapshot } from './use-projection'

/**
 * Tab type id. Package-prefixed so it cannot collide with a built-in type.
 * Unchanged since the 0.1.0 board tab: the summary tab REPLACES the board tab
 * in place, so an opened or pinned tab survives the upgrade.
 */
export const TAB_ID = 'dsh-brief-sidebar:board'

/**
 * Position in the host's new-tab guide.
 *
 * Built-ins on this host generation sit at editor 10 / git 20 / subagent 30 /
 * sidechat 35 / terminal 40 / browser 50. 15 places a per-session task board
 * right after the editor, which is where a reader looks for session state.
 */
export const TAB_ORDER = 15

/** Services required before `apply` runs. */
export const inject = ['betterSidebar', 'locale', 'slots']

/**
 * Structural view of the DSH locale service — only the two members this plugin
 * calls. Declared locally on purpose: importing the real type would pull the
 * whole client type graph into a browser-only plugin for two signatures.
 */
interface LocaleLike {
  register(ns: string, dicts: Record<string, Record<string, string>>): () => void
  bind(ns: string): (key: string) => string
}

/**
 * An effect body must return a disposer (cordis rejects `undefined` with a
 * `TypeError`), so a path that could not register anything returns this no-op
 * instead of nothing.
 */
const NOOP = (): void => {}

/**
 * Browser-face apply.
 *
 * @param ctx - the client root context.
 */
export function apply(ctx: Context): void {
  // 1. Plugin-owned dictionaries, in one registration.
  const locale: LocaleLike | undefined = ctx.get('locale')
  if (locale !== undefined) {
    ctx.effect(() => locale.register(NS, dictionaries), 'dsh-brief-sidebar: dictionaries')
  }

  /**
   * Translate one of our keys. `bind` returns a cached function that reads the
   * ACTIVE locale at call time, so a language switch needs no re-apply; an
   * unknown namespace or key falls back to the key itself rather than throwing
   * inside a render.
   */
  const t = (key: string): string => {
    if (locale === undefined) return key
    try {
      return locale.bind(NS)(key) || key
    } catch {
      return key
    }
  }

  // 2. Soft dependency: without better-sidebar there is no place to show the
  //    list, so the plugin stays inert and the official panel keeps rendering.
  const bar: BetterSidebarService | undefined = ctx.get('betterSidebar')
  if (bar === undefined) return

  // 3. Hide the official composer-band panel (reversible on unload).
  ctx.effect(() => registerTodoDockShadow(ctx) ?? NOOP, 'dsh-brief-sidebar: dock shadow')

  // 4. The board.
  ctx.effect(
    () =>
      bar.registerTab({
        id: TAB_ID,
        title: () => t('tab.title'),
        description: () => t('tab.desc'),
        icon: (size: number) => BriefIcon(size),
        order: TAB_ORDER,
        // Shorthand for `dedupeKey: () => id`: reopening focuses the existing tab.
        single: true,
        /**
         * Unfinished count on the tab strip. Called on every tab-bar render, so
         * it reads one snapshot and allocates no subscription; a completed list
         * shows no badge at all.
         */
        badge: (badgeCtx, badgeScope) => {
          const todos = readTodos(projectionSnapshot(badgeCtx, badgeScope.sessionId, TODOS_KEY))
          if (todos === undefined) return null
          const pending = unfinishedCount(todos)
          return pending > 0 ? pending : null
        },
        component: (props: TabComponentProps) =>
          createElement(SummaryTab, {
            t,
            ctx: props.ctx,
            scope: props.scope,
            visible: props.visible,
          }),
      }),
    'dsh-brief-sidebar: tab',
  )
}
