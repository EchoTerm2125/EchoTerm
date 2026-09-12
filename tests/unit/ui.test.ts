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
      // menus module provides App.Menus.showConfirm used by the danger buttons;
      // theme module provides App.Theme, whose setters re-persist appearance
      // defaults during the reset.
      await loadModules('menus', 'theme');
    });

    it('reset settings button clears stored settings after confirmation', () => {
      const App = getApp();
      localStorage.setItem('appTheme', 'light');
      localStorage.setItem('defaultShell', 'cmd');
      localStorage.setItem('uiFontSize', '20');
      localStorage.setItem('termFontSize', '16');
      localStorage.setItem('maxRetainedLines', '5000');
      localStorage.setItem('skipTabCloseConfirm', 'true');
      localStorage.setItem('skipRightClickPaste', 'true');
      localStorage.setItem('i18nLocale', 'ja');

      App.UI.bindSettings();

      const btn = document.getElementById('btnResetSettings');
      btn.click();
      const dialog = document.getElementById('confirmDialog');
      expect(dialog.classList.contains('hidden')).toBe(false);

      document.getElementById('confirmOk').click();

      // Toggles are cleared outright
      expect(localStorage.getItem('defaultShell')).toBeNull();
      expect(localStorage.getItem('skipTabCloseConfirm')).toBeNull();
      expect(localStorage.getItem('skipRightClickPaste')).toBeNull();
      // Appearance settings are reset to their defaults and persisted as such
      expect(localStorage.getItem('appTheme')).toBe('dark');
      expect(localStorage.getItem('uiFontSize')).toBe('13');
      expect(localStorage.getItem('termFontSize')).toBe('13');
      expect(localStorage.getItem('maxRetainedLines')).toBe('1000');
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

  describe('max retained lines', () => {
    beforeEach(async () => {
      await loadModules('theme', 'menus');
    });

    it('defaults to 1000 when unset', () => {
      expect(getApp().Theme.getMaxRetainedLines()).toBe(1000);
    });

    it('clamps stored values into 100..1000000', () => {
      const Theme = getApp().Theme;
      localStorage.setItem('maxRetainedLines', '9999999');
      expect(Theme.getMaxRetainedLines()).toBe(1000000);
      localStorage.setItem('maxRetainedLines', '5');
      expect(Theme.getMaxRetainedLines()).toBe(100);
      localStorage.setItem('maxRetainedLines', 'not-a-number');
      expect(Theme.getMaxRetainedLines()).toBe(1000);
    });

    it('persists the value and applies it to open panes', () => {
      const App = getApp();
      const entry = injectTerminal(1, { term: { options: {} } });
      App.Theme.setMaxRetainedLines(25000);
      expect(localStorage.getItem('maxRetainedLines')).toBe('25000');
      expect(entry.term.options.scrollback).toBe(25000);
    });

    it('ignores non-numeric input', () => {
      getApp().Theme.setMaxRetainedLines(NaN);
      expect(localStorage.getItem('maxRetainedLines')).toBeNull();
    });

    // The retained-lines inputs live inside the options panel in the real app,
    // so append them there before binding for these warning tests.
    function mountRetainedInputs() {
      const App = getApp();
      const slider = document.createElement('input');
      slider.id = 'optMaxRetainedLines';
      const num = document.createElement('input');
      num.id = 'optMaxRetainedLinesNum';
      App.optionsPanel.appendChild(slider);
      App.optionsPanel.appendChild(num);
      App.UI.bindSettings();
      return num;
    }

    it('applies values up to 100000 without a prompt', () => {
      const num = mountRetainedInputs();
      num.value = '100000';
      num.dispatchEvent(new Event('change'));

      expect(document.getElementById('confirmDialog').classList.contains('hidden')).toBe(true);
      expect(localStorage.getItem('maxRetainedLines')).toBe('100000');
    });

    it('warns and blocks before applying a value above 100000', () => {
      const num = mountRetainedInputs();
      num.value = '500000';
      num.dispatchEvent(new Event('change'));

      expect(document.getElementById('confirmDialog').classList.contains('hidden')).toBe(false);
      expect(localStorage.getItem('maxRetainedLines')).toBeNull();

      document.getElementById('confirmOk').click();
      expect(localStorage.getItem('maxRetainedLines')).toBe('500000');
      expect(num.value).toBe('500000');
    });

    it('keeps the previous value when the >100000 warning is cancelled', () => {
      const num = mountRetainedInputs();
      num.value = '500000';
      num.dispatchEvent(new Event('change'));

      document.getElementById('confirmCancel').click();

      expect(localStorage.getItem('maxRetainedLines')).toBeNull();
      expect(num.value).toBe('1000');
    });
  });
});
