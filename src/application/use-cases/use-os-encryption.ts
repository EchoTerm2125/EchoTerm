/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Use case: drop the master password and use OS-level encryption
   ═══════════════════════════════════════════════════════════════════════════ */

import type { Vault } from '../../domain/ports/vault';

export class UseOsEncryption {
  constructor(private readonly vault: Vault) {}

  execute(): void {
    this.vault.useOsEncryption();
  }
}
