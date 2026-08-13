/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — dependency-cruiser config (Clean Architecture enforcement)
   Run:  npm run lint:arch
   ═══════════════════════════════════════════════════════════════════════════ */

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'domain-isolated',
      comment: 'domain may only import other domain modules (no Node/Electron/DOM)',
      severity: 'error',
      from: { path: '^src/domain/' },
      to: { pathNot: '^src/domain/' },
    },
    {
      name: 'application-deps',
      comment: 'application may only import application/domain/shared',
      severity: 'error',
      from: { path: '^src/application/' },
      to: { pathNot: '^(src/(application|domain)|shared)/' },
    },
    {
      name: 'infrastructure-no-inner',
      comment: 'infrastructure must not import application/controllers/renderer/main.ts',
      severity: 'error',
      from: { path: '^src/main/infrastructure/' },
      to: { path: '^src/(application|main/controllers)/|^renderer/|^main\\.ts$' },
    },
    {
      name: 'controllers-deps',
      comment: 'controllers must not import infrastructure/renderer/main.ts',
      severity: 'error',
      from: { path: '^src/main/controllers/' },
      to: { path: '^src/main/infrastructure/|^renderer/|^main\\.ts$' },
    },
    {
      name: 'renderer-no-backend',
      comment: 'renderer must not import main-process internals',
      severity: 'error',
      from: { path: '^renderer/' },
      to: { path: '^src/|^main\\.ts$' },
    },
    {
      name: 'no-circular',
      comment: 'circular dependencies break layering',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-orphans',
      comment: 'unreferenced modules (src/ excluded during migration)',
      severity: 'warn',
      from: { orphan: true, pathNot: '^src/' },
      to: {},
    },
  ],
  options: {
    tsConfig: { fileName: 'tsconfig.json' },
    // Include type-only imports (`import type`) so DTO/contract deps are tracked
    tsPreCompilationDeps: true,
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '^(build|dist|coverage|test-results)/' },
    reporterOptions: { text: { highlightFocused: true } },
  },
};
