/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Auto-update UI
   Update prompt dialog (available / downloading / ready to install) plus the
   "Updates" section of the options panel. All persistence lives in the main
   process (settings.json); this module only reflects it over IPC.
   ═══════════════════════════════════════════════════════════════════════════ */

import type { UpdateSettings } from '../shared/ipc';

(function () {
  'use strict';
  const api = App.api;

  // ── State ──
  let settings: UpdateSettings | null = null; // cached copy from the main process
  let offeredVersion: string | null = null;   // version currently shown in the prompt
  let installReady = false;                   // download finished, install button enabled

  const DEFAULT_SETTINGS: UpdateSettings = {
    includePrerelease: false,
    checkForUpdatesAutomatically: true,
    skippedVersion: null,
    nextCheckAt: null,
  };

  // ── DOM refs ──
  let updateDialog: HTMLElement | null;
  let updateMessage: HTMLElement | null;
  let updateInstall: HTMLButtonElement | null;
  let updateSkip: HTMLButtonElement | null;
  let updateRemind: HTMLButtonElement | null;
  let optCheckUpdates: HTMLInputElement | null;
  let optIncludePrerelease: HTMLInputElement | null;
  let btnCheckUpdates: HTMLButtonElement | null;
  let updStatusBanner: HTMLElement | null;
  let updStatusLine: HTMLElement | null;
  let updProgressTrack: HTMLElement | null;
  let updProgressBar: HTMLElement | null;
  let updSkippedFooter: HTMLElement | null;
  let updSkippedInfo: HTMLElement | null;
  let btnUndoSkip: HTMLButtonElement | null;

  function init() {
    cacheDom();
    bindEvents();
    subscribeEvents();
    setStatus('idle');
    loadSettings();
    // Keep the card's JS-set text in sync when the user switches language.
    App.i18n.onLocaleChange(() => {
      renderStatus();
      renderSkippedInfo();
    });
  }

  function cacheDom() {
    updateDialog = document.getElementById('updateDialog');
    updateMessage = document.getElementById('updateMessage');
    updateInstall = document.getElementById('updateInstall') as HTMLButtonElement | null;
    updateSkip = document.getElementById('updateSkip') as HTMLButtonElement | null;
    updateRemind = document.getElementById('updateRemind') as HTMLButtonElement | null;
    optCheckUpdates = document.getElementById('optCheckUpdates') as HTMLInputElement | null;
    optIncludePrerelease = document.getElementById('optIncludePrerelease') as HTMLInputElement | null;
    btnCheckUpdates = document.getElementById('btnCheckUpdates') as HTMLButtonElement | null;
    updStatusBanner = document.getElementById('updStatusBanner');
    updStatusLine = document.getElementById('updStatusLine');
    updProgressTrack = document.getElementById('updProgressTrack');
    updProgressBar = document.getElementById('updProgressBar');
    updSkippedFooter = document.getElementById('updSkippedFooter');
    updSkippedInfo = document.getElementById('updSkippedInfo');
    btnUndoSkip = document.getElementById('btnUndoSkip') as HTMLButtonElement | null;
  }

  async function loadSettings() {
    try {
      settings = await api.updateGetSettings();
      applySettingsToUI();
    } catch (err) {
      console.error('Failed to load update settings:', err);
    }
  }

  function applySettingsToUI() {
    if (!settings) return;
    if (optCheckUpdates) optCheckUpdates.checked = settings.checkForUpdatesAutomatically;
    if (optIncludePrerelease) optIncludePrerelease.checked = settings.includePrerelease;
    renderSkippedInfo();
  }

  function renderSkippedInfo() {
    if (!updSkippedInfo || !updSkippedFooter) return;
    if (settings && settings.skippedVersion) {
      updSkippedInfo.textContent = App.__('updSkippedVersion', { version: settings.skippedVersion });
      updSkippedFooter.classList.remove('hidden');
    } else {
      updSkippedFooter.classList.add('hidden');
    }
  }

  type UpdateStatusState = 'idle' | 'checking' | 'uptodate' | 'available' | 'downloading' | 'ready' | 'error' | 'portable';

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
      case 'portable':
        return App.__('updPortableManual');
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
  }

  // The banner is always visible; idle is the initial state.
  function setStatus(state: UpdateStatusState = 'idle', version: string | null = null, percent: number | null = null, errorMessage: string | null = null) {
    statusState = state;
    statusVersion = version;
    statusPercent = percent;
    statusError = state === 'error' ? errorMessage : null;
    renderStatus();
  }

  function showUpdatePrompt(version: string) {
    if (!updateDialog || !updateMessage || !updateInstall) return;
    offeredVersion = version;
    installReady = false;
    updateMessage.textContent = App.__('updAvailableBody', { version });
    updateInstall.textContent = App.__('updDownloading');
    updateInstall.disabled = true;
    updateDialog.classList.remove('hidden');
  }

  function closeUpdatePrompt() {
    if (updateDialog) updateDialog.classList.add('hidden');
    offeredVersion = null;
  }

  function bindEvents() {
    if (updateInstall) {
      updateInstall.addEventListener('click', () => api.updateInstall());
    }
    if (updateSkip) {
      updateSkip.addEventListener('click', async () => {
        if (offeredVersion) {
          try {
            await api.updateSkipVersion(offeredVersion);
            settings = { ...(settings ?? DEFAULT_SETTINGS), skippedVersion: offeredVersion };
            renderSkippedInfo();
          } catch (err) {
            console.error('Failed to skip version:', err);
          }
        }
        setStatus('idle');
        closeUpdatePrompt();
      });
    }
    if (updateRemind) {
      updateRemind.addEventListener('click', async () => {
        try {
          await api.updateRemindLater();
        } catch (err) {
          console.error('Failed to save reminder:', err);
        }
        setStatus('idle');
        closeUpdatePrompt();
      });
    }
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
    if (btnUndoSkip) {
      btnUndoSkip.addEventListener('click', async () => {
        try {
          settings = await api.updateSetSettings({ skippedVersion: null });
          renderSkippedInfo();
        } catch (err) {
          console.error('Failed to clear skipped version:', err);
        }
      });
    }
  }

  function subscribeEvents() {
    api.onUpdateAvailable((info) => {
      setStatus('available', info.version);
      showUpdatePrompt(info.version);
    });

    api.onUpdateNotAvailable(() => {
      setStatus('uptodate');
    });

    api.onUpdateProgress((info) => {
      setStatus('downloading', null, info.percent);
      if (updateInstall && offeredVersion && !installReady) {
        updateInstall.textContent = `${App.__('updDownloading')} ${info.percent}%`;
      }
    });

    api.onUpdateDownloaded((info) => {
      installReady = true;
      setStatus('ready');
      if (updateMessage && offeredVersion === info.version) {
        updateMessage.textContent = App.__('updReadyBody', { version: info.version });
      }
      if (updateInstall) {
        updateInstall.textContent = App.__('updInstallNow');
        updateInstall.disabled = false;
      }
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

    // Portable builds: no auto-update — the main process already opened the
    // GitHub releases page; the banner explains it so the click doesn't look dead.
    api.onUpdatePortable(() => {
      setStatus('portable');
    });
  }

  // entry.ts loads this module last; the DOM is ready by the time the
  // DOMContentLoaded listeners registered by the other modules run.
  document.addEventListener('DOMContentLoaded', init);

  App.Update = { init };
})();

export {};
