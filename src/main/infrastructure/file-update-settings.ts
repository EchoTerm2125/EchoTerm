/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Infrastructure adapter: auto-update settings persistence
   Implements the domain UpdateSettingsStore port on a plain JSON file under
   userData (settings.json). Unencrypted by design — no secrets here.
   ═══════════════════════════════════════════════════════════════════════════ */

import fs from 'fs';
import path from 'path';

import type { UpdateSettings, UpdateSettingsStore } from '../../domain/ports/update-settings';

const DEFAULTS: UpdateSettings = {
  includePrerelease: false,
  checkForUpdatesAutomatically: true,
};

export class FileUpdateSettingsStore implements UpdateSettingsStore {
  constructor(private readonly filePath: string) {}

  load(): UpdateSettings {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<UpdateSettings>;
      return { ...DEFAULTS, ...parsed };
    } catch {
      // Missing or corrupt file — fall back to defaults
      return { ...DEFAULTS };
    }
  }

  save(settings: UpdateSettings): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(settings, null, 2), 'utf-8');
  }
}
