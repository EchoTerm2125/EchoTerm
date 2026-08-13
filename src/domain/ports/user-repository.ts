/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Domain port: SSH user persistence
   Implemented by an infrastructure adapter (Phase 3).
   ═══════════════════════════════════════════════════════════════════════════ */

import type { User } from '../entities/ssh';

export interface UserRepository {
  list(): User[];
  findById(id: string): User | null;
  /** Creates or updates. Returns the stored user (with its assigned id). */
  save(user: User): User;
  /** Deletes the user and clears its reference from any connections. */
  delete(id: string): void;
}
