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
  /** Run the automatic startup check. */
  checkForUpdatesAutomatically: boolean;
}

export interface UpdateSettingsStore {
  load(): UpdateSettings;
  save(settings: UpdateSettings): void;
}
