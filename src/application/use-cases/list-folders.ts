/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Use case: list folders
   ═══════════════════════════════════════════════════════════════════════════ */

import type { Folder } from '../../domain/entities/ssh';
import type { FolderRepository } from '../../domain/ports/folder-repository';

export class ListFolders {
  constructor(private readonly folders: FolderRepository) {}

  execute(): Folder[] {
    return this.folders.list();
  }
}
