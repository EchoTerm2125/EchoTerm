/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Domain entities: SSH users, connections, folders
   Canonical domain models. Deliberately distinct from the frozen IPC DTOs
   in shared/ipc.ts; adapters map between the two.
   ═══════════════════════════════════════════════════════════════════════════ */

export type AuthType = 'password' | 'keyfile';

/** A stored SSH identity used to authenticate against hosts. */
export interface User {
  id: string;
  name: string;
  username: string;
  authType: AuthType;
  password: string | null;
  keyFilePath: string | null;
  keyPassword: string | null;
}

/** Jump host entered inline on a connection. */
export interface ManualJumpHost {
  type: 'manual';
  host: string;
  username: string;
  port: number;
  authType: AuthType | null;
  keyFilePath: string | null;
}

/** Jump host that references another stored connection by id. */
export interface ReferencedJumpHost {
  type: 'reference';
  connectionId: string;
}

export type JumpHost = ManualJumpHost | ReferencedJumpHost;

/** A stored SSH connection definition. */
export interface Connection {
  id: string;
  name: string;
  host: string;
  port: number;
  userId: string | null;
  folderId: string | null;
  jumpHost: JumpHost | null;
  /** Optional ssh_config-style algorithm overrides (for legacy servers). */
  hostKeyAlgorithms: string | null;
  kexAlgorithms: string | null;
  pubkeyAcceptedAlgorithms: string | null;
}

/** Folder grouping connections and sub-folders (tree via parentId). */
export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
}

/** Jump host reduced to concrete host/auth details (manual, or a resolved reference). */
export interface ResolvedJumpHost {
  host: string;
  username: string;
  port: number;
  authType: AuthType | null;
  keyFilePath: string | null;
}

/** Connection with user credentials inlined and jump host resolved — ready to connect. */
export interface ResolvedConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string | null;
  authType: AuthType | null;
  password: string | null;
  keyFilePath: string | null;
  keyPassword: string | null;
  resolvedJumpHost: ResolvedJumpHost | null;
  /** Optional ssh_config style algorithm overrides (for legacy servers). */
  hostKeyAlgorithms: string | null;
  kexAlgorithms: string | null;
  pubkeyAcceptedAlgorithms: string | null;
}
