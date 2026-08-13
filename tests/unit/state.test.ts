// Unit tests for state.js — initial state shape and constants
import { resetTestEnv, getApp } from '../setup.js';

describe('State (state.js)', () => {
  beforeEach(async () => {
    await resetTestEnv();
  });

  describe('initial state shape', () => {
    it('has all required state keys', () => {
      const { state } = getApp();
      expect(state.terminals).toBeInstanceOf(Map);
      expect(state.paneOrder).toEqual([]);
      expect(state.activeTerminalId).toBeNull();
      expect(state.selectedShell).toBe('powershell');
      expect(state.echoSelection).toBeInstanceOf(Set);
      expect(state.echoModeActive).toBe(false);
      expect(state.dataUnsubscribers).toEqual([]);
      expect(state.splitInstance).toBeNull();
      expect(state.gridSplits).toEqual([]);
      expect(state.groups).toBeInstanceOf(Map);
      expect(state.terminalGroups).toBeInstanceOf(Map);
      expect(state.groupOrder).toEqual([]);
      expect(state.activeGroupId).toBeNull();
      expect(state.groupEchoActive).toBeInstanceOf(Map);
      expect(state.groupEchoSelection).toBeInstanceOf(Map);
      expect(state.selectedTabs).toBeInstanceOf(Set);
      expect(state.lastClickedTabId).toBeNull();
      expect(state.selectedGroups).toBeInstanceOf(Set);
      expect(state.lastClickedGroupId).toBeNull();
      expect(state.isRenaming).toBe(false);
    });

    it('has $ as a function', () => {
      const App = getApp();
      expect(typeof App.$).toBe('function');
    });
  });

  describe('constants', () => {
    it('TAB_ICONS maps shells correctly', () => {
      const App = getApp();
      expect(App.TAB_ICONS.powershell).toBe('⬡');
      expect(App.TAB_ICONS.cmd).toBe('❯');
      expect(App.TAB_ICONS.gitbash).toBe('$');
    });

    it('SHELL_LABELS maps shell keys to i18n keys', () => {
      const App = getApp();
      expect(App.SHELL_LABELS.powershell).toBe('shellPowerShell');
      expect(App.SHELL_LABELS.cmd).toBe('shellCmd');
      expect(App.SHELL_LABELS.gitbash).toBe('shellGitBash');
    });

    it('getShellName resolves shell keys to translated display names', () => {
      const App = getApp();
      expect(App.getShellName('powershell')).toBe('PowerShell');
      expect(App.getShellName('cmd')).toBe('CMD');
      expect(App.getShellName('gitbash')).toBe('Git Bash');
    });
  });

  describe('DOM refs', () => {
    it('exposes all DOM references on App', () => {
      const App = getApp();
      expect(App.container).toBeInstanceOf(HTMLElement);
      expect(App.container.id).toBe('terminal-container');
      expect(App.tabList).toBeInstanceOf(HTMLElement);
      expect(App.btnNewTerminal).toBeInstanceOf(HTMLElement);
      expect(App.btnEchoMode).toBeInstanceOf(HTMLElement);
      expect(App.groupList).toBeInstanceOf(HTMLElement);
    });
  });
});
