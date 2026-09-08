/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Domain service: auto-update check policy
   Pure decisions — no Node/Electron imports allowed (see .dependency-cruiser.cjs).
   ═══════════════════════════════════════════════════════════════════════════ */

import type { UpdateSettings } from '../ports/update-settings';

export interface UpdateCheckRequest {
  settings: UpdateSettings;
  /** True when the check was explicitly requested by the user (manual button). */
  manual: boolean;
  /** True when a check/download is in flight or an installer is downloaded and awaiting install. */
  busy?: boolean;
}

/**
 * Whether an update check should run at all.
 * Automatic checks are skipped when the master toggle is off or a check is
 * already busy (in flight/downloading, or a downloaded installer awaiting
 * install); manual checks always run (an explicit user action).
 */
export function shouldCheckForUpdate({ settings, manual, busy = false }: UpdateCheckRequest): boolean {
  if (manual) return true;
  if (busy) return false;
  return settings.checkForUpdatesAutomatically;
}
