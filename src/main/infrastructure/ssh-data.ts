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
  folderId?: string | null;
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

export interface StoredConnectionFolder {
  id: string;
  name: string;
  parentId?: string | null;
  /** Denormalized list kept in sync on connection writes; reads recompute it. */
  connectionIds?: string[];
}

export interface StoredUserFolder {
  id: string;
  name: string;
  parentId?: string | null;
}

export interface SshData {
  users: StoredUser[];
  connections: StoredConnection[];
  connectionFolders: StoredConnectionFolder[];
  userFolders: StoredUserFolder[];
  version: number;
}

export function defaultData(): SshData {
  return { users: [], connections: [], connectionFolders: [], userFolders: [], version: 3 };
}

/**
 * Migrate a raw (decrypted) payload into the current v3 shape.
 * v2 files carry `folders` for connection folders and no `userFolders`;
 * returns `changed: true` so the vault can persist the new format on load.
 * Legacy `groupId` on connections is normalized to `folderId` so every
 * consumer (cascade delete, tree views) reads a single canonical field.
 */
export function migrateData(raw: unknown): { data: SshData; changed: boolean } {
  if (!raw || typeof raw !== 'object') {
    return { data: defaultData(), changed: false };
  }
  const src = raw as Record<string, unknown>;
  let changed = false;

  // Drop non-object entries before touching them: a NaN/string/null element
  // would otherwise throw inside the groupId scan below and silently wipe the
  // whole payload via the vault's "not valid JSON" fallback.
  const asRecords = (arr: unknown): Record<string, unknown>[] =>
    Array.isArray(arr) ? arr.filter((v): v is Record<string, unknown> => !!v && typeof v === 'object') : [];

  const users = asRecords(src.users) as unknown as StoredUser[];
  const rawConnections = asRecords(src.connections) as unknown as StoredConnection[];
  // v2 → v3: a connection may carry only `groupId`; lift it into `folderId`
  // and drop the legacy field so deletes and tree joins never see two shapes.
  const hasLegacyGroupId = rawConnections.some(c => c.groupId !== undefined);
  let connections = rawConnections;
  if (hasLegacyGroupId) {
    connections = rawConnections.map(c => {
      if (c.groupId === undefined) return c;
      const { groupId, ...rest } = c;
      return { ...rest, folderId: rest.folderId ?? groupId ?? null };
    });
    changed = true;
  }
  // Missing keys are normalized to empty arrays; flag it so the canonical
  // shape is persisted back instead of being re-derived on every load.
  if (!Array.isArray(src.users) || !Array.isArray(src.connections)) changed = true;

  let connectionFolders: StoredConnectionFolder[];
  if (Array.isArray(src.connectionFolders)) {
    connectionFolders = asRecords(src.connectionFolders) as unknown as StoredConnectionFolder[];
  } else if (Array.isArray(src.folders)) {
    // v2 → v3: legacy `folders` key becomes `connectionFolders`
    connectionFolders = asRecords(src.folders) as unknown as StoredConnectionFolder[];
    changed = true;
  } else {
    connectionFolders = [];
    changed = true;
  }

  let userFolders: StoredUserFolder[];
  if (Array.isArray(src.userFolders)) {
    userFolders = asRecords(src.userFolders) as unknown as StoredUserFolder[];
  } else {
    userFolders = [];
    changed = true;
  }

  const version = typeof src.version === 'number' ? src.version : 2;
  if (version !== 3) changed = true;

  return { data: { users, connections, connectionFolders, userFolders, version: 3 }, changed };
}

export function nextId(prefix: string, items: { id: string }[]): string {
  let max = 0;
  for (const item of items) {
    const num = parseInt(item.id.replace(prefix, ''), 10);
    if (!isNaN(num) && num > max) max = num;
  }
  return `${prefix}${max + 1}`;
}
