/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Use case: delete a folder subtree
   ═══════════════════════════════════════════════════════════════════════════ */

import type { FolderRepository } from '../../domain/ports/folder-repository';

export class DeleteFolder {
  constructor(private readonly folders: FolderRepository) {}

  /** Throws when the folder does not exist. */
  execute(id: string): void {
    this.folders.delete(id);
  }
}
