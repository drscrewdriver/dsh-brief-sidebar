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
 * 5. **Register the settings cards.** The memory-section switch gets TWO
 *    faces from ONE component + ONE inject factory: a card in the plugin-family
 *    settings section (「起子插件设置」, hosted by dsh-thinking-levels) and the
 *    Plugins-page configuration card. `configForms` resolves through a
 *    deferred inject (the service may start after apply — the same lateness
 *    the composer model panel in dsh-thinking-levels guards against); on a
 *    host without it the cards never register and the section gate falls back
 *    to its default (on).
 *
 * Every registration rides `ctx.effect(fn, label)` so its disposer is revoked on
 * fiber teardown (HMR / disable), which is also what makes the shadow
 * reversible: unload the plugin and the official dock renders again. The
 * settings cards are the family-proven exception: they ride the deferred
 * `configForms` inject whose disposers are not held (same as
 * dsh-thinking-levels' composer panel registration).
 *
 * Contract notes for the two surfaces touched here:
 * - better-sidebar tabs are hosted by DSH's native right Sidebar, so the tab
 *   body receives `TabComponentProps` (`ctx` + `scope` + `visible`) and NOT the
 *   framework's session-scoped slot props.
 * - `conversation.input.dock` is the DSH slot the official todo panel occupies;
 *   see `brief/dock-shadow.tsx` for why a lower priority wins the cell.
 */
import { createElement } from 'react'
import type { ReactNode } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { BetterSidebarService, TabComponentProps } from 'dsh-better-sidebar/client/service'
import { SummaryTab } from './SummaryTab'
import { BriefIcon } from './BriefIcon'
import { NS, dictionaries } from './locales'
import { readTodos, unfinishedCount } from './brief/board'
import { registerTodoDockShadow } from './brief/dock-shadow'
import type { SlotsLike } from './brief/dock-shadow'
import { TODOS_KEY } from './brief/use-todos'
import { projectionSnapshot } from './use-projection'
import { BriefSettingsCard } from './settings-card'
import type { BriefSettingsCardProps } from './settings-card'
import type { BriefClientConfig, ConfigFormsLike } from './scope-face'

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
// Generation-neutral list only: betterSidebar/locale ride ctx.get soft-reads in
// apply (both absent on 0.1.0/0.1.1 — declaring them pends the whole client
// entry, web boot refuses to render; playbook §1).
// betterSidebar 经 ctx.get 软读（缺席 inert）；locale 全线 rc 皆在（0.1.0-rc.2 起）。
// 第三方插件服务不入顶层 inject——缺席格 entry 永久 pending，web boot 拒渲染整树。
export const inject = ['slots', 'locale']

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

  // 5. The settings cards (see the module doc): ONE component + ONE inject
  //    factory at TWO seats. The entry ids follow the family convention —
  //    `dsh-family.tab` contributors key by short id (session-guard →
  //    'session-guard'), `plugins.bundle.config` keys by package name.
  //    `configForms` rides a deferred inject: the service lives in the
  //    settings module, which may start after this apply; the callback simply
  //    never fires on a host without it (the gate then reads its default).
  const slots = ctx.get('slots') as SlotsLike | undefined
  ;(ctx as unknown as {
    inject: (deps: string[], cb: (scope: { configForms?: ConfigFormsLike }) => void) => void
  }).inject(['configForms'], (scope) => {
    const configForms = scope.configForms
    if (slots === undefined || configForms === undefined || typeof configForms.get !== 'function') return

    /** Same face for both seats: the entry scope plus the applied-time binder. */
    const injectFactory = (): BriefSettingsCardProps => ({
      t,
      scope: configForms.get<BriefClientConfig>('dsh-brief-sidebar'),
    })
    /** The slot core hands the component `unknown` props (registry typing). */
    const component = BriefSettingsCard as unknown as (props: unknown) => ReactNode

    slots.inject('dsh-family.tab', () =>
      slots.register(
        {
          name: 'dsh-family.tab',
          id: 'brief-sidebar',
          order: 30,
          label: () => t('settings.title'),
          inject: injectFactory,
        },
        component,
      ),
    )
    slots.inject('plugins.bundle.config', () =>
      slots.register(
        {
          name: 'plugins.bundle.config',
          key: 'dsh-brief-sidebar',
          inject: injectFactory,
        },
        component,
      ),
    )
  })
}
