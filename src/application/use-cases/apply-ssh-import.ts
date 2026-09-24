/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Use case: apply a checked import (SSH config or WinSCP) in one batch
   Runs the user/connection saves in-memory and persists the vault exactly once.
   ═══════════════════════════════════════════════════════════════════════════ */

import type { Connection, ConnectionFolder, User } from '../../domain/entities/ssh';
import type { ConnectionFolderRepository } from '../../domain/ports/connection-folder-repository';
import type { ConnectionRepository } from '../../domain/ports/connection-repository';
import type { UserRepository } from '../../domain/ports/user-repository';
import type { Vault } from '../../domain/ports/vault';
import type { SshImportApplyHost, SshImportApplyResult } from '../../../shared/ipc';

export interface ApplySshImportOptions {
  mode: 'import' | 'update';
  doHost: boolean;
  doUser: boolean;
  doJump: boolean;
  doOptions: boolean;
}

/** Stable dedup key that mirrors the renderer's user-matching condition. */
function userKeyFor(username: string, authType: 'password' | 'keyfile', keyFilePath: string | null): string {
  return authType === 'keyfile'
    ? `${username}\0keyfile\0${keyFilePath ?? ''}`
    : `${username}\0password`;
}

export class ApplySshImport {
  constructor(
    private readonly vault: Vault,
    private readonly users: UserRepository,
    private readonly connections: ConnectionRepository,
    private readonly folders: ConnectionFolderRepository,
  ) {}

  execute(hosts: SshImportApplyHost[], opts: ApplySshImportOptions): SshImportApplyResult {
    const result: SshImportApplyResult = { success: true, imported: 0, updated: 0, skipped: [] };

    const userByKey = new Map<string, User>();
    for (const u of this.users.list()) {
      const key = userKeyFor(u.username, u.authType, u.keyFilePath);
      if (!userByKey.has(key)) userByKey.set(key, u);
    }

    const connById = new Map<string, Connection>();
    for (const c of this.connections.list()) {
      connById.set(c.id, c);
    }

    // WinSCP sites carry a folder path; the ssh-config source never does, so the
    // existing folder tree is only walked when there is something to mirror.
    const folderIdByPath = hosts.some(h => h.folderPath) ? this.buildFolderIndex() : new Map<string, string>();

    const jumpLinks: Array<{ proxyJump: string; connId: string }> = [];

    this.vault.beginBatch();
    try {
      for (const host of hosts) {
        try {
          const userId = this.resolveUserId(host, userByKey, opts);
          const existing = host.existingConnId ? (connById.get(host.existingConnId) ?? null) : null;
          // Folders are mirrored for new connections only: an update keeps the
          // connection where the user already put it.
          const folderId = existing ? existing.folderId : this.resolveFolderId(host.folderPath, folderIdByPath);
          const conn = this.buildConnection(host, userId, existing, folderId, opts);
          const saved = this.connections.save(conn);

          if (existing) result.updated++;
          else result.imported++;

          if (host.proxyJump && (opts.mode === 'import' || opts.doJump)) {
            jumpLinks.push({ proxyJump: host.proxyJump, connId: saved.id });
          }
        } catch (err) {
          result.skipped.push({ name: host.name, error: (err as Error).message });
        }
      }

      // Second pass: link jump hosts to saved connections by name.
      if (jumpLinks.length > 0) {
        const allConns = this.connections.list();
        for (const link of jumpLinks) {
          const jumpConn = allConns.find(c => c.name.toLowerCase() === link.proxyJump.toLowerCase());
          if (jumpConn) {
            this.connections.save({
              id: link.connId,
              jumpHost: { type: 'reference', connectionId: jumpConn.id },
            } as Connection);
          }
        }
      }
    } finally {
      this.vault.endBatch();
    }

    return result;
  }

