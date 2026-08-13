/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Use case: render the stored connections as SSH config text
   ═══════════════════════════════════════════════════════════════════════════ */

import type { ConnectionRepository } from '../../domain/ports/connection-repository';
import type { UserRepository } from '../../domain/ports/user-repository';
import { renderSshConfig } from '../../domain/services/ssh-config';

export class ExportSshConfig {
  constructor(
    private readonly connections: ConnectionRepository,
    private readonly users: UserRepository,
  ) {}

  /** Throws when there are no connections to export. */
  execute(): string {
    const connections = this.connections.list();
    if (connections.length === 0) throw new Error('No connections to export.');
    return renderSshConfig(connections, this.users.list());
  }
}
