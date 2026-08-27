/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Infrastructure adapter: user folder persistence
   Implements the domain UserFolderRepository port on the vault's JSON payload.
   ═══════════════════════════════════════════════════════════════════════════ */

import type { UserFolder } from '../../domain/entities/ssh';
import type { UserFolderRepository } from '../../domain/ports/user-folder-repository';
import { collectFolderAndDescendantIds, wouldCreateFolderCycle } from '../../domain/services/folder-tree';
import type { CryptoVault } from './crypto-vault';
import { nextId } from './ssh-data';
import type { StoredUserFolder } from './ssh-data';

export class FileUserFolderRepository implements UserFolderRepository {
  constructor(private readonly vault: CryptoVault) {}

  list(): UserFolder[] {
    const data = this.vault.getData();
    if (!data) return [];
    return data.userFolders.map(f => this.toEntity(f));
  }

  findById(id: string): UserFolder | null {
    const data = this.vault.getData();
    if (!data) return null;
    const stored = data.userFolders.find(f => f.id === id);
    return stored ? this.toEntity(stored) : null;
  }

  save(folder: UserFolder): UserFolder {
    const data = this.vault.ensureData();
    const folders = data.userFolders;

    // Prevent cycles: ensure parentId is not self and not a descendant
    if (folder.parentId) {
      if (folder.id && folder.parentId === folder.id) {
        throw new Error('A folder cannot be its own parent.');
      }
      if (wouldCreateFolderCycle(this.list(), folder.id, folder.parentId)) {
        throw new Error('Cannot create a circular folder reference.');
      }
    }

    let saved: StoredUserFolder;
    if (folder.id) {
      const idx = folders.findIndex(f => f.id === folder.id);
      if (idx === -1) throw new Error('Folder not found.');
      folders[idx] = { ...folders[idx], ...folder, id: folders[idx].id };
      saved = folders[idx];
    } else {
      saved = {
        id: nextId('uf', folders),
        name: folder.name || '',
        parentId: folder.parentId || null,
      };
      folders.push(saved);
    }
    this.vault.persist();
    return this.toEntity(saved);
  }

  /** Cascade delete: removes the folder subtree and every contained user. */
  delete(id: string): void {
    const data = this.vault.getData();
    if (!data) throw new Error('No data loaded.');
    const idx = data.userFolders.findIndex(f => f.id === id);
    if (idx === -1) throw new Error('Folder not found.');
    // Collect the folder and all descendant folders (domain service)
    const deletedIds = collectFolderAndDescendantIds(this.list(), id);
    // Cascade: delete every user inside the deleted subtree
    const deletedUserIds = new Set<string>();
    data.users = data.users.filter(u => {
      if (u.folderId && deletedIds.has(u.folderId)) {
        deletedUserIds.add(u.id);
        return false;
      }
      return true;
    });
    // Clear references to the deleted users from connections
    for (const conn of data.connections) {
      if (conn.userId && deletedUserIds.has(conn.userId)) conn.userId = null;
    }
    data.userFolders = data.userFolders.filter(f => !deletedIds.has(f.id));
    this.vault.persist();
  }

  private toEntity(stored: StoredUserFolder): UserFolder {
    return { id: stored.id, name: stored.name, parentId: stored.parentId || null };
  }
}
