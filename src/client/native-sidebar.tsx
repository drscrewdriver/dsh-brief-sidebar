/**
 * Native right-sidebar path: register the board tab directly into the DSH
 * host's own sidebar, with NO better-sidebar in sight. Available on host
 * generations that ship `dsh-client-ui-sidebar-right` (0.1.5+; verified by
 * slot-declaration forensics on 0.1.5-rc.3, 0.1.7-rc.2 and 0.2.0-rc.2).
 *
 * The host opens a tab type through a two-stage registration, and this module
 * copies better-sidebar's own native bridge EXACTLY — that plugin is the
 * shipped, field-proof consumer of the same seats:
 *
 * 1. Stage one, "what the type IS": `ctx.sidebarRightTabs.register({id, kind,
 *    title, guide})` (a `SidebarRightTabDefinition`; page type — no `patterns`,
 *    opened by kind). The returned disposer lives in our effect.
 * 2. Stage two, "what the body draws": a keyed registration under
 *    `sidebar.right.pane.tab` whose `key` is the definition's `id`. The inject
 *    callback receives the session id; everything else (our `t`, the root
 *    `ctx`) rides a closure, and `SummaryTab` reads session data through
 *    `ctx.get('sessions')` exactly as it does under better-sidebar.
 *
 * Degradations versus the better-sidebar path, accepted deliberately:
 * - no badge — the native chip has no badge affordance; the unfinished count
 *   still shows inside the tab body.
 * - no `visible` pause — the host unmounts inactive bodies (`keepMounted`
 *   defaults to false), which subsumes it.
 * - the open affordance is the guide-page capsule (`guide[]`), not a rail icon.
 *
 * Everything is read through `ctx.get` structural probes: the services are
 * absent on ≤0.1.2 hosts, so the caller must treat `undefined` as "no native
 * surface" and stay inert rather than crash. No import from
 * `@deepseek-ai/dsh-client-ui-sidebar-right` — a browser-only plugin keeps zero
 * build-time coupling to host internals, mirroring `use-projection.ts`.
 */
import type { ReactNode } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { SlotsLike } from './brief/dock-shadow'
import { SummaryTab } from './SummaryTab'

/** One guide-page capsule contributed by our type (structural `SidebarRightGuideEntry`). */
interface NativeGuideEntry {
  readonly id: string
  readonly order: number
  readonly title: () => string
  readonly description?: () => string
}

/** Stage-one shape (structural `SidebarRightTabDefinition`; only the page-type fields). */
interface NativeTabDefinition {
  readonly id: string
  readonly kind: string
  readonly title: (address: string) => string
  readonly guide?: readonly NativeGuideEntry[]
}

/** `ctx.sidebarRightTabs` — the only method we call. */
interface NativeTabRegistryLike {
  register(definition: NativeTabDefinition): () => void
}

export type { NativeTabRegistryLike }

/** The keyed seat a tab type registers its body under. */
const PANE_TAB_SEAT = 'sidebar.right.pane.tab'

/**
 * Whether this host exposes the native right-sidebar tab system at all.
 *
 * Both services must answer: the registry stages the type, and a future
 * "open from a button" affordance goes through the controller face.
 * @param ctx - the client root context.
 */
export function nativeSidebarAvailable(ctx: Context): boolean {
  const registry = ctx.get('sidebarRightTabs') as NativeTabRegistryLike | undefined
  const controller = ctx.get('sidebarRight') as unknown
  return (
    registry !== undefined &&
    typeof registry.register === 'function' &&
    controller !== undefined &&
    ctx.get('slots') !== undefined
  )
}

/**
 * Register the board as a native right-sidebar tab type.
 *
 * The registry arrives as a parameter, read from the deferred `ctx.inject`
 * scope in `apply` — the 0.1.7+ strict-proxy ctx refuses a root `ctx.get`
 * of an undeclared service, so reaching for `sidebarRightTabs` from the root
 * context is what made the native seat silently no-op on 0.1.7 (the "cannot
 * register directly" observation). better-sidebar's own native bridge reads
 * it the same way: from the inject callback's scope.
 *
 * @param ctx - the client root context (for the declared `slots` service).
 * @param registry - the host tab-type registry from the injected scope.
 * @param deps - the stable ids and the translator from `apply`.
 * @returns a disposer that unregisters the seat first, then the type (the
 *   registry refuses opens for a type whose body is already gone).
 */
export function registerNativeBoardTab(
  ctx: Context,
  registry: NativeTabRegistryLike | undefined,
  deps: { id: string; kind: string; order: number; t: (key: string) => string },
): () => void {
  const slots = ctx.get('slots') as SlotsLike | undefined
  if (registry === undefined || typeof registry.register !== 'function' || slots === undefined) {
    return (): void => {}
  }

  // Stage 1: the type. Page kind — opened from the guide capsule by `kind`.
  const disposeType = registry.register({
    id: deps.id,
    kind: deps.kind,
    title: () => deps.t('tab.title'),
    guide: [
      {
        id: deps.id,
        order: deps.order,
        title: () => deps.t('tab.title'),
        description: () => deps.t('tab.desc'),
      },
    ],
  })

  // Stage 2: the body, keyed under the definition's own id. The payload
  // mirrors better-sidebar's `TabComponentProps` fields that SummaryTab reads;
  // `visible` is pinned true because the host unmounts hidden bodies anyway.
  const disposeSeat = slots.inject(PANE_TAB_SEAT, () =>
    slots.register(
      {
        name: PANE_TAB_SEAT,
        key: deps.id,
        inject: (sessionId: string) => ({
          t: deps.t,
          ctx,
          scope: { sessionId },
          visible: true,
        }),
      },
      SummaryTab as unknown as (props: unknown) => ReactNode,
    ),
  )

  return (): void => {
    try {
      disposeSeat()
    } finally {
      disposeType()
    }
  }
}
