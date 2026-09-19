/**
 * Opening a produced file's preview in the right Sidebar — the same channel
 * the conversation flow uses for its produced-file chips and inline mentions
 * (ui-chat `openFile` → `ctx.sidebarRight.openResource` with a
 * `dsh-resource://file/…` address).
 *
 * The address grammar is ported verbatim from the harness's browser-safe
 * `@deepseek-ai/dsh-util-workspace-path` (`file-address.ts` / `index.ts`),
 * because the plugin does not compile against that package: a relative path,
 * or an absolute path inside the session's workspace, is addressed under the
 * session's scope (`dsh-resource://file/session/<id>/<path>`); an absolute
 * path elsewhere keeps its absolute spelling in the same session's address.
 * Which tab type claims the address is the Sidebar's decision, not ours.
 *
 * The `sidebarRight` service is consumed structurally and treated as OPTIONAL:
 * where it is absent the section renders plain rows instead of links, the same
 * graceful degradation as the deliverables projection itself.
 */
import type { Context } from '@deepseek-ai/cordis';
/** Structural view of the right-Sidebar service this plugin needs. */
export interface SidebarRightLike {
    openResource(url: string, options?: {
        params?: {
            line?: number;
        };
    }): void;
}
/**
 * Whether a path is absolute in either spelling the Host accepts: POSIX (`/a/b`)
 * or Windows drive or UNC.
 */
export declare function isAbsoluteWorkspacePath(path: string): boolean;
/**
 * The address for a path as a caller holds it.
 * @param sessionId - the Session the path is read in.
 * @param cwd - that Session's workspace root, when known.
 * @param path - absolute or workspace-relative path, in either separator spelling.
 */
export declare function fileAddressFor(sessionId: string, cwd: string | undefined, path: string): string;
/**
 * Build a sidebar file opener for one session, or `undefined` when the
 * environment cannot open previews (no `sidebarRight` service, no session).
 * The cwd is re-read per call inside the opener, so a workspace switch between
 * renders is picked up on the next click.
 *
 * @param ctx - the client root context.
 * @param sessionId - the session whose workspace resolves paths.
 * @returns an opener that routes a produced path to the Sidebar preview.
 */
export declare function sidebarFileOpener(ctx: Context | undefined, sessionId: string | undefined): ((path: string) => void) | undefined;
