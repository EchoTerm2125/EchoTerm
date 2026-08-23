/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Update controller: auto-update lifecycle & IPC interface
   Owns the electron-updater singleton, applies the update policy from the
   settings store, and pushes update events to the renderer.
   ═══════════════════════════════════════════════════════════════════════════ */

import { shell } from 'electron';
import { autoUpdater } from 'electron-updater';

import type { UpdateSettings, UpdateSettingsStore } from '../../domain/ports/update-settings';
import {
  applyRemindLater,
  isVersionSkipped,
  shouldCheckForUpdate,
} from '../../domain/services/update-policy';
import type { SendToRenderer } from './session-registry';

/** GitHub releases page — the manual download destination for portable builds. */
const RELEASES_PAGE_URL = 'https://github.com/EchoTerm2125/EchoTerm/releases';

/** electron-builder's portable target sets this env var at runtime. */
const isPortableBuild = (): boolean => process.env.PORTABLE_EXECUTABLE_DIR != null;

export class UpdateController {
  /** Version currently being offered/downloaded (used to suppress re-entry). */
  private currentVersion: string | null = null;

  constructor(
    private readonly settingsStore: UpdateSettingsStore,
    private readonly send: SendToRenderer,
  ) {}

  /** Wire electron-updater events and push them to the renderer. Call once at startup. */
  init(): void {
    // We control download and install explicitly so that "Skip this version"
    // can suppress both (a skipped download is never offered and never installed).
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;

    autoUpdater.on('update-available', (info) => {
      const settings = this.settingsStore.load();
      if (isVersionSkipped(settings, info.version)) {
        // The only offered version is skipped — the check has nothing to offer.
        this.send('update:not-available', {});
        return;
      }

      this.currentVersion = info.version;
      this.send('update:available', { version: info.version });

      // Q11(b): auto-download in the background — the user is never asked to start it.
      if (this.currentVersion === info.version) {
        autoUpdater.downloadUpdate().catch(() => {
          // electron-updater already emitted 'error' (handled in init()).
        });
      }
    });

    autoUpdater.on('update-not-available', () => {
      this.send('update:not-available', {});
    });

    autoUpdater.on('download-progress', (progress) => {
      this.send('update:progress', { percent: Math.round(progress.percent ?? 0) });
    });

    autoUpdater.on('update-downloaded', (info) => {
      // A version skipped mid-download must never install (including on quit).
      const settings = this.settingsStore.load();
      if (isVersionSkipped(settings, info.version)) return;

      autoUpdater.autoInstallOnAppQuit = true;
      this.send('update:downloaded', { version: info.version });
    });

    autoUpdater.on('error', (err) => {
      this.send('update:error', { message: err?.message ?? String(err) });
    });
  }

  /**
   * Run an update check. Automatic checks honor the master toggle and the
   * 30-day reminder window; manual checks always run.
   */
  checkForUpdates(manual: boolean): { started: boolean } {
    // Portable builds have no installer and ship no app-update.yml, so
    // auto-update is impossible: never run an automatic check, and point a
    // manual check at the GitHub releases page instead.
    if (isPortableBuild()) {
      if (manual) {
        shell.openExternal(RELEASES_PAGE_URL).catch(() => {});
        this.send('update:portable', {});
      }
      return { started: false };
    }

    const settings = this.settingsStore.load();
    if (!shouldCheckForUpdate({ settings, now: Date.now(), manual })) {
      return { started: false };
    }

    autoUpdater.allowPrerelease = settings.includePrerelease;
    autoUpdater.checkForUpdates().then((result) => {
      // Inactive updater (dev run or missing app-update.yml) resolves to null
      // and emits no events — resolve the check so the UI never hangs on
      // "Checking for updates…".
      if (!result) {
        this.send('update:not-available', {});
      }
    }).catch(() => {
      // electron-updater already emitted 'error' (handled in init()).
    });
    return { started: true };
  }

  /** "Skip this version" — suppresses that exact version string for good. */
  skipVersion(version: string): void {
    const settings = this.settingsStore.load();
    this.settingsStore.save({ ...settings, skippedVersion: version });
  }

  /** "Remind me in 30 days" — suppress automatic checks until the window passes. */
  remindLater(): void {
    const settings = this.settingsStore.load();
    this.settingsStore.save(applyRemindLater(settings, Date.now()));
  }

  /** Quit and run the (oneClick, hence silent) installer, relaunching on finish. */
  installUpdate(): void {
    autoUpdater.quitAndInstall(true, true);
  }

  getSettings(): UpdateSettings {
    return this.settingsStore.load();
  }

  setSettings(patch: Partial<UpdateSettings>): UpdateSettings {
    const merged = { ...this.settingsStore.load(), ...patch };
    this.settingsStore.save(merged);
    return merged;
  }
}
