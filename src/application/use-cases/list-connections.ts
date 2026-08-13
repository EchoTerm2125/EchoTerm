/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Use case: list SSH connections
   ═══════════════════════════════════════════════════════════════════════════ */

import type { Connection } from '../../domain/entities/ssh';
import type { ConnectionRepository } from '../../domain/ports/connection-repository';

export class ListConnections {
  constructor(private readonly connections: ConnectionRepository) {}

  execute(): Connection[] {
    return this.connections.list();
  }
}
