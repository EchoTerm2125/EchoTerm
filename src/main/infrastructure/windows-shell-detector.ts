/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Infrastructure adapter: Windows shell detection
   Implements the domain ShellDetector port (cmd, PowerShell, Git Bash).
   ═══════════════════════════════════════════════════════════════════════════ */

import fs from 'fs';
import os from 'os';
import path from 'path';

import type { ResolvedShell, ShellDetector } from '../../domain/ports/shell-detector';

export class WindowsShellDetector implements ShellDetector {
  private gitBashPath: string | null;
  private readonly shells: Record<string, { cmd: string; args: string[] }> = {
    cmd: { cmd: 'cmd.exe', args: [] },
    powershell: { cmd: 'powershell.exe', args: [] },
  };

  constructor() {
    this.gitBashPath = this.findGitBash();
  }

  listShellKeys(): string[] {
    // gitbash is always offered; it resolves only once a path is located
    return [...Object.keys(this.shells), 'gitbash'];
  }

  getGitBashPath(): string | null {
    return this.gitBashPath;
  }

  setGitBashPath(gitBashPath: string): void {
    this.gitBashPath = gitBashPath;
  }

  resolveShell(shellKey: string): ResolvedShell | null {
    if (shellKey === 'gitbash') {
      if (!this.gitBashPath) return null;
      return { command: this.gitBashPath, args: [] };
    }
    const shell = this.shells[shellKey];
    if (!shell) return null;
    return { command: shell.cmd, args: shell.args };
  }

  private findGitBash(): string | null {
    const candidates = [
      'C:\\Program Files\\Git\\bin\\bash.exe',
      'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
      path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Git', 'bin', 'bash.exe'),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate;
    }
    return null;
  }
}
