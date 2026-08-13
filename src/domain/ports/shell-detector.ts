/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Domain port: available shell discovery/resolution
   Implemented by an infrastructure adapter (Phase 3).
   ═══════════════════════════════════════════════════════════════════════════ */

export interface ResolvedShell {
  command: string;
  args: string[];
}

export interface ShellDetector {
  /** Keys of the shells known to be available on this machine. */
  listShellKeys(): string[];
  /** Path to Git Bash if it was located, otherwise null. */
  getGitBashPath(): string | null;
  /** Updates the detected Git Bash location (user located it via dialog). */
  setGitBashPath(path: string): void;
  /** Resolves a shell key to a spawnable command, or null if unknown. */
  resolveShell(shellKey: string): ResolvedShell | null;
}
