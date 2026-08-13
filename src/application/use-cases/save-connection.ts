/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Use case: create or update an SSH connection
   ═══════════════════════════════════════════════════════════════════════════ */

import type { Connection } from '../../domain/entities/ssh';
import type { ConnectionRepository } from '../../domain/ports/connection-repository';

export class SaveConnection {
  constructor(private readonly connections: ConnectionRepository) {}

  /** Throws when updating a connection that does not exist. */
  execute(connection: Connection): Connection {
    return this.connections.save(connection);
  }
}
