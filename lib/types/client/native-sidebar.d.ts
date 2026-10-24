import type { CtxProbe } from './use-projection';
/** One guide-page capsule contributed by our type (structural `SidebarRightGuideEntry`). */
interface NativeGuideEntry {
    readonly id: string;
    readonly order: number;
    readonly title: () => string;
    readonly description?: () => string;
}
/** Stage-one shape (structural `SidebarRightTabDefinition`; only the page-type fields). */
interface NativeTabDefinition {
    readonly id: string;
    readonly kind: string;
    readonly title: (address: string) => string;
    readonly guide?: readonly NativeGuideEntry[];
}
/** `ctx.sidebarRightTabs` — the only method we call. */
interface NativeTabRegistryLike {
    register(definition: NativeTabDefinition): () => void;
}
export type { NativeTabRegistryLike };
/**
 * Whether this host exposes the native right-sidebar tab system at all.
 *
 * Both services must answer: the registry stages the type, and a future
 * "open from a button" affordance goes through the controller face.
 * @param ctx - the client root context.
 */
export declare function nativeSidebarAvailable(ctx: CtxProbe): boolean;
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
export declare function registerNativeBoardTab(ctx: CtxProbe, registry: NativeTabRegistryLike | undefined, deps: {
    id: string;
    kind: string;
    order: number;
    t: (key: string) => string;
}): () => void;
