/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Domain port: user folder persistence
   Implemented by an infrastructure adapter (Phase 3).
   ═══════════════════════════════════════════════════════════════════════════ */

import type { UserFolder } from '../entities/ssh';

export interface UserFolderRepository {
  list(): UserFolder[];
  findById(id: string): UserFolder | null;
  /**
   * Creates or updates. Throws when saving would create a circular
   * folder reference.
   */
  save(folder: UserFolder): UserFolder;
  /** Cascade-deletes the folder subtree: all sub-folders and every contained user. */
  delete(id: string): void;
}
