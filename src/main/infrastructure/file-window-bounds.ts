/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Infrastructure adapter: window bounds persistence
   Stores a window's last position/size as plain JSON under userData so the
   search panel window reopens where the user left it. Unencrypted by design —
   window geometry is not a secret.
   ═══════════════════════════════════════════════════════════════════════════ */

import fs from 'fs';
import path from 'path';

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class FileWindowBounds {
  constructor(private readonly filePath: string) {}

  load(): Partial<WindowBounds> | null {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf-8')) as Partial<WindowBounds>;
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      // Missing or corrupt file — caller falls back to its own default
      return null;
    }
  }

  save(bounds: WindowBounds): void {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(bounds, null, 2), 'utf-8');
    } catch {
      // Geometry is best-effort; never break the window lifecycle over it
    }
  }
}
