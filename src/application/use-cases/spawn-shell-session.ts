/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Use case: spawn a local shell session
   ═══════════════════════════════════════════════════════════════════════════ */

import type { PtyGateway, PtyProcessHandle } from '../../domain/ports/pty-gateway';
import type { ShellDetector } from '../../domain/ports/shell-detector';
import type { SessionEvents } from '../session-events';

export type SpawnShellSessionResult =
  | { id: number; shell: string; handle: PtyProcessHandle }
  | { error: string; errorCode?: string };

export class SpawnShellSession {
  constructor(
    private readonly shells: ShellDetector,
    private readonly pty: PtyGateway,
  ) {}

  execute(shellKey: string, sessionId: number, cwd: string, events: SessionEvents): SpawnShellSessionResult {
    const resolved = this.shells.resolveShell(shellKey);
    if (!resolved) {
      if (shellKey === 'gitbash') {
        return { error: 'Git Bash not found. Please locate it first.', errorCode: 'GIT_BASH_NOT_FOUND' };
      }
      return { error: `Unknown shell: ${shellKey}`, errorCode: 'UNKNOWN_SHELL' };
    }

    try {
      const handle = this.pty.spawn(resolved.command, resolved.args, { cols: 80, rows: 24, cwd });
      handle.onData(events.onData);
      handle.onExit(() => events.onExit());
      return { id: sessionId, shell: shellKey, handle };
    } catch (err) {
      return { error: err.message };
    }
  }
}
