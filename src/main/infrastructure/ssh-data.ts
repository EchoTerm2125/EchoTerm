/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Persistence shape of the encrypted SSH data file
   Stored records may carry legacy fields (groupId, folder connectionIds);
   repositories normalize them into domain entities on read.
   ═══════════════════════════════════════════════════════════════════════════ */

import type { AuthType, JumpHost } from '../../domain/entities/ssh';

export interface StoredUser {
  id: string;
  name: string;
  username: string;
  authType: AuthType;
  password?: string | null;
  keyFilePath?: string | null;
  keyPassword?: string | null;
}

export interface StoredConnection {
  id: string;
  name: string;
  host: string;
  port?: number;
  userId?: string | null;
  folderId?: string | null;
  /** Legacy pre-folder-tree grouping field, superseded by folderId. */
  groupId?: string | null;
  jumpHost?: JumpHost | null;
  hostKeyAlgorithms?: string | null;
  kexAlgorithms?: string | null;
  pubkeyAcceptedAlgorithms?: string | null;
}

export interface StoredFolder {
  id: string;
  name: string;
  parentId?: string | null;
  /** Denormalized list kept in sync on connection writes; reads recompute it. */
  connectionIds?: string[];
}

export interface SshData {
  users: StoredUser[];
  connections: StoredConnection[];
  folders: StoredFolder[];
  version: number;
}

export function defaultData(): SshData {
  return { users: [], connections: [], folders: [], version: 2 };
}

export function nextId(prefix: string, items: { id: string }[]): string {
  let max = 0;
  for (const item of items) {
    const num = parseInt(item.id.replace(prefix, ''), 10);
    if (!isNaN(num) && num > max) max = num;
  }
  return `${prefix}${max + 1}`;
}
