// Unit tests for ui.js — status bar, toast, options
import { resetTestEnv, loadModules, getApp, injectTerminal } from '../setup.js';

// Flush pending promise microtasks between click and assertion
function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('UI (ui.js)', () => {
  beforeEach(async () => {
    await resetTestEnv();
    await loadModules('ui');
  });

  describe('updateStatusBar', () => {
    it('displays terminal count (singular)', () => {
      getApp().UI.updateStatusBar();
      expect(getApp().statusTerminalCount.textContent).toBe(getApp()._p('statusTerminalCount', 0));
    });

    it('displays terminal count (plural)', () => {
      const App = getApp();
      injectTerminal(1);
      injectTerminal(2);
      App.UI.updateStatusBar();
      expect(App.statusTerminalCount.textContent).toBe(App._p('statusTerminalCount', 2));
    });

    it('shows echo status when OFF', () => {
      const App = getApp();
      App.UI.updateStatusBar();
      expect(App.statusEcho.classList.contains('hidden')).toBe(true);
    });

    it('shows echo status when ON', () => {
      const App = getApp();
      App.state.echoModeActive = true;
      App.UI.updateStatusBar();
      expect(App.statusEcho.textContent).toBe(App.__('statusEchoOn'));
      expect(App.statusEcho.classList.contains('hidden')).toBe(false);
    });

    it('shows shell name', () => {
      getApp().UI.updateStatusBar();
      expect(getApp().statusShell.textContent).toBe(getApp().__('statusShell', { shell: 'PowerShell' }));
    });

    it('updates shell name when selectedShell changes', () => {
      const App = getApp();
      App.state.selectedShell = 'cmd';
      App.UI.updateStatusBar();
      expect(App.statusShell.textContent).toBe(App.__('statusShell', { shell: 'CMD' }));
    });
  });

  describe('showToast', () => {
    it('creates a toast element with the message', () => {
      getApp().UI.showToast('Hello World');
      const toast = document.querySelector('.toast');
      expect(toast).not.toBeNull();
      expect(toast.textContent).toBe('Hello World');
    });

    it('removes existing toast before creating new one', () => {
      const App = getApp();
      App.UI.showToast('First');
      App.UI.showToast('Second');
      const toasts = document.querySelectorAll('.toast');
      expect(toasts.length).toBe(1);
      expect(toasts[0].textContent).toBe('Second');
    });
  });

  describe('Danger Zone (settings panel)', () => {
    beforeEach(async () => {
      // menus module provides App.Menus.showConfirm used by the danger buttons
      await loadModules('menus');
    });

    it('reset settings button clears stored settings after confirmation', () => {
      const App = getApp();
      localStorage.setItem('appTheme', 'light');
      localStorage.setItem('defaultShell', 'cmd');
      localStorage.setItem('uiFontSize', '20');
      localStorage.setItem('termFontSize', '16');
      localStorage.setItem('skipTabCloseConfirm', 'true');
      localStorage.setItem('skipRightClickPaste', 'true');
      localStorage.setItem('i18nLocale', 'ja');

      App.UI.bindSettings();

      const btn = document.getElementById('btnResetSettings');
      btn.click();
      const dialog = document.getElementById('confirmDialog');
      expect(dialog.classList.contains('hidden')).toBe(false);

      document.getElementById('confirmOk').click();

      expect(localStorage.getItem('appTheme')).toBeNull();
      expect(localStorage.getItem('defaultShell')).toBeNull();
      expect(localStorage.getItem('uiFontSize')).toBeNull();
      expect(localStorage.getItem('termFontSize')).toBeNull();
      expect(localStorage.getItem('skipTabCloseConfirm')).toBeNull();
      expect(localStorage.getItem('skipRightClickPaste')).toBeNull();
      // Language is reset to the default (English) and persisted as such
      expect(localStorage.getItem('i18nLocale')).toBe('en');
    });

    it('clear SSH button calls sshClearAll after confirmation', async () => {
      getApp().UI.bindSettings();

      document.getElementById('btnClearSshData').click();
      const dialog = document.getElementById('confirmDialog');
      expect(dialog.classList.contains('hidden')).toBe(false);

      document.getElementById('confirmOk').click();
      await flush();

      expect(window.api.sshClearAll).toHaveBeenCalled();
    });

    it('clear cache button calls clearCache after confirmation', async () => {
      getApp().UI.bindSettings();

      document.getElementById('btnClearCache').click();
      const dialog = document.getElementById('confirmDialog');
      expect(dialog.classList.contains('hidden')).toBe(false);

      document.getElementById('confirmOk').click();
      await flush();

      expect(window.api.clearCache).toHaveBeenCalled();
    });

    it('clear all data button calls clearAllData after confirmation', async () => {
      getApp().UI.bindSettings();

      document.getElementById('btnClearAllData').click();
      const dialog = document.getElementById('confirmDialog');
      expect(dialog.classList.contains('hidden')).toBe(false);

      document.getElementById('confirmOk').click();
      await flush();

      expect(window.api.clearAllData).toHaveBeenCalled();
    });
  });
});
