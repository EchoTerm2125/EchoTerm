/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Use case: unlock the vault with OS-level credentials
   ═══════════════════════════════════════════════════════════════════════════ */

import type { Vault, VaultUnlockResult } from '../../domain/ports/vault';

export class UnlockWithOsCredentials {
  constructor(private readonly vault: Vault) {}

  execute(): VaultUnlockResult {
    return this.vault.unlockWithOsCredentials();
  }
}
