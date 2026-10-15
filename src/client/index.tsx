/**
 * Browser half: the task board tab, plus the shadow that hides the official
 * composer-band todo panel.
 *
 * Registration order matters and is deliberate:
 *
 * 1. **Dictionaries first.** Every later registration can render translated
 *    copy, and a dictionary that lands after the first paint would show raw
 *    keys for a frame.
 * 2. **Sidebar surface, deferred.** The board needs a sidebar to live in:
 *    better-sidebar when it is installed (richer: badge + rail icon), else the
 *    host's own right-sidebar tab system (0.1.5+ `sidebarRightTabs` +
 *    `sidebar.right.pane.tab`). Both are acquired through the deferred
 *    `ctx.inject` because neither service is ordered against this apply —
 *    an immediate `ctx.get` was the 0.1.2 inert bug. With neither — ≤0.1.2
 *    hosts without better-sidebar — the plugin stays sidebar-inert: the
 *    official panel keeps rendering and the shadow never installs.
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
import { registerNativeBoardTab } from './native-sidebar'
import type { NativeTabRegistryLike } from './native-sidebar'
import { setOpenTab } from './memory-tab'
import { MemoryViewer } from './memory-viewer/viewer'
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
import { claimFamilyHostIfOrphaned } from './family-host'
import type { FamilyHostSlots } from './family-host'
import type { BriefClientConfig, ConfigFormsLike } from './scope-face'

/**
 * Tab type id. Package-prefixed so it cannot collide with a built-in type.
 * Unchanged since the 0.1.0 board tab: the summary tab REPLACES the board tab
 * in place, so an opened or pinned tab survives the upgrade.
 */
export const TAB_ID = 'dsh-brief-sidebar:board'

/**
 * Tab kind on the native host-sidebar path (`openTab`/guide dispatch key).
 * Only the native registration uses it; better-sidebar keeps addressing the
 * tab by {@link TAB_ID}.
 */
export const TAB_KIND = 'brief-board'

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

/** Console prefix for the environment probe and registration attribution. */
const LOG = '[dsh-brief-sidebar]'

/**
 * Run a registration thunk, attributing a thrown failure to the console
 * instead of the cordis effect void (a bare throw inside `ctx.effect` leaves
 * the field reader with an empty sidebar and no clue which arm died).
 */
