/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Use case: wipe all stored SSH data
   ═══════════════════════════════════════════════════════════════════════════ */

import type { Vault } from '../../domain/ports/vault';

export class ClearSshData {
  constructor(private readonly vault: Vault) {}

  /** Deletes every stored user, connection and folder. */
  execute(): void {
    this.vault.resetData();
  }
}
