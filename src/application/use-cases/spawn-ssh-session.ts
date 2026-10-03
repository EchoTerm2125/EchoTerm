/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Use case: spawn an SSH session for a stored connection
   Renders a per-session ssh config, spawns ssh.exe with -F and wires
   prompt auto-injection.
   ═══════════════════════════════════════════════════════════════════════════ */

import type { ConnectionRepository } from '../../domain/ports/connection-repository';
import type { PtyGateway, PtyProcessHandle } from '../../domain/ports/pty-gateway';
import type { SessionConfigStore } from '../../domain/ports/session-config-store';
import type { SessionEvents } from '../session-events';
import { buildSshArgs } from '../../domain/services/ssh-args';
import { renderSessionSshConfig } from '../../domain/services/ssh-config';
import { isPasswordPrompt, isPassphrasePrompt } from '../../domain/services/password-prompt';

export type SpawnSshSessionResult =
  | { id: number; shell: string; label: string; host: string; username: string | null; handle: PtyProcessHandle }
  | { error: string; errorCode?: string };

export class SpawnSshSession {
  constructor(
    private readonly connections: ConnectionRepository,
    private readonly pty: PtyGateway,
    private readonly configStore: SessionConfigStore,
  ) {}

  execute(connectionId: string, sessionId: number, cwd: string, events: SessionEvents): SpawnSshSessionResult {
    const target = this.connections.findResolvedById(connectionId);
    if (!target) return { error: 'Connection not found.', errorCode: 'CONNECTION_NOT_FOUND' };
    if (target.jumpChainError) {
      // Never connect through a broken jump chain (loop or deleted reference)
      return {
        error: 'Jump host chain is invalid: it loops or references a deleted connection.',
        errorCode: 'JUMP_CHAIN_INVALID',
      };
    }

    // Render + persist the per-session config file (adapter owns the path)
    const alias = `echoterm-session-${sessionId}`;
    let configPath: string;
    try {
      const text = renderSessionSshConfig(target, this.configStore.userConfigPath());
      configPath = this.configStore.write(alias, text);
    } catch (err) {
      return { error: err.message, errorCode: 'SESSION_CONFIG_FAILED' };
    }

    try {
      // Spawn with the real host name (not the alias) so Host patterns in the
      // user's own ssh config keep matching this connection
      const args = buildSshArgs(configPath, target.host);
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
      handle.onExit(() => {
        this.configStore.remove(configPath);
        events.onExit();
      });

      return { id: sessionId, shell: 'ssh', label: target.name, host: target.host, username: target.username, handle };
    } catch (err) {
      // Spawn failed after the config file was written — clean it up now;
      // onExit will never fire for a handle we never got
      this.configStore.remove(configPath);
      return { error: err.message };
    }
  }
}
