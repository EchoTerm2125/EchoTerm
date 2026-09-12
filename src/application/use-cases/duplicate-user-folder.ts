/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Use case: duplicate a user folder subtree
   ═══════════════════════════════════════════════════════════════════════════ */

import type { UserFolder } from '../../domain/entities/ssh';
import type { UserFolderRepository } from '../../domain/ports/user-folder-repository';

export class DuplicateUserFolder {
  constructor(private readonly folders: UserFolderRepository) {}

  /** Throws when the folder does not exist. */
  execute(id: string): UserFolder {
    return this.folders.duplicate(id);
  }
}
