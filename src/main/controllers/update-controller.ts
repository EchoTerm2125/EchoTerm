/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Update controller: auto-update lifecycle & IPC interface
   Owns the electron-updater singleton, applies the update policy from the
   settings store, and pushes update events to the renderer.
   ═══════════════════════════════════════════════════════════════════════════ */

import { shell } from 'electron';
import { autoUpdater } from 'electron-updater';

import type { UpdateSettings, UpdateSettingsStore } from '../../domain/ports/update-settings';
import { shouldCheckForUpdate } from '../../domain/services/update-policy';
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
    // We control download and install explicitly: the update is downloaded in
    // the background as soon as it is available, and installed only when the
    // user clicks the title-bar install button (never automatically on quit).
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;

    autoUpdater.on('update-available', (info) => {
      this.currentVersion = info.version;
      this.send('update:available', { version: info.version });

      // Auto-download in the background — the user is never asked to start it.
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
      // Installing is an explicit user action (the title-bar button) — never
      // auto-install on quit. The renderer shows the button on this event.
      this.send('update:downloaded', { version: info.version });
    });

    autoUpdater.on('error', (err) => {
      this.send('update:error', { message: err?.message ?? String(err) });
    });
  }

  /**
   * Run an update check. Automatic checks honor the master toggle; manual
   * checks always run.
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
    if (!shouldCheckForUpdate({ settings, manual })) {
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

  /** Quit the app and run the installer (assisted wizard), relaunching on finish. */
  installUpdate(): void {
    // isSilent=false shows the NSIS wizard; the main process must bypass the
    // window close interceptor before calling this (see main.ts).
    autoUpdater.quitAndInstall(false, true);
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
