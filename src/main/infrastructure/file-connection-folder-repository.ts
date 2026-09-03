/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Infrastructure adapter: connection folder persistence
   Implements the domain ConnectionFolderRepository port on the vault's JSON payload.
   ═══════════════════════════════════════════════════════════════════════════ */

import type { ConnectionFolder } from '../../domain/entities/ssh';
import type { ConnectionFolderRepository } from '../../domain/ports/connection-folder-repository';
import { collectFolderAndDescendantIds, wouldCreateFolderCycle } from '../../domain/services/folder-tree';
import type { CryptoVault } from './crypto-vault';
import { nextId } from './ssh-data';
import type { StoredConnectionFolder } from './ssh-data';

export class FileConnectionFolderRepository implements ConnectionFolderRepository {
  constructor(private readonly vault: CryptoVault) {}

  list(): ConnectionFolder[] {
    const data = this.vault.getData();
    if (!data) return [];
    return data.connectionFolders.map(f => this.toEntity(f));
  }

  findById(id: string): ConnectionFolder | null {
    const data = this.vault.getData();
    if (!data) return null;
    const stored = data.connectionFolders.find(f => f.id === id);
    return stored ? this.toEntity(stored) : null;
  }

  save(folder: ConnectionFolder): ConnectionFolder {
    const data = this.vault.ensureData();
    const folders = data.connectionFolders;

    // Legacy DTOs may carry the denormalized connectionIds array
    const folderData = folder as ConnectionFolder & { connectionIds?: string[] };

    // Prevent cycles: ensure parentId is not self and not a descendant
    if (folderData.parentId) {
      if (folderData.id && folderData.parentId === folderData.id) {
        throw new Error('A folder cannot be its own parent.');
      }
      if (wouldCreateFolderCycle(this.list(), folderData.id, folderData.parentId)) {
        throw new Error('Cannot create a circular folder reference.');
      }
    }

    let saved: StoredConnectionFolder;
    if (folderData.id) {
      const idx = folders.findIndex(f => f.id === folderData.id);
      if (idx === -1) throw new Error('Folder not found.');
      folders[idx] = { ...folders[idx], ...folderData, id: folders[idx].id };
      saved = folders[idx];
    } else {
      saved = {
        id: nextId('g', folders),
        name: folderData.name || '',
        parentId: folderData.parentId || null,
        connectionIds: folderData.connectionIds || [],
      };
      folders.push(saved);
    }
    this.vault.persist();
    return this.toEntity(saved);
  }

  /** Cascade delete: removes the folder subtree and every contained connection. */
  delete(id: string): void {
    const data = this.vault.getData();
    if (!data) throw new Error('No data loaded.');
    const idx = data.connectionFolders.findIndex(f => f.id === id);
    if (idx === -1) throw new Error('Folder not found.');
    // Collect the folder and all descendant folders (domain service)
    const deletedIds = collectFolderAndDescendantIds(this.list(), id);
    // Cascade: delete every connection inside the deleted subtree
    const deletedConnectionIds = new Set<string>();
    data.connections = data.connections.filter(conn => {
      if (conn.folderId && deletedIds.has(conn.folderId)) {
        deletedConnectionIds.add(conn.id);
        return false;
      }
      return true;
    });
    // A surviving connection may reference a deleted connection as its jump
    // host; sever the link so connect never silently drops the jump hop.
    for (const conn of data.connections) {
      if (conn.jumpHost && conn.jumpHost.type === 'reference' && deletedConnectionIds.has(conn.jumpHost.connectionId)) {
        conn.jumpHost = null;
      }
    }
    // Sweep the deleted connection ids out of surviving folders' denormalized
    // connectionIds arrays (mirrors the single-connection delete cleanup).
    if (deletedConnectionIds.size > 0) {
      for (const folder of data.connectionFolders) {
        if (folder.connectionIds && folder.connectionIds.length > 0) {
          folder.connectionIds = folder.connectionIds.filter(cid => !deletedConnectionIds.has(cid));
        }
      }
    }
    data.connectionFolders = data.connectionFolders.filter(f => !deletedIds.has(f.id));
    this.vault.persist();
  }

  private toEntity(stored: StoredConnectionFolder): ConnectionFolder {
    return { id: stored.id, name: stored.name, parentId: stored.parentId || null };
  }
}
