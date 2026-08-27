/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Use case: open a connection folder
   (all connections in it and sub-folders)
   ═══════════════════════════════════════════════════════════════════════════ */

import type { ResolvedConnection } from '../../domain/entities/ssh';
import type { ConnectionRepository } from '../../domain/ports/connection-repository';
import type { ConnectionFolderRepository } from '../../domain/ports/connection-folder-repository';

export interface OpenConnectionFolderResult {
  name: string;
  connections: ResolvedConnection[];
}

export class OpenConnectionFolder {
  constructor(
    private readonly connections: ConnectionRepository,
    private readonly folders: ConnectionFolderRepository,
  ) {}

  /** Returns null when the folder does not exist. */
  execute(folderId: string): OpenConnectionFolderResult | null {
    const folder = this.folders.findById(folderId);
    if (!folder) return null;

    // Collect connection IDs from connections referencing this folder or any sub-folder
    const connIds: string[] = [];
    const collectFolderConns = (fid: string) => {
      for (const conn of this.connections.list()) {
        if (conn.folderId === fid) connIds.push(conn.id);
      }
      for (const sub of this.folders.list()) {
        if (sub.parentId === fid) collectFolderConns(sub.id);
      }
    };
    collectFolderConns(folderId);

    const connections = connIds
      .map(cid => this.connections.findResolvedById(cid))
      .filter((c): c is ResolvedConnection => c !== null);

    return { name: folder.name, connections };
  }
}
