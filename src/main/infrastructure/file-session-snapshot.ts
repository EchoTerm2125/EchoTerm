/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Infrastructure adapter: last-session snapshot persistence
   Stores the layout Restore rebuilds on the next launch as plain JSON under
   userData. Unencrypted by design: the snapshot carries no host, user name or
   password — only group names, pane order, shell keys and Connection ids.
   ═══════════════════════════════════════════════════════════════════════════ */

import fs from 'fs';
import path from 'path';

import type { SessionLoadResult, SessionSnapshot } from '../../../shared/ipc';

const SUPPORTED_VERSION = 1;

export class FileSessionSnapshotStore {
  constructor(private readonly filePath: string) {}

  load(): SessionLoadResult {
    let raw: string;
    try {
      raw = fs.readFileSync(this.filePath, 'utf-8');
    } catch {
      // Missing file is the ordinary first-launch case
      return { snapshot: null };
    }

    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || parsed.version !== SUPPORTED_VERSION ||
          !Array.isArray(parsed.groups)) {
        // Written by a version that no longer exists — drop it rather than
        // retrying the same failure on every launch.
        this.clear();
        return { snapshot: null, corrupt: true };
      }
      return { snapshot: parsed as SessionSnapshot };
    } catch {
      this.clear();
      return { snapshot: null, corrupt: true };
    }
  }

  save(snapshot: SessionSnapshot): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    // Write beside the target and rename, so a crash mid-write cannot leave a
    // half-written snapshot that Restore would then discard as corrupt.
    const tmpPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(snapshot), 'utf-8');
    fs.renameSync(tmpPath, this.filePath);
  }

  clear(): void {
    try {
      fs.unlinkSync(this.filePath);
    } catch {
      // Already gone — nothing to do
    }
  }
}
