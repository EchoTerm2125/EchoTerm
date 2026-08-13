/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Domain port: encrypted credential vault
   Covers master-password and OS-credential (safeStorage) encryption modes.
   Implemented by an infrastructure adapter (Phase 3).
   ═══════════════════════════════════════════════════════════════════════════ */

export type VaultUnlockErrorCode =
  | 'NO_MASTER_PASSWORD'
  | 'INCORRECT_PASSWORD'
  | 'DECRYPT_FAILED'
  | 'MASTER_PASSWORD_REQUIRED';

export interface VaultUnlockResult {
  success: boolean;
  error?: string;
  errorCode?: VaultUnlockErrorCode | string;
}

export interface Vault {
  isMasterPasswordSet(): boolean;
  isUnlocked(): boolean;
  /** Sets (or replaces) the master password and re-encrypts stored data. */
  setMasterPassword(password: string): Promise<void>;
  unlockWithPassword(password: string): Promise<VaultUnlockResult>;
  /** Unlock using OS-level credentials (Electron safeStorage). */
  unlockWithOsCredentials(): VaultUnlockResult;
  /** Drop any master password and persist data with OS-level encryption. */
  useOsEncryption(): void;
  /** Wipe all stored SSH data (users, connections, folders) and persist the empty payload. */
  resetData(): void;
  /** Defer disk writes until endBatch() — used for multi-record bulk operations. */
  beginBatch(): void;
  /** Persist pending changes (single write). */
  endBatch(): void;
}
