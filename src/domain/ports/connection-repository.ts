/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Domain port: SSH connection persistence
   Implemented by an infrastructure adapter (Phase 3).
   ═══════════════════════════════════════════════════════════════════════════ */

import type { Connection, ResolvedConnection } from '../entities/ssh';

export interface ConnectionRepository {
  list(): Connection[];
  findById(id: string): Connection | null;
  /**
   * Connection with user credentials inlined and jump chain resolved, ready
   * to connect. A broken chain (cycle/dangling reference) is reported via
   * `jumpChainError` — callers must refuse to connect when it is set.
   */
  findResolvedById(id: string): ResolvedConnection | null;
  /** Creates or updates. Returns the stored connection (with its assigned id). */
  save(connection: Connection): Connection;
  delete(id: string): void;
}
