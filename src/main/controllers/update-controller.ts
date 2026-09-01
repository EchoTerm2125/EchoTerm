/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Update controller: auto-update lifecycle & IPC interface
   Owns the electron-updater singleton, applies the update policy from the
   settings store, and pushes update events to the renderer.
   ═══════════════════════════════════════════════════════════════════════════ */

import fs from 'fs';
import path from 'path';
import { app, shell } from 'electron';
import { autoUpdater } from 'electron-updater';

import type { IpcOutcome } from '../../../shared/ipc';
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
  /** True once an installer is fully downloaded and ready for quitAndInstall. */
  private updateDownloaded = false;

  constructor(
    private readonly settingsStore: UpdateSettingsStore,
    private readonly send: SendToRenderer,
  ) {}

  /** Whether this copy is a portable/zip artifact (rendered/installed builds are not). */
  isPortableBuild(): boolean {
    return detectPortableBuild();
  }

  /** Whether a full installer has been downloaded and is ready for quitAndInstall. */
  isUpdateDownloaded(): boolean {
    return this.updateDownloaded;
  }

  /** Wire electron-updater events and push them to the renderer. Call once at startup. */
  init(): void {
    // We control download and install explicitly: the update is downloaded in
    // the background as soon as it is available, and installed only when the
    // user clicks the title-bar install button (never automatically on quit).
    // Portable/zip builds check for updates but never download or install.
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;

    // Dev runs (`npm start`) are not packaged, so the updater is inactive by
    // default. Let it consult dev-app-update.yml so the real check can be
    // exercised from the About section's "Check for updates now" button.
    if (!app.isPackaged) {
      autoUpdater.forceDevUpdateConfig = true;
    }

    autoUpdater.on('update-available', (info) => {
      this.send('update:available', { version: info.version });
      // A fresh check supersedes any previously downloaded installer.
      this.updateDownloaded = false;

      // Auto-download in the background — the user is never asked to start it.
      // Portable/zip builds have no installer, so they just show the
      // "Get update" button that opens the GitHub releases page instead.
      // electron-updater dedupes re-downloads itself (in-flight promise +
      // sha512-validated disk cache), so no version guard is needed here.
      if (!detectPortableBuild()) {
        autoUpdater.downloadUpdate().catch(() => {
          // electron-updater already emitted 'error' (handled in init()).
        });
      }
    });

    autoUpdater.on('update-not-available', () => {
      // No newer version exists; any earlier downloaded installer is stale.
      this.updateDownloaded = false;
      this.send('update:not-available', {});
    });

    autoUpdater.on('download-progress', (progress) => {
      this.send('update:progress', { percent: Math.round(progress.percent ?? 0) });
    });

    autoUpdater.on('update-downloaded', (info) => {
      // Installing is an explicit user action (the title-bar button) — never
      // auto-install on quit. The renderer shows the button on this event.
      this.updateDownloaded = true;
      this.send('update:downloaded', { version: info.version });
    });

    autoUpdater.on('error', (err) => {
      // A failed check/download leaves the feed state unknown; refuse to install
      // a possibly-stale or incomplete download until the next successful check.
      this.updateDownloaded = false;
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
  installUpdate(): IpcOutcome {
    // Portable/zip copies cannot install themselves — the "Get update" button
    // points the user at the GitHub releases page for a manual download.
    if (detectPortableBuild()) {
      shell.openExternal(RELEASES_PAGE_URL).catch(() => {});
      return { success: true };
    }
    // Guard against installing when nothing is downloaded: quitAndInstall()
    // returns false without throwing (no 'error' event), and the main process
    // only bypasses the window close interceptor when we report success here.
    if (!this.updateDownloaded) {
      return { success: false, error: 'No downloaded update to install.' };
    }
    // isSilent=false shows the NSIS wizard; the main process must bypass the
    // window close interceptor before calling this (see main.ts).
    // quitAndInstall is typed as void but can return false at runtime when the
    // install cannot start (e.g. another installer is already running); report
    // that so main.ts re-arms the close interceptor instead of leaving it
    // bypassed for the rest of the session. The flag is only cleared once the
    // install actually proceeds, so a failed start keeps it set and a retry
    // does not hit the "no downloaded update" guard.
    const started = autoUpdater.quitAndInstall(false, true) as unknown as boolean | undefined;
    if (started === false) {
      return { success: false, error: 'Update install could not start.' };
    }
    this.updateDownloaded = false;
    return { success: true };
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
