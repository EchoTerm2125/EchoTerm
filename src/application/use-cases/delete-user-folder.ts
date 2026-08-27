/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Use case: cascade-delete a user folder subtree
   ═══════════════════════════════════════════════════════════════════════════ */

import type { UserFolderRepository } from '../../domain/ports/user-folder-repository';

export class DeleteUserFolder {
  constructor(private readonly folders: UserFolderRepository) {}

  /** Throws when the folder does not exist. */
  execute(id: string): void {
    this.folders.delete(id);
  }
}
