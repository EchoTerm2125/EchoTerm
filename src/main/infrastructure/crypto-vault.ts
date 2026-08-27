/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Infrastructure adapter: encrypted vault for SSH data
   Implements the domain Vault port. Owns the encrypted payload lifecycle in
   both master-password (AES-256) and OS-credential (safeStorage) modes.
   Repositories read/write the decrypted payload via getData/ensureData/persist.
   ═══════════════════════════════════════════════════════════════════════════ */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import type { Vault, VaultUnlockResult } from '../../domain/ports/vault';
import { defaultData, migrateData } from './ssh-data';
import type { SshData } from './ssh-data';

const PBKDF2_ITERATIONS = 600000;
const KEY_LENGTH = 32; // AES-256
const GCM_NONCE_LENGTH = 12;  // AES-GCM nonce

/** OS-level encryption primitive (Electron safeStorage). */
export interface OsCrypto {
  encryptString(plainText: string): Buffer;
  decryptString(encrypted: Buffer): string;
}

// ─── Password hashing (for verification) ─────────────────────────────────────
function hashPassword(password: string, salt: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, PBKDF2_ITERATIONS, 64, 'sha512', (err, key) => {
      if (err) reject(err);
      else resolve(key.toString('base64'));
    });
  });
}

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512', (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
}

// ─── AES encrypt / decrypt (AES-256-GCM, authenticated) ──────────────────────
function aesEncrypt(plaintext: string, key: Buffer): { encrypted: string; iv: string; tag: string } {
  const iv = crypto.randomBytes(GCM_NONCE_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    encrypted: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
  };
}

