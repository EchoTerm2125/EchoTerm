/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Domain port: per-session ssh config file storage
   Abstracts temp-file I/O so the domain/application layers stay fs-free.
   Implemented by an infrastructure adapter.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface SessionConfigStore {
  /**
   * Persist a rendered session config and return its absolute path.
   * The path is owned by the adapter — never derived from stored/imported data.
   */
  write(alias: string, text: string): string;
  /** Delete a file previously returned by write(); a missing file is fine. */
  remove(path: string): void;
  /** Absolute path of the user's own ~/.ssh/config if it exists, else null. */
  userConfigPath(): string | null;
}
