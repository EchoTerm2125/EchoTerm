/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Domain service: auto-update check policy
   Pure decisions — no Node/Electron imports allowed (see .dependency-cruiser.cjs).
   ═══════════════════════════════════════════════════════════════════════════ */

import type { UpdateSettings } from '../ports/update-settings';

/** Length of the "Remind me in 30 days" window, in milliseconds. */
export const REMIND_DAYS = 30;
export const REMIND_MS = REMIND_DAYS * 24 * 60 * 60 * 1000;

export interface UpdateCheckRequest {
  settings: UpdateSettings;
  /** Current epoch ms. */
  now: number;
  /** True when the check was explicitly requested by the user (manual button). */
  manual: boolean;
}

/**
 * Whether an update check should run at all.
 * Automatic checks are skipped when disabled or inside the reminder window;
 * manual checks always run (an explicit user action).
 */
export function shouldCheckForUpdate({ settings, now, manual }: UpdateCheckRequest): boolean {
  if (manual) return true;
  if (!settings.checkForUpdatesAutomatically) return false;
  if (settings.nextCheckAt !== null && now < settings.nextCheckAt) return false;
  return true;
}

/** Whether the given version has been dismissed with "Skip this version". */
export function isVersionSkipped(settings: UpdateSettings, version: string): boolean {
  return settings.skippedVersion === version;
}

/** Apply the "Remind me in 30 days" window, returning the updated settings. */
export function applyRemindLater(settings: UpdateSettings, now: number): UpdateSettings {
  return { ...settings, nextCheckAt: now + REMIND_MS };
}
