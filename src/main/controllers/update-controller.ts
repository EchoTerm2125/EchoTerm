/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Update controller: auto-update lifecycle & IPC interface
   Owns the electron-updater singleton, applies the update policy from the
   settings store, and pushes update events to the renderer.
   ═══════════════════════════════════════════════════════════════════════════ */

import fs from 'fs';
import path from 'path';
import { shell } from 'electron';
import { autoUpdater } from 'electron-updater';

import type { UpdateSettings, UpdateSettingsStore } from '../../domain/ports/update-settings';
import { shouldCheckForUpdate } from '../../domain/services/update-policy';
import type { SendToRenderer } from './session-registry';

/** GitHub releases page — the manual download destination for portable builds. */
const RELEASES_PAGE_URL = 'https://github.com/EchoTerm2125/EchoTerm/releases';

/** Marker written into portable/zip builds by scripts/after-pack.cjs. */
const PORTABLE_MARKER = 'echoterm-portable';

/**
 * Whether this copy is a portable/zip artifact rather than the NSIS install.
 * The electron-builder portable target sets PORTABLE_EXECUTABLE_DIR at runtime;
 * the portable zip cannot rely on that env var, so our afterPack hook also
 * drops a marker file into resources (deleted by the installer on install).
 */
const detectPortableBuild = (): boolean =>
  process.env.PORTABLE_EXECUTABLE_DIR != null ||
  fs.existsSync(path.join(process.resourcesPath, PORTABLE_MARKER));

export class UpdateController {
  /** Version currently being offered/downloaded (used to suppress re-entry). */
  private currentVersion: string | null = null;

  constructor(
    private readonly settingsStore: UpdateSettingsStore,
    private readonly send: SendToRenderer,
  ) {}

  /** Whether this copy is a portable/zip artifact (rendered/installed builds are not). */
  isPortableBuild(): boolean {
    return detectPortableBuild();
  }

  /** Wire electron-updater events and push them to the renderer. Call once at startup. */
  init(): void {
    // We control download and install explicitly: the update is downloaded in
    // the background as soon as it is available, and installed only when the
    // user clicks the title-bar install button (never automatically on quit).
    // Portable/zip builds check for updates but never download or install.
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;

    autoUpdater.on('update-available', (info) => {
      this.currentVersion = info.version;
      this.send('update:available', { version: info.version });

      // Auto-download in the background — the user is never asked to start it.
      // Portable/zip builds have no installer, so they just show the
      // "Get update" button that opens the GitHub releases page instead.
      if (!detectPortableBuild() && this.currentVersion === info.version) {
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
    const settings = this.settingsStore.load();
    if (!shouldCheckForUpdate({ settings, manual })) {
      return { started: false };
    }

    autoUpdater.allowPrerelease = settings.includePrerelease;
    autoUpdater.checkForUpdates().then((result) => {
      // Inactive updater (dev run) resolves to null and emits no events —
      // resolve the check so the UI never hangs on "Checking for updates…".
      if (!result) {
        this.send('update:not-available', {});
      }
    }).catch(() => {
      // electron-updater already emitted 'error' (handled in init()).
    });
    return { started: true };
  }

  /** Install (installed builds) or open the GitHub releases page (portable/zip). */
  installUpdate(): void {
    // Portable/zip copies cannot install themselves — the "Get update" button
    // points the user at the GitHub releases page for a manual download.
    if (detectPortableBuild()) {
      shell.openExternal(RELEASES_PAGE_URL).catch(() => {});
      return;
    }
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
