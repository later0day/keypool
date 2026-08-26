import { defineConfig } from 'tsdown'

/**
 * Node-only bundle for the externalized keypool plugin: emits `lib/index.js`
 * (plugin entry) and `lib/invariant.js` (invariant companion) as ESM.
 * Every `@deepseek-ai/*` and `cordis` specifier is externalized so the plugin
 * binds to the host harness's live instances at load, never a second copy.
 * `.d.ts` come from `tsc -p tsconfig.build.json` (see build script); tsdown
 * emits runtime only.
 */
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    invariant: 'src/invariant.ts',
  },
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
  deps: {
    neverBundle: [/^@deepseek-ai\//, /^cordis(\/|$)/],
  },
})
