/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Domain port: auto-update settings persistence
   Implemented by an infrastructure adapter (settings.json under userData).
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * User-controllable auto-update preferences. Plain data, no secrets.
 */
export interface UpdateSettings {
  /** Offer prerelease (beta) builds when checking for updates. */
  includePrerelease: boolean;
  /** Run the automatic startup check (and honor the 30-day reminder window). */
  checkForUpdatesAutomatically: boolean;
  /** Version string the user dismissed with "Skip this version". */
  skippedVersion: string | null;
  /** Epoch ms before which automatic checks are suppressed ("Remind me in 30 days"). */
  nextCheckAt: number | null;
}

export interface UpdateSettingsStore {
  load(): UpdateSettings;
  save(settings: UpdateSettings): void;
}
