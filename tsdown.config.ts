/**
 * tsdown build for dsh-brief-sidebar.
 *
 * - `lib/index.mjs` — the host half (plain ESM node). The Cordis loader needs an
 *   entry point for the profile row; this plugin's behaviour is entirely in the
 *   browser half, so this half installs nothing and owns no state.
 * - `lib/client.js` — the browser client bundle, emitted as a CJS closure
 *   factory registering under the package-name id `dsh-brief-sidebar` (the
 *   client-modules compose keys on the package name; keep it in sync with
 *   package.json `name`).
 *
 * Types ship from lib/types (`tsc -p tsconfig.build.json`), not from tsdown.
 */
import { builtinModules } from 'node:module'
import type { UserConfig } from 'tsdown'

/** Node builtins must never survive into the browser module-loader factory. */
const NODE_BUILTINS = new Set([
  ...builtinModules,
  ...builtinModules.map(id => `node:${id}`),
])

/**
 * Module specifiers the web shell shares into the frozen module table. Only
 * `react` is actually value-imported by this plugin (everything else is
 * `import type`, which erases); the rest are listed so a future value import
 * cannot silently bundle a second copy of a shared module.
 */
const CLIENT_EXTERNALS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  'cordis',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-locale',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-web-react',
  '@deepseek-ai/dsh-client-ui-conversation',
]

/** Host half: plain ESM node output. */
const hostConfig: UserConfig = {
  entry: { index: 'src/index.ts' },
  outDir: 'lib',
  format: 'esm',
  platform: 'node',
  target: 'node20',
  dts: false,
  sourcemap: true,
  clean: false,
  deps: {
    neverBundle: [...NODE_BUILTINS, /^node:/, '@deepseek-ai/cordis'],
  },
}

/** The one client bundle: a CJS closure factory for the web module loader. */
const clientConfig: UserConfig = {
  entry: { client: 'src/client/index.tsx' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  dts: false,
  sourcemap: true,
  clean: false,
  deps: {
    neverBundle: [...CLIENT_EXTERNALS],
    alwaysBundle: (id: string) => (CLIENT_EXTERNALS.includes(id) ? undefined : true),
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    'import.meta.env': JSON.stringify({ MODE: process.env.NODE_ENV ?? 'production' }),
    'import.meta.resolve': 'undefined',
  },
  inputOptions: {
    resolve: {
      conditionNames: ['browser', 'import', 'require', 'default'],
    },
  },
  outputOptions: {
    entryFileNames: 'client.js',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify('dsh-brief-sidebar')}, factory: (require) => {`,
    footer: `return module.exports; } });`,
    intro: 'var module = { exports: {} }; var exports = module.exports;',
    codeSplitting: false,
  },
}

export default [hostConfig, clientConfig]
