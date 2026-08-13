/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Use case: spawn an SSH session for a stored connection
   Resolves credentials, builds ssh arguments and wires prompt auto-injection.
   ═══════════════════════════════════════════════════════════════════════════ */

import type { ConnectionRepository } from '../../domain/ports/connection-repository';
import type { PtyGateway, PtyProcessHandle } from '../../domain/ports/pty-gateway';
import type { SessionEvents } from '../session-events';
import { buildSshArgs } from '../../domain/services/ssh-args';
import { isPasswordPrompt, isPassphrasePrompt } from '../../domain/services/password-prompt';

export type SpawnSshSessionResult =
  | { id: number; shell: string; label: string; host: string; handle: PtyProcessHandle }
  | { error: string; errorCode?: string };

export class SpawnSshSession {
  constructor(
    private readonly connections: ConnectionRepository,
    private readonly pty: PtyGateway,
  ) {}

  execute(connectionId: string, sessionId: number, cwd: string, events: SessionEvents): SpawnSshSessionResult {
    const target = this.connections.findResolvedById(connectionId);
    if (!target) return { error: 'Connection not found.', errorCode: 'CONNECTION_NOT_FOUND' };

    // Domain service builds the ssh.exe argument list (jump host, port, key file)
    const args = buildSshArgs(target);

    try {
      const handle = this.pty.spawn('ssh.exe', args, { cols: 80, rows: 24, cwd });

      // Auto-inject password if using password auth (for the TARGET host)
      if (target.authType === 'password' && target.password) {
        let passwordSent = false;
        handle.onData((data) => {
          if (!passwordSent && isPasswordPrompt(data)) {
            handle.write(target.password + '\r');
            passwordSent = true;
          }
        });
      }

      // Auto-inject key passphrase if using keyfile auth with stored passphrase
      if (target.authType === 'keyfile' && target.keyPassword) {
        let keyPassSent = false;
        handle.onData((data) => {
          if (!keyPassSent && isPassphrasePrompt(data)) {
            handle.write(target.keyPassword + '\r');
            keyPassSent = true;
          }
        });
      }

      handle.onData(events.onData);
      handle.onExit(() => events.onExit());

      return { id: sessionId, shell: 'ssh', label: target.name, host: target.host, handle };
    } catch (err) {
      return { error: err.message };
    }
  }
}
