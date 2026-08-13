/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Use case: read vault lock state
   ═══════════════════════════════════════════════════════════════════════════ */

import type { Vault } from '../../domain/ports/vault';

export class GetVaultStatus {
  constructor(private readonly vault: Vault) {}

  execute(): { masterPasswordSet: boolean; unlocked: boolean } {
    return {
      masterPasswordSet: this.vault.isMasterPasswordSet(),
      unlocked: this.vault.isUnlocked(),
    };
  }
}
