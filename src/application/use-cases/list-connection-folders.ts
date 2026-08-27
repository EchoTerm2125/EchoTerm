/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Use case: list connection folders
   ═══════════════════════════════════════════════════════════════════════════ */

import type { ConnectionFolder } from '../../domain/entities/ssh';
import type { ConnectionFolderRepository } from '../../domain/ports/connection-folder-repository';

export class ListConnectionFolders {
  constructor(private readonly folders: ConnectionFolderRepository) {}

  execute(): ConnectionFolder[] {
    return this.folders.list();
  }
}
