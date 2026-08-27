/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Use case: create or update a connection folder
   ═══════════════════════════════════════════════════════════════════════════ */

import type { ConnectionFolder } from '../../domain/entities/ssh';
import type { ConnectionFolderRepository } from '../../domain/ports/connection-folder-repository';

export class SaveConnectionFolder {
  constructor(private readonly folders: ConnectionFolderRepository) {}

  /** Throws on circular folder references or when the folder does not exist. */
  execute(folder: ConnectionFolder): ConnectionFolder {
    return this.folders.save(folder);
  }
}
