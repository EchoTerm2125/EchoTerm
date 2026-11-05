/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Infrastructure adapter: per-session ssh config storage
   Implements the domain SessionConfigStore port on a mkdtemp directory:
   one 0700 temp dir per session, one 0600 config file inside it.
   ═══════════════════════════════════════════════════════════════════════════ */

import type { SessionConfigStore } from '../../domain/ports/session-config-store';

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const TMP_PREFIX = 'echoterm-';

export class TempSessionConfigStore implements SessionConfigStore {
  constructor(
    private readonly tmpDir: string = os.tmpdir(),
    private readonly homeDir: string = os.homedir(),
  ) {}

  write(alias: string, text: string): string {
    const dir = fs.mkdtempSync(path.join(this.tmpDir, TMP_PREFIX));
    const file = path.join(dir, `${alias}.conf`);
    fs.writeFileSync(file, text, { mode: 0o600 });
    return file;
  }

  remove(filePath: string): void {
    try {
      fs.rmSync(filePath, { force: true });
    } catch {
      // already gone — nothing to clean up
    }
    try {
      // Only ever succeeds on our own mkdtemp dir once its file is gone
      fs.rmdirSync(path.dirname(filePath));
    } catch {
      // not our dir, non-empty, or already gone
    }
  }

  userConfigPath(): string | null {
    const userConfig = path.join(this.homeDir, '.ssh', 'config');
    return fs.existsSync(userConfig) ? userConfig : null;
  }

  /**
   * Remove leftovers from previous runs (crash/kill before onExit could fire).
   * Safe to sweep everything: the app enforces a single instance.
   */
  sweep(): void {
    let entries: string[];
    try {
      entries = fs.readdirSync(this.tmpDir);
    } catch {
      return;
    }
    for (const name of entries) {
      if (!name.startsWith(TMP_PREFIX)) continue;
      try {
        fs.rmSync(path.join(this.tmpDir, name), { recursive: true, force: true });
      } catch {
        // locked or racing a live session — next sweep will retry
      }
    }
  }
}
