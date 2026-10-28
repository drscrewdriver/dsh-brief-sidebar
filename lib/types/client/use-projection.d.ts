/**
 * Structural probe face for the client root context.
 *
 * Widened from cordis `Context` on the 0.2.1-rc.3 dev bed: the host tab library
 * vendors its own cordis `Context` and intersects it into the tab/badge ctx it
 * hands us, so the nominal cordis `Context` of this repo's cordis copy is NOT
 * assignable across the two (missing symbol members). Everything this plugin
 * reads off the context already goes through `ctx.get(...)` structural probes,
 * so the shared minimum is exactly that one method.
 */
export interface CtxProbe {
    get(key: string): any;
}
/** Structural view of a projection face (`ObservableSnapshot<unknown>`). */
export interface ProjectionFace {
    getSnapshot(): unknown;
    subscribe(listener: () => void): () => void;
}
/** Structural view of one session binding's projection store. */
export interface ProjectionsLike {
    faceOf(key: string): ProjectionFace;
}
/** Structural view of the client Session Controller face this plugin uses. */
export interface SessionsLike {
    binding(id: string): {
        readonly session: {
            readonly projections: ProjectionsLike;
        };
    } | undefined;
}
/**
 * Resolve one projection face for one session.
 *
 * `ctx.get('sessions')` is the safe accessor (a direct `ctx.sessions` read can
 * throw on a context that does not carry the service yet).
 *
 * @param ctx - the client root context handed to the tab body.
 * @param sessionId - the tab's session scope; undefined means "no session".
 * @param key - the projection key to resolve.
 * @returns the projection face, or {@link ABSENT} when unreachable.
 */
export declare function resolveFace(ctx: CtxProbe | undefined, sessionId: string | undefined, key: string): ProjectionFace;
/**
 * Read one frame of a projection without subscribing.
 *
 * The one-shot sibling of {@link useProjectionValue}, for consumers that are
 * not React components — the tab badge is a plain function called on every
 * tab-bar render, so it must neither hold a subscription nor allocate one.
 *
 * @param ctx - the client root context.
 * @param sessionId - the session whose projection is read.
 * @param key - the projection key to read.
 * @returns the raw snapshot: `undefined` while the capability is absent; the
 *   semantics of any other value belong to the projection's own contract.
 */
export declare function projectionSnapshot(ctx: CtxProbe | undefined, sessionId: string | undefined, key: string): unknown;
/**
 * Subscribe to one session projection by key.
 *
 * @param ctx - the client root context.
 * @param sessionId - the session whose projection is shown.
 * @param key - the projection key to subscribe to.
 * @returns the raw snapshot value, identity-stable across frames the host did
 *   not change. Narrowing is the caller's job.
 */
export declare function useProjectionValue(ctx: CtxProbe | undefined, sessionId: string | undefined, key: string): unknown;
