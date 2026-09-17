/**
 * Contract guards over the source tree and the manifest.
 *
 * These are the invariants that no other test can see: the marketplace's
 * install rules, the browser-bundle shape (no value import of a shared module),
 * the isolation requirement against the Canvas plugin, the token-only colour
 * contract, and the bilingual key balance. Each one is cheap to check here and
 * expensive to discover in production — a `cordis` dependency entry or an
 * install script is rejected by the host AFTER the package is published.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { en, zh } from '../src/client/locales'

/**
 * Package root.
 *
 * Resolved from the process cwd (the runner sets it to the project root) rather
 * than from `import.meta.url`: the test runner rewrites module URLs to its own
 * non-`file:` scheme, so `fileURLToPath(new URL('..', import.meta.url))` throws
 * before a single test runs. The manifest is read immediately below and its
 * name is asserted, so a run from the wrong directory fails loudly instead of
 * silently auditing another package.
 */
const ROOT = process.cwd()

/** Every TypeScript source file of both halves, as platform-joined relative paths. */
const SOURCE_FILES: string[] = readdirSync(join(ROOT, 'src'), { recursive: true })
  .map(entry => String(entry))
  .filter(entry => entry.endsWith('.ts') || entry.endsWith('.tsx'))
  .map(entry => join('src', entry))
  .sort()

/** The manifest, parsed. */
const MANIFEST = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
  name: string
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  exports?: Record<string, unknown>
  dsh?: { bundle?: { patch?: string }; client?: { platform?: string; inject?: string[] } }
}

/** Read one source file. */
function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf8')
}

describe('source tree', () => {
  it('finds both halves', () => {
    expect(SOURCE_FILES).toContain(join('src', 'index.ts'))
    expect(SOURCE_FILES).toContain(join('src', 'client', 'index.tsx'))
  })

  it.each(SOURCE_FILES)('%s contains no dynamic code evaluation', file => {
    const text = read(file)
    expect(text).not.toMatch(/\beval\s*\(/)
    expect(text).not.toMatch(/\bnew\s+Function\s*\(/)
    expect(text).not.toMatch(/['"]node:vm['"]/)
  })

  it.each(SOURCE_FILES)('%s imports dsh-better-sidebar as a type only', file => {
    const offenders = read(file)
      .split('\n')
      .map((line, index) => ({ line: line.trim(), number: index + 1 }))
      .filter(({ line }) => line.includes('dsh-better-sidebar'))
      .filter(({ line }) => !/^import\s+type\b/.test(line))
    // A value import would pull the whole better-sidebar client bundle into this
    // plugin's bundle (and could evaluate a second copy of the service).
    expect(offenders).toEqual([])
  })

  it.each(SOURCE_FILES)('%s does not import the Canvas plugin', file => {
    const specifiers = [...read(file).matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m => m[1])
    expect(specifiers.filter(s => s.includes('canvas'))).toEqual([])
    expect(specifiers.filter(s => s.includes('dsh-canvas'))).toEqual([])
  })

  it.each(SOURCE_FILES)('%s paints only with --dsw-alias-* tokens', file => {
    const text = read(file)
    // Hex / functional colour notations are the portable way to break the skin
    // contract; named colours are not checked (too many false positives).
    expect(text).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(text).not.toMatch(/\brgba?\s*\(/)
    expect(text).not.toMatch(/\bhsla?\s*\(/)
  })

  it('uses the manifest name as the client module id', () => {
    const client = read(join('src', 'client', 'index.tsx'))
    expect(client).toContain(`'${MANIFEST.name}:board'`)
  })
})

describe('manifest', () => {
  it('audits the package it thinks it is auditing', () => {
    expect(MANIFEST.name).toBe('dsh-todo-sidebar')
  })

  it('declares no cordis dependency under any name', () => {
    // The marketplace rejects a package whose dependency is named exactly
    // `cordis` (the vendored runtime is injected by the host). The scoped
    // `@deepseek-ai/cordis` package is the legitimate type/dev dependency the
    // sibling plugins use, so only the bare name is refused.
    for (const field of [
      'dependencies',
      'peerDependencies',
      'optionalDependencies',
    ] as const) {
      const names = Object.keys(MANIFEST[field] ?? {})
      expect(names.filter(name => name === 'cordis')).toEqual([])
    }
  })

  it('declares no lifecycle install script', () => {
    const banned = ['preinstall', 'install', 'postinstall', 'prepare']
    expect(Object.keys(MANIFEST.scripts ?? {}).filter(name => banned.includes(name))).toEqual([])
  })

  it('is a web client bundle with a bundle patch', () => {
    expect(MANIFEST.dsh?.client?.platform).toBe('web')
    expect(MANIFEST.dsh?.bundle?.patch).toBe('./cordis.patch.yml')
    expect(MANIFEST.exports).toHaveProperty('./client')
  })

  it('keeps better-sidebar a soft dependency', () => {
    expect(MANIFEST.peerDependencies?.['dsh-better-sidebar']).toBeDefined()
    expect(MANIFEST.devDependencies?.['dsh-better-sidebar']).toBeDefined()
    // Installed for typecheck/build, but never a hard runtime requirement.
    expect(MANIFEST.dependencies?.['dsh-better-sidebar']).toBeUndefined()
  })

  it('documents its host range', () => {
    const engines = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).engines as {
      dsh?: string
    }
    expect(engines.dsh).toBeTruthy()
    expect(engines.dsh).toContain('<0.2.0-0')
  })
})

describe('localisation', () => {
  it('keeps both dictionaries in lockstep', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(zh).sort())
  })

  it('has a translation for every key the source asks for', () => {
    const requested = new Set<string>()
    for (const file of SOURCE_FILES) {
      // A real key is a dotted ASCII identifier; the shape is restricted so
      // prose like a doc comment's `t('…')` cannot be mistaken for a lookup.
      for (const match of read(file).matchAll(/\bt\(\s*'([A-Za-z][A-Za-z0-9_.]*)'\s*\)/g)) {
        requested.add(match[1])
      }
    }
    expect(requested.size).toBeGreaterThan(0)
    const missing = [...requested].filter(key => !(key in zh) || !(key in en)).sort()
    expect(missing).toEqual([])
  })
})

describe('source layout', () => {
  it('keeps the pure read side free of React', () => {
    const board = read(join('src', 'client', 'todo', 'board.ts'))
    expect(board).not.toMatch(/from\s+['"]react['"]/)
    expect(board).not.toMatch(/from\s+['"]@deepseek-ai\/cordis['"]/)
  })

  it('reports the source root it inspected, for diagnosability', () => {
    expect(relative(ROOT, join(ROOT, 'src'))).toBe('src')
  })
})
