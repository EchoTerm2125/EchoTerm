/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Use case: duplicate a connection folder subtree
   ═══════════════════════════════════════════════════════════════════════════ */

import type { ConnectionFolder } from '../../domain/entities/ssh';
import type { ConnectionFolderRepository } from '../../domain/ports/connection-folder-repository';

export class DuplicateConnectionFolder {
  constructor(private readonly folders: ConnectionFolderRepository) {}

  /** Throws when the folder does not exist. */
  execute(id: string): ConnectionFolder {
    return this.folders.duplicate(id);
  }
}
