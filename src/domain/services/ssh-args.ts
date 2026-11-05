/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Domain service: SSH command-line construction
   Pure logic — no Node/Electron imports allowed (see .dependency-cruiser.cjs).
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Build the ssh.exe argument list for a session.
 * All host, jump-host and algorithm settings live in the per-session config
 * file (rendered by renderSessionSshConfig, written by SessionConfigStore);
 * ssh resolves them natively via -F — no nested command strings to quote.
 *
 * @param configPath absolute path returned by SessionConfigStore.write()
 * @param target     real host name to connect to: ssh matches Host patterns
 *                   (the session config's and the user's own) against the name
 *                   given on the command line, so the alias alone is not enough
 */
export function buildSshArgs(configPath: string, target: string): string[] {
  return ['-F', configPath, target];
}
