/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — esbuild build script
   Compiles: main process, preload script, and the renderer bundle.
   Usage: node scripts/build.mjs [--watch]
   ═══════════════════════════════════════════════════════════════════════════ */

import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

const common = {
  bundle: true,
  sourcemap: true,
  logLevel: 'info',
  target: 'es2022',
};

const configs = [
  // Main process (CommonJS, electron + node-pty stay external)
  {
    entryPoints: ['main.ts'],
    outfile: 'build/main.js',
    platform: 'node',
    format: 'cjs',
    external: ['electron', 'node-pty'],
  },
  // Preload script (CommonJS, electron stays external)
  {
    entryPoints: ['preload.ts'],
    outfile: 'build/preload.js',
    platform: 'node',
    format: 'cjs',
    external: ['electron'],
  },
  // Renderer bundle (browser IIFE)
  {
    entryPoints: ['renderer/entry.ts'],
    outfile: 'build/renderer.js',
    platform: 'browser',
    format: 'iife',
  },
];

if (watch) {
  const contexts = await Promise.all(configs.map((c) => esbuild.context({ ...common, ...c })));
  await Promise.all(contexts.map((ctx) => ctx.watch()));
  await Promise.all(contexts.map((ctx) => ctx.rebuild()));
  console.log('[esbuild] watching for changes...');
} else {
  for (const c of configs) {
    await esbuild.build({ ...common, ...c });
  }
}
