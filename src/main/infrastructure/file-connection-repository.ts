/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Infrastructure adapter: SSH connection persistence
   Implements the domain ConnectionRepository port on the vault's JSON payload.
   ═══════════════════════════════════════════════════════════════════════════ */

import type { Connection, ResolvedConnection, ResolvedJumpHost } from '../../domain/entities/ssh';
import type { ConnectionRepository } from '../../domain/ports/connection-repository';
import type { CryptoVault } from './crypto-vault';
import { nextId } from './ssh-data';
import type { StoredConnection } from './ssh-data';

export class FileConnectionRepository implements ConnectionRepository {
  constructor(private readonly vault: CryptoVault) {}

  list(): Connection[] {
    const data = this.vault.getData();
    if (!data) return [];
    return data.connections.map(c => this.toEntity(c));
  }

  findById(id: string): Connection | null {
    const data = this.vault.getData();
    if (!data) return null;
    const stored = data.connections.find(c => c.id === id);
    return stored ? this.toEntity(stored) : null;
  }

  findResolvedById(id: string): ResolvedConnection | null {
    const data = this.vault.getData();
    if (!data) return null;
    const conn = data.connections.find(c => c.id === id);
    if (!conn) return null;
    const user = data.users.find(u => u.id === conn.userId);

    // Resolve jump host auth info (for referenced connections)
    let resolvedJumpHost: ResolvedJumpHost | null = null;
    if (conn.jumpHost) {
      if (conn.jumpHost.type === 'manual') {
        resolvedJumpHost = {
          host: conn.jumpHost.host,
          username: conn.jumpHost.username,
          port: conn.jumpHost.port,
          authType: conn.jumpHost.authType ?? null,
          keyFilePath: conn.jumpHost.keyFilePath ?? null,
        };
      } else if (conn.jumpHost.type === 'reference') {
        const refId = conn.jumpHost.connectionId;
        const jConn = data.connections.find(c => c.id === refId);
        if (jConn) {
          const jUser = data.users.find(u => u.id === jConn.userId);
          resolvedJumpHost = {
            host: jConn.host,
            username: jUser ? jUser.username : '',
            port: jConn.port || 22,
            authType: jUser ? jUser.authType : null,
            keyFilePath: jUser ? jUser.keyFilePath : null,
          };
        }
      }
    }

    return {
      id: conn.id,
      name: conn.name,
      host: conn.host,
      port: conn.port || 22,
      username: user ? user.username : null,
      authType: user ? user.authType : null,
      password: user ? user.password : null,
      keyFilePath: user ? user.keyFilePath : null,
      keyPassword: user ? user.keyPassword : null,
      resolvedJumpHost,
      hostKeyAlgorithms: conn.hostKeyAlgorithms || null,
      kexAlgorithms: conn.kexAlgorithms || null,
      pubkeyAcceptedAlgorithms: conn.pubkeyAcceptedAlgorithms || null,
    };
  }

  save(connection: Connection): Connection {
    const data = this.vault.ensureData();
    const connections = data.connections;

    // ── Normalize: accept both folderId and groupId (legacy) ──
    // Convert legacy groupId → folderId so the data store stays consistent
    const connData = connection as Connection & { groupId?: string | null };
    if (connData.groupId !== undefined && connData.folderId === undefined) {
      connData.folderId = connData.groupId;
    }
    const effectiveFolderId = connData.folderId !== undefined ? connData.folderId : null;

    // Track old folder for sync (use folderId or legacy groupId)
    let oldFolderId: string | null = null;
    if (connData.id) {
      const existing = connections.find(c => c.id === connData.id);
      if (existing) oldFolderId = existing.folderId || existing.groupId || null;
    }

    let saved: StoredConnection;
    if (connData.id) {
      const idx = connections.findIndex(c => c.id === connData.id);
      if (idx === -1) throw new Error('Connection not found.');
      connections[idx] = { ...connections[idx], ...connData, id: connections[idx].id };
      // Clean up legacy groupId when folderId is explicitly provided
      if ('folderId' in connData) {
        delete connections[idx].groupId;
      }
      saved = connections[idx];
    } else {
      saved = {
        id: nextId('c', connections),
        name: connData.name || '',
        host: connData.host || '',
        port: connData.port || 22,
        userId: connData.userId || null,
        folderId: effectiveFolderId,
        jumpHost: connData.jumpHost || null,
        hostKeyAlgorithms: connData.hostKeyAlgorithms || null,
        kexAlgorithms: connData.kexAlgorithms || null,
        pubkeyAcceptedAlgorithms: connData.pubkeyAcceptedAlgorithms || null,
      };
      connections.push(saved);
    }

    // ── Sync folder connectionIds arrays ──
    const connId = saved.id;
    const newFolderId = effectiveFolderId;

    // Remove from old folder
    if (oldFolderId && oldFolderId !== newFolderId) {
      const oldFolder = data.connectionFolders.find(f => f.id === oldFolderId);
      if (oldFolder) {
        const fidx = oldFolder.connectionIds.indexOf(connId);
        if (fidx !== -1) oldFolder.connectionIds.splice(fidx, 1);
      }
    }

    // Add to new folder
    if (newFolderId) {
      const newFolder = data.connectionFolders.find(f => f.id === newFolderId);
      if (newFolder && !newFolder.connectionIds.includes(connId)) {
        newFolder.connectionIds.push(connId);
      }
    }

    this.vault.persist();
    return this.toEntity(saved);
  }

  delete(id: string): void {
    const data = this.vault.getData();
    if (!data) throw new Error('No data loaded.');
    const idx = data.connections.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Connection not found.');
    data.connections.splice(idx, 1);
    // Remove from any folders
    for (const folder of data.connectionFolders) {
      const fidx = folder.connectionIds.indexOf(id);
      if (fidx !== -1) folder.connectionIds.splice(fidx, 1);
    }
    this.vault.persist();
  }

  private toEntity(stored: StoredConnection): Connection {
    return {
      id: stored.id,
      name: stored.name,
      host: stored.host,
      port: stored.port || 22,
      userId: stored.userId || null,
      folderId: stored.folderId || stored.groupId || null,
      jumpHost: stored.jumpHost || null,
      hostKeyAlgorithms: stored.hostKeyAlgorithms || null,
      kexAlgorithms: stored.kexAlgorithms || null,
      pubkeyAcceptedAlgorithms: stored.pubkeyAcceptedAlgorithms || null,
    };
  }
}