function aesDecrypt(encryptedBase64: string, ivBase64: string, tagBase64: string, key: Buffer): string {
  const iv = Buffer.from(ivBase64, 'base64');
  const encrypted = Buffer.from(encryptedBase64, 'base64');
  const tag = Buffer.from(tagBase64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

export class CryptoVault implements Vault {
  private readonly dataFile: string;
  private readonly keyFile: string;
  private cachedData: SshData | null = null;   // decrypted SSH data for the session
  private sessionKey: Buffer | null = null;    // derived encryption key (if custom password set)
  private customPasswordSet = false;           // whether user chose a custom master password
  private batching = false;                    // defer persist() until endBatch()

  constructor(dataDir: string, private readonly osCrypto: OsCrypto) {
    this.dataFile = path.join(dataDir, 'ssh-data.json');
    this.keyFile = path.join(dataDir, 'ssh-key.json');
  }

  // ─── Vault port ────────────────────────────────────────────────────────────

  isMasterPasswordSet(): boolean {
    this.ensureDir();
    return fs.existsSync(this.keyFile);
  }

  async setMasterPassword(password: string): Promise<void> {
    this.ensureDir();
    const salt = crypto.randomBytes(32);
    const [hashed, key] = await Promise.all([
      hashPassword(password, salt),
      deriveKey(password, salt),
    ]);

    // Encrypt current data (or default)
    const data = this.cachedData || defaultData();
    const json = JSON.stringify(data);
    const { encrypted, iv, tag } = aesEncrypt(json, key);

    // Store key file
    fs.writeFileSync(this.keyFile, JSON.stringify({
      hash: hashed,
      salt: salt.toString('base64'),
    }));

    // Store encrypted data
    fs.writeFileSync(this.dataFile, JSON.stringify({ encrypted, iv, tag }));

    // Cache for session
    this.sessionKey = key;
    this.cachedData = data;
    this.customPasswordSet = true;
  }

  isUnlocked(): boolean {
    return this.cachedData !== null;
  }

  async unlockWithPassword(password: string): Promise<VaultUnlockResult> {
    if (!this.isMasterPasswordSet()) {
      return { success: false, error: 'No master password set.', errorCode: 'NO_MASTER_PASSWORD' };
    }

    const keyData = JSON.parse(fs.readFileSync(this.keyFile, 'utf8'));
    const salt = Buffer.from(keyData.salt, 'base64');
    const expectedHash = keyData.hash;

    // Verify password
    const computedHash = await hashPassword(password, salt);
    if (computedHash !== expectedHash) {
      return { success: false, error: 'Incorrect password.', errorCode: 'INCORRECT_PASSWORD' };
    }

    // Derive key and decrypt data
    const key = await deriveKey(password, salt);
    const dataFile = JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));

    try {
      const json = aesDecrypt(dataFile.encrypted, dataFile.iv, dataFile.tag, key);
      const changed = this.setLoadedData(JSON.parse(json));
      this.sessionKey = key;
      this.customPasswordSet = true;
      if (changed) this.persist();
      return { success: true };
    } catch {
      return { success: false, error: 'Failed to decrypt data. File may be corrupted.', errorCode: 'DECRYPT_FAILED' };
    }
  }

  unlockWithOsCredentials(): VaultUnlockResult {
    this.ensureDir();
    if (!fs.existsSync(this.dataFile)) {
      this.cachedData = defaultData();
      return { success: true };
    }

    const raw = fs.readFileSync(this.dataFile, 'utf8');

    // Check if it's a JSON envelope first
    try {
      const parsed = JSON.parse(raw);
      if (parsed._safe && parsed._data) {
        // safeStorage-encrypted data
        try {
          const decrypted = this.osCrypto.decryptString(Buffer.from(parsed._data, 'base64'));
          const changed = this.setLoadedData(JSON.parse(decrypted));
          this.customPasswordSet = false;
          if (changed) this.persist();
          return { success: true };
        } catch {
          this.cachedData = defaultData();
          return { success: true };
        }
      }
      if (parsed.encrypted && parsed.iv) {
        // Custom password encrypted
        return { success: false, error: 'Master password required. Data is encrypted.', errorCode: 'MASTER_PASSWORD_REQUIRED' };
      }
      // Plain JSON (unencrypted)
      const changed = this.setLoadedData(parsed);
      this.customPasswordSet = false;
      if (changed) this.persist();
      return { success: true };
    } catch {
      // Not valid JSON — fall back to default
      this.cachedData = defaultData();
      return { success: true };
    }
  }

  useOsEncryption(): void {
    // User chose to skip custom password — use OS-level encryption
    this.ensureDir();
    this.customPasswordSet = false;
    const data = this.cachedData || defaultData();
    const json = JSON.stringify(data);
    const encrypted = this.osCrypto.encryptString(json);
    fs.writeFileSync(this.dataFile, JSON.stringify({ _safe: true, _data: encrypted.toString('base64') }));
    // Remove any old key file
    if (fs.existsSync(this.keyFile)) fs.unlinkSync(this.keyFile);
    // Ensure we set cachedData
    if (!this.cachedData) this.cachedData = data;
  }

  // ─── Payload access for repositories ───────────────────────────────────────

  /** Wipe all stored SSH data (users, connections, folders) and persist the empty payload. */
  resetData(): void {
    this.cachedData = defaultData();
    this.persist();
  }

  /** The decrypted payload, or null while the vault is locked. */
  getData(): SshData | null {
    return this.cachedData;
  }

  /** The decrypted payload, creating an empty one if the vault is locked. */
  ensureData(): SshData {
    if (!this.cachedData) this.cachedData = defaultData();
    return this.cachedData;
  }

  /** Re-encrypts and writes the payload using the active encryption mode. */
  persist(): void {
    if (!this.cachedData) return;
    if (this.batching) return;
    this.ensureDir();
    const json = JSON.stringify(this.cachedData);

    if (this.customPasswordSet && this.sessionKey) {
      const { encrypted, iv, tag } = aesEncrypt(json, this.sessionKey);
      fs.writeFileSync(this.dataFile, JSON.stringify({ encrypted, iv, tag }));
    } else {
      const encrypted = this.osCrypto.encryptString(json);
      fs.writeFileSync(this.dataFile, JSON.stringify({ _safe: true, _data: encrypted.toString('base64') }));
    }
  }

  beginBatch(): void {
    this.batching = true;
  }

  endBatch(): void {
    this.batching = false;
    this.persist();
  }

  // ─── Internals ─────────────────────────────────────────────────────────────

  /** Assign a freshly decrypted payload, migrating it to the current v3 shape. */
  private setLoadedData(raw: unknown): boolean {
    const { data, changed } = migrateData(raw);
    this.cachedData = data;
    return changed;
  }

  private ensureDir(): void {
    const dir = path.dirname(this.dataFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}
