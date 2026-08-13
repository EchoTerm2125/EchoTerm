/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Use case: apply a checked SSH config import in a single batch
   Runs the user/connection saves in-memory and persists the vault exactly once.
   ═══════════════════════════════════════════════════════════════════════════ */

import type { Connection, User } from '../../domain/entities/ssh';
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

    const jumpLinks: Array<{ proxyJump: string; connId: string }> = [];

    this.vault.beginBatch();
    try {
      for (const host of hosts) {
        try {
          const userId = this.resolveUserId(host, userByKey);
          const existing = host.existingConnId ? (connById.get(host.existingConnId) ?? null) : null;
          const conn = this.buildConnection(host, userId, existing, opts);
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

  private resolveUserId(host: SshImportApplyHost, userByKey: Map<string, User>): string {
    const username = host.user || '';
    const key = userKeyFor(username, host.identityFile ? 'keyfile' : 'password', host.identityFile);

    const existing = userByKey.get(key);
    if (existing) return existing.id;

    const saved = this.users.save({
      name: username || 'User',
      username,
      authType: host.identityFile ? 'keyfile' : 'password',
      password: '',
      keyFilePath: host.identityFile || null,
      keyPassword: null,
    } as User);
    userByKey.set(key, saved);
    return saved.id;
  }

  private buildConnection(
    host: SshImportApplyHost,
    userId: string,
    existing: Connection | null,
    opts: ApplySshImportOptions,
  ): Connection {
    const conn = {
      name: host.name,
      host: host.host,
      port: host.port,
      userId,
      folderId: existing ? existing.folderId : null,
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
    }

    return conn;
  }
}
