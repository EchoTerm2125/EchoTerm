/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Use case: create or update a user folder
   ═══════════════════════════════════════════════════════════════════════════ */

import type { UserFolder } from '../../domain/entities/ssh';
import type { UserFolderRepository } from '../../domain/ports/user-folder-repository';

export class SaveUserFolder {
  constructor(private readonly folders: UserFolderRepository) {}

  /** Throws on circular folder references or when the folder does not exist. */
  execute(folder: UserFolder): UserFolder {
    return this.folders.save(folder);
  }
}
