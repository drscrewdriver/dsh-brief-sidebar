/**
 * Pure-function contract of the sidebar file-address builder.
 *
 * The grammar is ported from the harness's `@deepseek-ai/dsh-util-workspace-path`;
 * these tests pin the cases that decide whether a produced file opens in the
 * right preview tab or silently 404s: relative paths, absolute paths inside
 * and outside the session workspace, Windows separators, and segment encoding.
 */
import { describe, expect, it } from 'vitest'
import { fileAddressFor, isAbsoluteWorkspacePath, sidebarFileOpener } from '../src/client/file-open'
import type { Context } from '@deepseek-ai/cordis'

describe('isAbsoluteWorkspacePath', () => {
  it('accepts POSIX, Windows drive, and UNC spellings', () => {
    expect(isAbsoluteWorkspacePath('/a/b.txt')).toBe(true)
    expect(isAbsoluteWorkspacePath('E:\\w\\a.txt')).toBe(true)
    expect(isAbsoluteWorkspacePath('E:/w/a.txt')).toBe(true)
    expect(isAbsoluteWorkspacePath('\\\\server\\share\\a.txt')).toBe(true)
    expect(isAbsoluteWorkspacePath('out/report.html')).toBe(false)
    expect(isAbsoluteWorkspacePath('./a.txt')).toBe(false)
  })
})

describe('fileAddressFor', () => {
  it('addresses a relative path under the session scope verbatim', () => {
    expect(fileAddressFor('s1', 'E:\\w', 'out/report.html')).toBe(
      'dsh-resource://file/session/s1/out/report.html',
    )
  })

  it('strips the workspace root from an absolute path inside the workspace', () => {
    expect(fileAddressFor('s1', 'E:\\w', 'E:\\w\\out\\report.html')).toBe(
      'dsh-resource://file/session/s1/out/report.html',
    )
    expect(fileAddressFor('s1', '/home/ys', '/home/ys/notes.txt')).toBe(
      'dsh-resource://file/session/s1/notes.txt',
    )
  })

  it('keeps an absolute path outside the workspace in the same session address', () => {
    expect(fileAddressFor('s1', 'E:\\w', 'C:\\other\\a.txt')).toBe(
      'dsh-resource://file/session/s1/C:/other/a.txt',
    )
  })

  it('keeps the absolute spelling when the workspace root is unknown', () => {
    // POSIX-absolute paths keep their leading slash in the session address,
    // which the grammar spells as a doubled slash after the session id.
    expect(fileAddressFor('s1', undefined, '/home/ys/notes.txt')).toBe(
      'dsh-resource://file/session/s1//home/ys/notes.txt',
    )
  })

  it('addresses the workspace root itself as an empty path', () => {
    expect(fileAddressFor('s1', 'E:\\w', 'E:\\w')).toBe('dsh-resource://file/session/s1/')
  })

  it('encodes special characters per segment, keeping the drive colon literal', () => {
    expect(fileAddressFor('s 1', 'E:\\w', 'my dir/re#port?v=1.md')).toBe(
      'dsh-resource://file/session/s%201/my%20dir/re%23port%3Fv%3D1.md',
    )
  })

  it('normalizes backslashes and drops leading ./ prefixes', () => {
    expect(fileAddressFor('s1', undefined, '.\\a\\b.md')).toBe(
      'dsh-resource://file/session/s1/a/b.md',
    )
  })
})

describe('sidebarFileOpener', () => {
  const SESSION = 'session-1'
  const CWD = 'E:\\w'

  /** A context with a recording sidebar service and a session list. */
  function ctxWith(options?: { sidebar?: boolean }): { ctx: Context; opened: string[] } {
    const opened: string[] = []
    const services: Record<string, unknown> = {
      sessions: { list: { getSnapshot: () => ({ byId: { [SESSION]: { cwd: CWD } } }) } },
    }
    if (options?.sidebar !== false) {
      services.sidebarRight = { openResource: (url: string) => { opened.push(url) } }
    }
    return { ctx: { get: (name: string) => services[name] } as unknown as Context, opened }
  }

  it('routes a click to the session-scoped file address', () => {
    const { ctx, opened } = ctxWith()
    const open = sidebarFileOpener(ctx, SESSION)
    expect(open).toBeDefined()
    open?.('out/report.html')
    expect(opened).toEqual(['dsh-resource://file/session/session-1/out/report.html'])
  })

  it('strips the workspace root from absolute paths inside the workspace', () => {
    const { ctx, opened } = ctxWith()
    sidebarFileOpener(ctx, SESSION)?.('E:\\w\\.agents\\plans\\t\\spec.md')
    expect(opened).toEqual(['dsh-resource://file/session/session-1/.agents/plans/t/spec.md'])
  })

  it('is undefined without the sidebar service or a session scope', () => {
    expect(sidebarFileOpener(ctxWith({ sidebar: false }).ctx, SESSION)).toBeUndefined()
    const { ctx } = ctxWith()
    expect(sidebarFileOpener(ctx, undefined)).toBeUndefined()
  })
})
