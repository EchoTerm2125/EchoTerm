/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Use case: set (or replace) the master password
   ═══════════════════════════════════════════════════════════════════════════ */

import type { Vault } from '../../domain/ports/vault';

export class SetMasterPassword {
  constructor(private readonly vault: Vault) {}

  async execute(password: string): Promise<void> {
    await this.vault.setMasterPassword(password);
  }
}
