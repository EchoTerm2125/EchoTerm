/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Domain port: folder persistence
   Implemented by an infrastructure adapter (Phase 3).
   ═══════════════════════════════════════════════════════════════════════════ */

import type { Folder } from '../entities/ssh';

export interface FolderRepository {
  list(): Folder[];
  findById(id: string): Folder | null;
  /**
   * Creates or updates. Throws when saving would create a circular
   * folder reference.
   */
  save(folder: Folder): Folder;
  /** Removes the folder subtree; contained connections move to the deleted folder's parent. */
  delete(id: string): void;
}
