/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Shared IPC contracts (main ↔ preload ↔ renderer)
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── Shells ──────────────────────────────────────────────────────────────────
export type ShellKey = 'powershell' | 'cmd' | 'gitbash' | 'ssh';

export interface ShellInfo {
  shells: string[];
  gitBashPath: string | null;
}

// ─── Terminal spawn ──────────────────────────────────────────────────────────
export interface SpawnResult {
  id?: number;
  shell?: string;
  label?: string;
  host?: string;
  error?: string;
  errorCode?: 'GIT_BASH_NOT_FOUND' | 'UNKNOWN_SHELL' | 'CONNECTION_NOT_FOUND' | string;
}

// ─── SSH models ──────────────────────────────────────────────────────────────
export type SshAuthType = 'password' | 'keyfile';

export interface SshUser {
  id?: string;
  name: string;
  username: string;
  authType: SshAuthType;
  password?: string | null;
  keyFilePath?: string | null;
  keyPassword?: string | null;
}

export interface SshJumpHostManual {
  type: 'manual';
  host?: string;
  username?: string;
  port?: number;
  authType?: SshAuthType;
  keyFilePath?: string | null;
}

export interface SshJumpHostReference {
  type: 'reference';
  connectionId: string;
}

export type SshJumpHost = SshJumpHostManual | SshJumpHostReference;

export interface SshConnection {
  id?: string;
  name?: string;
  host?: string;
  port?: number;
  username?: string | null;
  /** Reference to a stored SshUser, or null for per-connection credentials */
  userId?: string | null;
  authType?: SshAuthType | null;
  password?: string | null;
  keyFilePath?: string | null;
  keyPassword?: string | null;
  folderId?: string | null;
  jumpHost?: SshJumpHost | null;
  /** Optional ssh_config style algorithm overrides (for legacy servers) */
  hostKeyAlgorithms?: string | null;
  kexAlgorithms?: string | null;
  pubkeyAcceptedAlgorithms?: string | null;
  /** Resolved display fields returned by main-process queries */
  userName?: string | null;
  /** Display string of the resolved jump host (e.g. "user@host" or referenced connection name) */
  jumpHostDisplay?: string | null;
  groupId?: string | null;
  /** Jump host resolved from a reference at connect time (main process only) */
  resolvedJumpHost?: SshJumpHostManual | null;
}

export interface SshFolder {
  id?: string;
  name?: string;
  parentId?: string | null;
  connectionIds?: string[];
}

// ─── IPC result shapes ───────────────────────────────────────────────────────
/** Loose result envelope — main process returns partial objects freely. */
export interface IpcOutcome {
  success?: boolean;
  error?: string;
  errorCode?: string;
  [key: string]: unknown;
}

export interface PasswordStatus {
  masterPasswordSet: boolean;
  unlocked: boolean;
}

export interface UnlockResult {
  success: boolean;
  error?: string;
  errorCode?: string;
}

export interface SshFolderOpen {
  name: string;
  connections: Array<{ id: string; name: string; host: string; username: string | null }>;
}

export interface SshConfigHost {
  name: string;
  aliases: string[];
  host: string;
  port: number;
  user: string;
  identityFile: string | null;
  proxyJump: string | null;
  hostKeyAlgorithms?: string | null;
  kexAlgorithms?: string | null;
  pubkeyAcceptedAlgorithms?: string | null;
}

export interface ImportConfigResult {
  canceled?: boolean;
  hosts?: SshConfigHost[];
  path?: string;
  error?: string;
  errorCode?: string;
}

export interface ExportConfigResult {
  canceled?: boolean;
  success?: boolean;
  path?: string;
  error?: string;
}

export interface SshImportApplyHost {
  name: string;
  host: string;
  port: number;
  user: string;
  identityFile: string | null;
  proxyJump: string | null;
  hostKeyAlgorithms: string | null;
  kexAlgorithms: string | null;
  pubkeyAcceptedAlgorithms: string | null;
  existingConnId: string | null;
}

export interface SshImportApplyRequest {
  hosts: SshImportApplyHost[];
  mode: 'import' | 'update';
  doHost: boolean;
  doUser: boolean;
  doJump: boolean;
  doOptions: boolean;
}

export interface SshImportApplyResult {
  success: boolean;
  imported: number;
  updated: number;
  skipped: Array<{ name: string; error: string }>;
  error?: string;
}

// ─── App info (About page) ───────────────────────────────────────────────────
export interface AppInfo {
  name: string;
  version: string;
}

// ─── The typed bridge exposed by preload.ts as window.api ───────────────────
export interface WindowApi {
  // Shell
  getDefaultShells(): Promise<ShellInfo>;
  locateGitBash(): Promise<{ path: string | null }>;

  // Terminal lifecycle
  spawnTerminal(shell: string): Promise<SpawnResult>;
  write(id: number, data: string): void;
  resize(id: number, cols: number, rows: number): void;
  killTerminal(id: number): void;

  // Terminal events (main → renderer)
  onData(callback: (id: number, data: string) => void): () => void;
  onExit(callback: (id: number) => void): () => void;

  // App lifecycle
  onConfirmClose(callback: () => void): () => void;
  confirmClose(): void;
  onSingleInstanceWarning(callback: () => void): () => void;

  // App info (About page)
  getAppInfo(): Promise<AppInfo>;

  // Cache
  clearCache(): Promise<IpcOutcome>;

  // App data reset (wipe all data and restart the app)
  clearAllData(): Promise<IpcOutcome>;

  // Window controls (custom titlebar)
  minimizeWindow(): void;
  toggleMaximizeWindow(): void;
  closeWindow(): void;
  isWindowMaximized(): Promise<boolean>;
  onWindowMaximizedChange(callback: (maximized: boolean) => void): () => void;

  // SSH password / unlock
  sshPasswordStatus(): Promise<PasswordStatus>;
  sshSetPassword(password: string): Promise<IpcOutcome>;
  sshUseSafeStorage(): Promise<IpcOutcome>;
  sshUnlock(password: string): Promise<UnlockResult>;
  sshTryUnlock(): Promise<UnlockResult>;

  // SSH store
  sshClearAll(): Promise<IpcOutcome>;

  // SSH users
  sshUserList(): Promise<SshUser[]>;
  sshUserSave(userData: SshUser): Promise<IpcOutcome & { user?: SshUser }>;
  sshUserDelete(userId: string): Promise<IpcOutcome>;

  // SSH connections
  sshConnectionList(): Promise<SshConnection[]>;
  sshConnectionSave(connData: SshConnection): Promise<IpcOutcome & { connection?: SshConnection }>;
  sshConnectionDelete(connId: string): Promise<IpcOutcome>;

  // SSH folders
  sshFolderList(): Promise<SshFolder[]>;
  sshFolderSave(folderData: SshFolder): Promise<IpcOutcome & { folder?: SshFolder }>;
  sshFolderDelete(folderId: string): Promise<IpcOutcome>;

  // SSH actions
  sshConnect(connectionId: string): Promise<SpawnResult>;
  sshOpenFolder(folderId: string): Promise<SshFolderOpen & { error?: string; errorCode?: string }>;
  sshImportConfig(filePath?: string): Promise<ImportConfigResult>;
  sshImportApply(request: SshImportApplyRequest): Promise<SshImportApplyResult>;
  sshExportConfig(): Promise<ExportConfigResult>;
}
