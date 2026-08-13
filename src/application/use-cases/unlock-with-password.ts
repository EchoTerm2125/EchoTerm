/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Use case: unlock the vault with the master password
   ═══════════════════════════════════════════════════════════════════════════ */

import type { Vault, VaultUnlockResult } from '../../domain/ports/vault';

export class UnlockWithPassword {
  constructor(private readonly vault: Vault) {}

  async execute(password: string): Promise<VaultUnlockResult> {
    return this.vault.unlockWithPassword(password);
  }
}
