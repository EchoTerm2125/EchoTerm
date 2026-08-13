/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Use case: delete an SSH connection
   ═══════════════════════════════════════════════════════════════════════════ */

import type { ConnectionRepository } from '../../domain/ports/connection-repository';

export class DeleteConnection {
  constructor(private readonly connections: ConnectionRepository) {}

  /** Throws when the connection does not exist. */
  execute(id: string): void {
    this.connections.delete(id);
  }
}
