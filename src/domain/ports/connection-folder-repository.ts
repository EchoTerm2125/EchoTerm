/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Domain port: connection folder persistence
   Implemented by an infrastructure adapter (Phase 3).
   ═══════════════════════════════════════════════════════════════════════════ */

import type { ConnectionFolder } from '../entities/ssh';

export interface ConnectionFolderRepository {
  list(): ConnectionFolder[];
  findById(id: string): ConnectionFolder | null;
  /**
   * Creates or updates. Throws when saving would create a circular
   * folder reference.
   */
  save(folder: ConnectionFolder): ConnectionFolder;
  /** Cascade-deletes the folder subtree: all sub-folders and every contained connection. */
  delete(id: string): void;
}