function guarded(label: string, run: () => (() => void) | undefined | void): () => void {
  try {
    const dispose = run()
    return typeof dispose === 'function' ? (dispose as () => void) : NOOP
  } catch (error) {
    console.error(`${LOG} ${label} failed`, error)
    return NOOP
  }
}

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

  // 2. Sidebar surface, acquired DEFERRED. better-sidebar is a third-party
  //    plugin with no ordering guarantee against us, and the native tab
  //    registry is a host service that can publish after this apply too — an
  //    immediate `ctx.get` misses either one and stays inert forever (the
  //    0.1.2 field failure). Both arms ride the deferred optional
  //    `ctx.inject` (the browser-cdp / configForms precedent). The host
  //    registry usually wins the race on 0.1.5+ (it publishes before the
  //    third-party sidebar), so the state is NOT a one-shot latch: when
  //    better-sidebar arrives after a native seat, it HANDS OVER — the
  //    native registration is released and the board re-seats on the bar,
  //    which is the rail and manager the user actually sees (the 0.1.5
  //    "invisible tab" failure was a native seat under a sidebar UI that
  //    replaced the official rail). On a bare native host (0.1.7 farm cell)
  //    no handover ever fires.
  let surface: 'none' | 'bar' | 'native' = 'none'
  let shadowDone = false
  let nativeDisposer: (() => void) | undefined

  /** Hide the official composer-band panel (reversible on unload), once. */
  const shadowDock = (): void => {
    if (shadowDone) return
    shadowDone = true
    ctx.effect(() => registerTodoDockShadow(ctx) ?? NOOP, 'dsh-brief-sidebar: dock shadow')
  }

  const registerOnBar = (bar: BetterSidebarService): void => {
    if (surface === 'bar') return
    if (surface === 'native') {
      const release = nativeDisposer
      nativeDisposer = undefined
      try {
        release?.()
      } catch { /* a half-torn-down native seat must not block the handover */ }
      console.info(`${LOG} surface=bar (handed over from native)`)
    } else {
      console.info(`${LOG} surface=bar`)
    }
    surface = 'bar'
    shadowDock()
    ctx.effect(
      () =>
        guarded('registerTab', () =>
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
        ),
    'dsh-brief-sidebar: tab',
  )
  }

  const registerOnNative = (registry: NativeTabRegistryLike | undefined): void => {
    if (surface !== 'none') return
    surface = 'native'
    console.info(`${LOG} surface=native`)
    shadowDock()
    ctx.effect(
      () => {
        nativeDisposer = guarded('native tab', () => registerNativeBoardTab(ctx, registry, { id: TAB_ID, kind: TAB_KIND, order: TAB_ORDER, t }))
        return () => {
          nativeDisposer = undefined
        }
      },
      'dsh-brief-sidebar: native tab',
    )
  }

  /** Register the memory detail viewer tab (hidden, opened via openMemoryTab). */
  const registerMemoryTab = (bar: BetterSidebarService): void => {
    try {
      ;(bar as unknown as { registerTab(desc: Record<string, unknown>): unknown }).registerTab({
        id: 'dsh-md-memory-viewer:memory',
        title: 'Memory',
        description: '查看记忆条目详情',
        hidden: true,
        order: 200,
        dedupeKey: (tab: { path?: string }) => tab.path ? `memory:${tab.path}` : undefined,
        component: (props: { ctx: Context; tab?: { path?: string }; scope?: { sessionId?: string } }) => {
          const memoryId = props.tab?.path ?? ''
          return createElement(MemoryViewer, {
            ctx: props.ctx,
            memoryId,
            scope: props.scope ?? {},
          })
        },
      })
    } catch { /* already registered or service busy */ }
  }

  // Arm 1: better-sidebar, immediate read first (the common case where the
  // sidebar started before us), deferred retry otherwise.
  let bar: BetterSidebarService | undefined
  try {
    bar = ctx.get('betterSidebar')
  } catch {
    bar = undefined
  }
  if (bar !== undefined) {
    registerOnBar(bar)
    setOpenTab((seed) => bar!.openTab(seed))
    registerMemoryTab(bar)
  } else {
    ;(ctx as unknown as {
      inject: (deps: string[], cb: (scope: { betterSidebar?: BetterSidebarService }) => void) => void
    }).inject(['betterSidebar'], (scope) => {
      if (scope.betterSidebar !== undefined) { registerOnBar(scope.betterSidebar); setOpenTab((seed) => scope.betterSidebar!.openTab(seed)); registerMemoryTab(scope.betterSidebar) }
    })
  }

  // Arm 2: the host's own tab registry (0.1.5+). Never fires on ≤0.1.2. The
  // registry is read from the INJECTED scope — a root ctx.get of this
  // undeclared service is denied by the strict proxy (the 0.1.7 silent no-op).
  ;(ctx as unknown as {
    inject: (deps: string[], cb: (scope: { sidebarRightTabs?: NativeTabRegistryLike }) => void) => void
  }).inject(['sidebarRightTabs'], (scope) => {
    registerOnNative(scope.sidebarRightTabs)
  })

  // 5. The settings cards (see the module doc): ONE component + ONE inject
  //    factory at TWO seats. The entry ids follow the family convention —
  //    `dsh-family.tab` contributors key by short id (session-guard →
  //    'session-guard'), `plugins.bundle.config` keys by package name.
  //    `configForms` rides a deferred inject: the service lives in the
  //    settings module, which may start after this apply; the callback simply
  //    never fires on a host without it (the gate then reads its default).
  const slots = ctx.get('slots') as SlotsLike | undefined
  /** 探针：宿主执行过我们的 tab 工厂 == 有人声明了 `dsh-family.tab`。这是插件侧
   * 唯一合法的「容器在不在」判据（槽门面不暴露 spec 查询，entriesOfSlot 也不区分
   * 「已声明但空」与「未声明」）。 */
  let familyTabHeld = false
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

    slots.inject('dsh-family.tab', () => {
      // 工厂被调用即说明子席位已有人声明：本插件只做成员，不上位。
      familyTabHeld = true
      return slots.register(
        {
          name: 'dsh-family.tab',
          id: 'brief-sidebar',
          order: 30,
          label: () => t('settings.title'),
          inject: injectFactory,
        },
        component,
      )
    })
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

  // 家族容器兜底：若到分级时刻仍无人声明 `dsh-family.tab`（owner 全部让位或声明
  // 失败），本插件自己上位成通用容器——否则成员卡整轮启动不可见且不报任何错。
  // 注册在 apply 顶层而不是 configForms 回调里：没有 configForms 的主机上，
  // 容器仍然需要有人接管。
  if (slots !== undefined) {
    ctx.effect(
      () => claimFamilyHostIfOrphaned(
        slots as unknown as FamilyHostSlots,
        () => familyTabHeld,
        // 家族共享节标题，不是本插件名：接管的是别人的那一节。
        () => '起子插件设置',
        LOG,
      ),
      'brief: family host backstop',
    )
  }

  // One-line environment snapshot: what this apply could see at mount time.
  // Cross-reference with the `surface=` line to tell "arm never fired" from
  // "arm fired and registration threw" (guarded logs that part).
  try {
    let nativeTabsAtApply = false
    try {
      nativeTabsAtApply = ctx.get('sidebarRightTabs') !== undefined
    } catch {
      nativeTabsAtApply = false /* strict proxy denies the undeclared read */
    }
    console.info(`${LOG} env ${JSON.stringify({
      locale: locale !== undefined,
      barAtApply: bar !== undefined,
      nativeTabsAtApply,
    })}`)
  } catch { /* console may be absent in a stripped host */ }
}