  private resolveUserId(
    host: SshImportApplyHost,
    userByKey: Map<string, User>,
    opts: ApplySshImportOptions,
  ): string {
    const username = host.user || '';
    const key = userKeyFor(username, host.identityFile ? 'keyfile' : 'password', host.identityFile);

    const existing = userByKey.get(key);
    if (existing) {
      // Only WinSCP imports carry a password, and only the user group may
      // replace one: an import with no password leaves the stored one alone.
      if (host.password && opts.doUser && existing.password !== host.password) {
        const saved = this.users.save({ ...existing, password: host.password });
        userByKey.set(key, saved);
        return saved.id;
      }
      return existing.id;
    }

    const saved = this.users.save({
      name: username || 'User',
      username,
      authType: host.identityFile ? 'keyfile' : 'password',
      password: host.password || '',
      keyFilePath: host.identityFile || null,
      keyPassword: null,
    } as User);
    userByKey.set(key, saved);
    return saved.id;
  }

  /** Every existing folder as "lowercased/path" → id, so mirroring can reuse it. */
  private buildFolderIndex(): Map<string, string> {
    const folders = this.folders.list();
    const byId = new Map(folders.map(folder => [folder.id, folder]));
    const index = new Map<string, string>();

    for (const folder of folders) {
      const segments: string[] = [];
      const seen = new Set<string>();
      let current: ConnectionFolder | undefined = folder;
      while (current && !seen.has(current.id)) {
        seen.add(current.id);
        segments.unshift(current.name);
        current = current.parentId ? byId.get(current.parentId) : undefined;
      }
      index.set(segments.join('/').toLowerCase(), folder.id);
    }
    return index;
  }

  /** Mirror a WinSCP folder path, creating only the levels that are missing. */
  private resolveFolderId(folderPath: string | null | undefined, index: Map<string, string>): string | null {
    const segments = (folderPath || '').split('/').filter(segment => segment.length > 0);
    if (segments.length === 0) return null;

    let parentId: string | null = null;
    for (let i = 1; i <= segments.length; i++) {
      const path = segments.slice(0, i).join('/');
      const key = path.toLowerCase();
      const known = index.get(key);
      if (known) {
        parentId = known;
        continue;
      }
      const created: ConnectionFolder = this.folders.save({ name: segments[i - 1], parentId } as ConnectionFolder);
      index.set(key, created.id);
      parentId = created.id;
    }
    return parentId;
  }

  private buildConnection(
    host: SshImportApplyHost,
    userId: string,
    existing: Connection | null,
    folderId: string | null,
    opts: ApplySshImportOptions,
  ): Connection {
    const conn = {
      name: host.name,
      host: host.host,
      port: host.port,
      userId,
      folderId,
    } as Connection;

    if (existing) {
      conn.id = existing.id;
      conn.hostKeyAlgorithms = opts.doOptions
        ? (host.hostKeyAlgorithms || existing.hostKeyAlgorithms || null)
        : (existing.hostKeyAlgorithms ?? null);
      conn.kexAlgorithms = opts.doOptions
        ? (host.kexAlgorithms || existing.kexAlgorithms || null)
        : (existing.kexAlgorithms ?? null);
      conn.pubkeyAcceptedAlgorithms = opts.doOptions
        ? (host.pubkeyAcceptedAlgorithms || existing.pubkeyAcceptedAlgorithms || null)
        : (existing.pubkeyAcceptedAlgorithms ?? null);
      conn.ciphers = opts.doOptions
        ? (host.ciphers || existing.ciphers || null)
        : (existing.ciphers ?? null);
      conn.macs = opts.doOptions
        ? (host.macs || existing.macs || null)
        : (existing.macs ?? null);
      conn.caSignatureAlgorithms = opts.doOptions
        ? (host.caSignatureAlgorithms || existing.caSignatureAlgorithms || null)
        : (existing.caSignatureAlgorithms ?? null);
      conn.compression = opts.doOptions
        ? (host.compression || existing.compression || null)
        : (existing.compression ?? null);
      if (!opts.doHost) {
        conn.host = existing.host;
        conn.port = existing.port;
      }
      if (!opts.doUser) {
        conn.userId = existing.userId;
      }
    } else {
      conn.hostKeyAlgorithms = host.hostKeyAlgorithms || null;
      conn.kexAlgorithms = host.kexAlgorithms || null;
      conn.pubkeyAcceptedAlgorithms = host.pubkeyAcceptedAlgorithms || null;
      conn.ciphers = host.ciphers || null;
      conn.macs = host.macs || null;
      conn.caSignatureAlgorithms = host.caSignatureAlgorithms || null;
      conn.compression = host.compression || null;
    }

    return conn;
  }
}
