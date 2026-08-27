/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Use case: list user folders
   ═══════════════════════════════════════════════════════════════════════════ */

import type { UserFolder } from '../../domain/entities/ssh';
import type { UserFolderRepository } from '../../domain/ports/user-folder-repository';

export class ListUserFolders {
  constructor(private readonly folders: UserFolderRepository) {}

  execute(): UserFolder[] {
    return this.folders.list();
  }
}
