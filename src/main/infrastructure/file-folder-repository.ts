/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Infrastructure adapter: folder persistence
   Implements the domain FolderRepository port on the vault's JSON payload.
   ═══════════════════════════════════════════════════════════════════════════ */

import type { Folder } from '../../domain/entities/ssh';
import type { FolderRepository } from '../../domain/ports/folder-repository';
import { collectFolderAndDescendantIds, wouldCreateFolderCycle } from '../../domain/services/folder-tree';
import type { CryptoVault } from './crypto-vault';
import { nextId } from './ssh-data';
import type { StoredFolder } from './ssh-data';

export class FileFolderRepository implements FolderRepository {
  constructor(private readonly vault: CryptoVault) {}

  list(): Folder[] {
    const data = this.vault.getData();
    if (!data) return [];
    return data.folders.map(f => this.toEntity(f));
  }

  findById(id: string): Folder | null {
    const data = this.vault.getData();
    if (!data) return null;
    const stored = data.folders.find(f => f.id === id);
    return stored ? this.toEntity(stored) : null;
  }

  save(folder: Folder): Folder {
    const data = this.vault.ensureData();
    const folders = data.folders;

    // Legacy DTOs may carry the denormalized connectionIds array
    const folderData = folder as Folder & { connectionIds?: string[] };

    // Prevent cycles: ensure parentId is not self and not a descendant
    if (folderData.parentId) {
      if (folderData.id && folderData.parentId === folderData.id) {
        throw new Error('A folder cannot be its own parent.');
      }
      if (wouldCreateFolderCycle(this.list(), folderData.id, folderData.parentId)) {
        throw new Error('Cannot create a circular folder reference.');
      }
    }

    let saved: StoredFolder;
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

  delete(id: string): void {
    const data = this.vault.getData();
    if (!data) throw new Error('No data loaded.');
    const idx = data.folders.findIndex(f => f.id === id);
    if (idx === -1) throw new Error('Folder not found.');
    const parentId = data.folders[idx].parentId || null;
    // Collect the folder and all descendant folders (domain service)
    const deletedIds = collectFolderAndDescendantIds(this.list(), id);
    // Unlink connections from the deleted folders (move them to the parent)
    for (const conn of data.connections) {
      if (conn.folderId && deletedIds.has(conn.folderId)) conn.folderId = parentId;
    }
    data.folders = data.folders.filter(f => !deletedIds.has(f.id));
    this.vault.persist();
  }

  private toEntity(stored: StoredFolder): Folder {
    return { id: stored.id, name: stored.name, parentId: stored.parentId || null };
  }
}
