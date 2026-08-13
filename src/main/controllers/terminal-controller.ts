/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Terminal controller: shell session IPC (interface adapter)
   Translates terminal/shell IPC calls into use case invocations.
   ═══════════════════════════════════════════════════════════════════════════ */

import os from 'os';

import type { DialogService } from '../../domain/ports/dialog-service';
import type { ShellDetector } from '../../domain/ports/shell-detector';
import type { SpawnShellSession } from '../../application/use-cases/spawn-shell-session';
import { sessionEvents } from './session-registry';
import type { SendToRenderer, SessionRegistry } from './session-registry';

export class TerminalController {
  constructor(
    private readonly spawnShellSession: SpawnShellSession,
    private readonly shells: ShellDetector,
    private readonly dialogs: DialogService,
    private readonly registry: SessionRegistry,
    private readonly send: SendToRenderer,
  ) {}

  getDefaultShells() {
    return {
      shells: this.shells.listShellKeys(),
      gitBashPath: this.shells.getGitBashPath(),
    };
  }

  async locateGitBash() {
    const result = await this.dialogs.pickExistingFile({
      title: 'Locate Git Bash (bash.exe)',
      filters: [{ name: 'bash.exe', extensions: ['exe'] }],
      defaultPath: 'C:\\Program Files\\Git',
    });
    if (!result.canceled && result.filePath) {
      this.shells.setGitBashPath(result.filePath);
      return { path: result.filePath };
    }
    return { path: null };
  }

  spawn(shellKey: string) {
    const id = this.registry.createId();
    const events = sessionEvents(this.registry, id, this.send);
    const result = this.spawnShellSession.execute(shellKey, id, os.homedir(), events);
    if ('error' in result) return { error: result.error, errorCode: result.errorCode };
    this.registry.register(id, { handle: result.handle, shell: shellKey });
    return { id: result.id, shell: result.shell };
  }

  write(id: number, data: string): void {
    const session = this.registry.get(id);
    if (session) session.handle.write(data);
  }

  resize(id: number, cols: number, rows: number): void {
    const session = this.registry.get(id);
    if (session) session.handle.resize(cols, rows);
  }

  kill(id: number): void {
    const session = this.registry.get(id);
    if (session) {
      session.handle.kill();
      this.registry.remove(id);
    }
  }
}
