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
import type { Context } from '@deepseek-ai/cordis'

/** Structural view of the right-Sidebar service this plugin needs. */
export interface SidebarRightLike {
  openResource(url: string, options?: { params?: { line?: number } }): void
}

/** Structural view of the sessions service slice the opener reads. */
interface SessionsListLike {
  list?: { getSnapshot(): { byId?: Record<string, { cwd?: string }> } }
}

/** The address scheme every file resource opens with. */
const FILE_ADDRESS_PREFIX = 'dsh-resource://file/'

/** Whether a path uses a Windows drive or UNC prefix. */
function isWindowsStylePath(value: string): boolean {
  return /^[A-Za-z]:[/\\]/.test(value) || value.startsWith('\\\\')
}

/**
 * Whether a path is absolute in either spelling the Host accepts: POSIX (`/a/b`)
 * or Windows drive or UNC.
 */
export function isAbsoluteWorkspacePath(path: string): boolean {
  return path.startsWith('/') || isWindowsStylePath(path)
}

/** Component-encode one id or path segment, keeping `:` literal for drive letters. */
function encodeSegment(segment: string): string {
  return encodeURIComponent(segment).replace(/%3A/gi, ':')
}

/** Encode a `/`-separated path segment by segment. */
function encodePath(path: string): string {
  return path.split('/').map(encodeSegment).join('/')
}

/**
 * Build the address of a file read through one Session.
 * @param sessionId - the Session whose Host workspace resolves the path.
 * @param path - absolute or workspace-relative path; backslashes are normalized
 *   to `/`, and leading `./` prefixes are dropped.
 */
function sessionFileAddress(sessionId: string, path: string): string {
  const normalized = path.replace(/\\/g, '/').replace(/^(?:\.\/)+/, '')
  return `${FILE_ADDRESS_PREFIX}session/${encodeSegment(sessionId)}/${encodePath(normalized)}`
}

/**
 * The address for a path as a caller holds it.
 * @param sessionId - the Session the path is read in.
 * @param cwd - that Session's workspace root, when known.
 * @param path - absolute or workspace-relative path, in either separator spelling.
 */
export function fileAddressFor(sessionId: string, cwd: string | undefined, path: string): string {
  const normalized = path.replace(/\\/g, '/')
  if (!isAbsoluteWorkspacePath(normalized)) return sessionFileAddress(sessionId, normalized)
  const root = cwd === undefined ? '' : cwd.replace(/\\/g, '/').replace(/\/+$/, '')
  if (root !== '' && normalized === root) return sessionFileAddress(sessionId, '')
  if (root !== '' && normalized.startsWith(`${root}/`)) {
    return sessionFileAddress(sessionId, normalized.slice(root.length + 1))
  }
  return sessionFileAddress(sessionId, normalized)
}

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
export function sidebarFileOpener(
  ctx: Context | undefined,
  sessionId: string | undefined,
): ((path: string) => void) | undefined {
  if (ctx === undefined || sessionId === undefined) return undefined
  const bar = ctx.get('sidebarRight') as SidebarRightLike | undefined
  if (bar === undefined || typeof bar.openResource !== 'function') return undefined

  return (path: string) => {
    const sessions = ctx.get('sessions') as SessionsListLike | undefined
    const cwd = sessions?.list?.getSnapshot?.().byId?.[sessionId]?.cwd
    bar.openResource(fileAddressFor(sessionId, cwd, path))
  }
}
