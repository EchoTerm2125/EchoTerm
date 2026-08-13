/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Use case: create or update a folder
   ═══════════════════════════════════════════════════════════════════════════ */

import type { Folder } from '../../domain/entities/ssh';
import type { FolderRepository } from '../../domain/ports/folder-repository';

export class SaveFolder {
  constructor(private readonly folders: FolderRepository) {}

  /** Throws on circular folder references or when the folder does not exist. */
  execute(folder: Folder): Folder {
    return this.folders.save(folder);
  }
}
