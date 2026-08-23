/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Auto-update UI
   Status banner (the "Updates" section of the options panel) plus the title-bar
   install button. Installed builds download in the background and the button
   installs; portable/zip builds never download and the button opens the GitHub
   releases page instead.
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

  function renderStatus() {
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
    // Title-bar button: portable/zip builds show it as soon as an update is
    // available (clicking opens the GitHub page); installed builds only after
    // the installer is downloaded (clicking installs).
    if (btnInstallUpdate) {
      const show = isPortable ? statusState === 'available' : statusState === 'ready';
      btnInstallUpdate.classList.toggle('hidden', !show);
      if (show) {
        const label = isPortable ? App.__('updGetUpdate') : App.__('updInstallUpdate');
        if (btnInstallUpdateLabel) btnInstallUpdateLabel.textContent = label;
        btnInstallUpdate.title = label;
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
    if (btnInstallUpdate) {
      btnInstallUpdate.addEventListener('click', () => {
        if (isPortable) {
          // Portable/zip: no install, just point at the download page.
          api.updateInstall();
          return;
        }
        // Always warn before closing the app — installing ends every terminal
        // session, so this is never silently skipped.
        App.Menus.showConfirm(App.__('updInstallConfirmBody'), () => {
          api.updateInstall();
        }, undefined, 'updInstallNow');
      });
    }
  }

  function subscribeEvents() {
    api.onUpdateAvailable((info) => {
      setStatus('available', info.version);
    });

    api.onUpdateNotAvailable(() => {
      setStatus('uptodate');
    });

    api.onUpdateProgress((info) => {
      setStatus('downloading', null, info.percent);
    });

    api.onUpdateDownloaded(() => {
      setStatus('ready');
    });

    api.onUpdateError((info) => {
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
