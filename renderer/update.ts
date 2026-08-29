/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Auto-update UI
   Status banner (the "Updates" section of the options panel) plus the install
   buttons in the title bar and the Updates banner. Installed builds download
   in the background and the buttons install; portable/zip builds never
   download and the buttons open the GitHub releases page instead.
   All persistence lives in the main process (settings.json); this module only
   reflects it over IPC.
   ═══════════════════════════════════════════════════════════════════════════ */

import type { UpdateSettings } from '../shared/ipc';

(function () {
  'use strict';
  const api = App.api;

  // ── State ──
  let settings: UpdateSettings | null = null; // cached copy from the main process
  let isPortable = false;                     // portable/zip build (no installer)

  // ── DOM refs ──
  let optCheckUpdates: HTMLInputElement | null;
  let optIncludePrerelease: HTMLInputElement | null;
  let btnCheckUpdates: HTMLButtonElement | null;
  let btnInstallUpdate: HTMLButtonElement | null;
  let btnInstallUpdateLabel: HTMLElement | null;
  let btnInstallBanner: HTMLButtonElement | null;
  let btnInstallBannerLabel: HTMLElement | null;
  let updStatusBanner: HTMLElement | null;
  let updStatusLine: HTMLElement | null;
  let updProgressTrack: HTMLElement | null;
  let updProgressBar: HTMLElement | null;

  function init() {
    cacheDom();
    bindEvents();
    subscribeEvents();
    setStatus('idle');
    loadSettings();
    // Keep the card's JS-set text in sync when the user switches language.
    App.i18n.onLocaleChange(() => {
      renderStatus();
    });
  }

  function cacheDom() {
    optCheckUpdates = document.getElementById('optCheckUpdates') as HTMLInputElement | null;
    optIncludePrerelease = document.getElementById('optIncludePrerelease') as HTMLInputElement | null;
    btnCheckUpdates = document.getElementById('btnCheckUpdates') as HTMLButtonElement | null;
    btnInstallUpdate = document.getElementById('btnInstallUpdate') as HTMLButtonElement | null;
    btnInstallUpdateLabel = document.getElementById('btnInstallUpdateLabel');
    btnInstallBanner = document.getElementById('btnInstallBanner') as HTMLButtonElement | null;
    btnInstallBannerLabel = document.getElementById('btnInstallBannerLabel');
    updStatusBanner = document.getElementById('updStatusBanner');
    updStatusLine = document.getElementById('updStatusLine');
    updProgressTrack = document.getElementById('updProgressTrack');
    updProgressBar = document.getElementById('updProgressBar');
  }

  async function loadSettings() {
    try {
      settings = await api.updateGetSettings();
      applySettingsToUI();
      const buildType = await api.updateGetBuildType();
      isPortable = buildType.portable;
      renderStatus();
    } catch (err) {
      console.error('Failed to load update settings:', err);
    }
  }

  function applySettingsToUI() {
    if (!settings) return;
    if (optCheckUpdates) optCheckUpdates.checked = settings.checkForUpdatesAutomatically;
    if (optIncludePrerelease) optIncludePrerelease.checked = settings.includePrerelease;
  }

  type UpdateStatusState = 'idle' | 'checking' | 'uptodate' | 'available' | 'downloading' | 'ready' | 'error';

  let statusState: UpdateStatusState = 'idle';
  let statusVersion: string | null = null;
  let statusPercent: number | null = null;
  let statusError: string | null = null;
  // Mirrors the main-process flag: an installer is downloaded and ready for
  // quitAndInstall. Kept across an install-start failure so the install
  // buttons stay visible for a retry instead of requiring a full re-check.
  let updateDownloaded = false;

  function statusMessage(state: UpdateStatusState): string {
    switch (state) {
      case 'idle':
        return App.__('updStatusIdle');
      case 'checking':
        return App.__('updStatusChecking');
      case 'uptodate':
        return App.__('updStatusUpToDate');
      case 'available':
        return App.__('updStatusAvailable', { version: statusVersion ?? '' });
      case 'downloading':
        return App.__('updStatusDownloading');
      case 'ready':
        return App.__('updStatusReady');
      case 'error':
        return statusError ?? App.__('updCheckFailedGeneric');
    }
  }

  // The manual check button and the update toggles are disabled while an
  // update operation is in flight (checking/downloading) or a downloaded
  // update is pending install; every other state — including 'error' —
  // re-enables them so the user can retry.
  function updateControlsDisabled() {
    const busy =
      statusState === 'checking' ||
      statusState === 'downloading' ||
      statusState === 'ready';
    for (const el of [btnCheckUpdates, optCheckUpdates, optIncludePrerelease]) {
      if (el) el.disabled = busy;
    }
  }

  // Title-bar and Updates-banner install buttons share one visibility rule:
  // portable/zip builds show them as soon as an update is available (clicking
  // opens the GitHub page); installed builds only after the installer is
  // downloaded (clicking installs). An install-start failure keeps the buttons
  // visible while the installer is still downloaded so the user can retry.
  function updateInstallButtons() {
    const show = isPortable
      ? statusState === 'available'
      : statusState === 'ready' || (statusState === 'error' && updateDownloaded);
    const label = isPortable ? App.__('updGetUpdate') : App.__('updInstallUpdate');
    for (const btn of [btnInstallUpdate, btnInstallBanner]) {
      if (!btn) continue;
      btn.classList.toggle('hidden', !show);
      if (show) btn.title = label;
    }
    if (show && btnInstallUpdateLabel) btnInstallUpdateLabel.textContent = label;
    if (show && btnInstallBannerLabel) btnInstallBannerLabel.textContent = label;
  }

  function renderStatus() {
    updateControlsDisabled();
    updateInstallButtons();
    if (!updStatusLine || !updStatusBanner) return;
    updStatusLine.textContent = statusMessage(statusState);
    updStatusBanner.dataset.state = statusState;
    if (updProgressTrack && updProgressBar) {
      if (statusState === 'downloading' && statusPercent !== null) {
        updProgressTrack.classList.remove('hidden');
        updProgressBar.style.width = `${statusPercent}%`;
      } else {
        updProgressTrack.classList.add('hidden');
        updProgressBar.style.width = '0';
      }
    }
  }

  // The banner is always visible; idle is the initial state.
  function setStatus(state: UpdateStatusState = 'idle', version: string | null = null, percent: number | null = null, errorMessage: string | null = null) {
    statusState = state;
    statusVersion = version;
    statusPercent = percent;
    statusError = state === 'error' ? errorMessage : null;
    renderStatus();
  }

  // The shared install action for the title-bar and Updates-banner buttons.
  // Portable/zip builds have nothing to install — the action opens the GitHub
  // releases page. Installed builds always warn first, since installing ends
  // every terminal session and is never silently skipped.
  async function installUpdateAction() {
    if (isPortable) {
      await installUpdateResult();
      return;
    }
    App.Menus.showConfirm(App.__('updInstallConfirmBody'), () => {
      installUpdateResult();
    }, undefined, 'updInstallNow');
  }

  async function installUpdateResult() {
    const result = await api.updateInstall();
    if (result && !result.success) {
      // The main process reported the install could not start (e.g. another
      // installer is running). Surface it in the banner status line, which is
      // visible even while the options panel is open (a toast would sit
      // underneath the overlay).
      console.error('Update install failed:', result.error);
      setStatus('error', null, null, result.error || App.__('updCheckFailedGeneric'));
    }
  }

  function bindEvents() {
    if (optCheckUpdates) {
      optCheckUpdates.addEventListener('change', async () => {
        try {
          settings = await api.updateSetSettings({ checkForUpdatesAutomatically: optCheckUpdates.checked });
        } catch (err) {
          console.error('Failed to save update settings:', err);
          applySettingsToUI();
        }
      });
    }
    if (optIncludePrerelease) {
      optIncludePrerelease.addEventListener('change', async () => {
        try {
          settings = await api.updateSetSettings({ includePrerelease: optIncludePrerelease.checked });
        } catch (err) {
          console.error('Failed to save update settings:', err);
          applySettingsToUI();
        }
      });
    }
    if (btnCheckUpdates) {
      btnCheckUpdates.addEventListener('click', () => {
        setStatus('checking');
        api.updateCheck();
      });
    }
    for (const btn of [btnInstallUpdate, btnInstallBanner]) {
      if (btn) btn.addEventListener('click', installUpdateAction);
    }
  }

  function subscribeEvents() {
    api.onUpdateAvailable((info) => {
      // A fresh check supersedes any previously downloaded installer.
      updateDownloaded = false;
      setStatus('available', info.version);
    });

    api.onUpdateNotAvailable(() => {
      updateDownloaded = false;
      setStatus('uptodate');
    });

    api.onUpdateProgress((info) => {
      setStatus('downloading', null, info.percent);
    });

    api.onUpdateDownloaded(() => {
      updateDownloaded = true;
      setStatus('ready');
    });

    api.onUpdateError((info) => {
      updateDownloaded = false;
      // Full detail goes to the log; the banner never shows the raw stack trace —
      // only SmartScreen guidance (where the user must act) or a friendly message.
      console.error('Auto-update error:', info.message);
      const actionable = /signature|certificate|SmartScreen/i.test(info.message || '');
      const message = actionable
        ? `${App.__('updCheckFailed', { message: info.message })} ${App.__('updSmartScreenHint')}`
        : App.__('updCheckFailedGeneric');
      setStatus('error', null, null, message);
    });
  }

  // entry.ts loads this module last; the DOM is ready by the time the
  // DOMContentLoaded listeners registered by the other modules run.
  document.addEventListener('DOMContentLoaded', init);

  App.Update = { init };
})();

export {};
