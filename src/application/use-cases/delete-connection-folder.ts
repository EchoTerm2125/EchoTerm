/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Use case: cascade-delete a connection folder subtree
   ═══════════════════════════════════════════════════════════════════════════ */

import type { ConnectionFolderRepository } from '../../domain/ports/connection-folder-repository';

export class DeleteConnectionFolder {
  constructor(private readonly folders: ConnectionFolderRepository) {}

  /** Throws when the folder does not exist. */
  execute(id: string): void {
    this.folders.delete(id);
  }
}
