/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Domain service: auto-update check policy
   Pure decisions — no Node/Electron imports allowed (see .dependency-cruiser.cjs).
   ═══════════════════════════════════════════════════════════════════════════ */

import type { UpdateSettings } from '../ports/update-settings';

export interface UpdateCheckRequest {
  settings: UpdateSettings;
  /** True when the check was explicitly requested by the user (manual button). */
  manual: boolean;
}

/**
 * Whether an update check should run at all.
 * Automatic checks are skipped when the master toggle is off;
 * manual checks always run (an explicit user action).
 */
export function shouldCheckForUpdate({ settings, manual }: UpdateCheckRequest): boolean {
  if (manual) return true;
  return settings.checkForUpdatesAutomatically;
}
