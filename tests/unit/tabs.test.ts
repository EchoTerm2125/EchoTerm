// Unit tests for tabs.js — selection, reorder, rename
import { resetTestEnv, loadModules, getApp, injectTerminal, injectGroup } from '../setup.js';

describe('Tabs (tabs.js)', () => {
  let App;

  beforeEach(async () => {
    await resetTestEnv();
    // tabs.js depends on groups.js for getGroupTerminalIds
    await loadModules('terminal', 'groups', 'tabs');
    App = getApp();

    // Set up a group and terminals
    injectGroup('g1', 'Group 1', []);
    App.state.activeGroupId = 'g1';

    // Inject 5 terminals
    for (let i = 1; i <= 5; i++) {
      injectTerminal(i);
      App.state.terminalGroups.set(i, 'g1');
      App.state.groups.get('g1').terminalIds.add(i);
      // Add a tab to the tabList for DOM operations
      App.Tabs.addTab(i, 'powershell');
    }
  });

  describe('toggleTabSelection', () => {
    it('adds terminal to selectedTabs', () => {
      App.Tabs.toggleTabSelection(1);
      expect(App.state.selectedTabs.has(1)).toBe(true);
    });

    it('removes terminal from selectedTabs on second call', () => {
      App.Tabs.toggleTabSelection(1);
      App.Tabs.toggleTabSelection(1);
      expect(App.state.selectedTabs.has(1)).toBe(false);
    });

    it('toggles selected class on tab element', () => {
      App.Tabs.toggleTabSelection(2);
      const tab = App.Tabs.getTabCache().get(2);
      expect(tab.classList.contains('selected')).toBe(true);

      App.Tabs.toggleTabSelection(2);
      expect(tab.classList.contains('selected')).toBe(false);
    });
  });

  describe('clearTabSelection', () => {
    it('removes all selected tabs', () => {
      App.state.selectedTabs.add(1);
      App.state.selectedTabs.add(3);
      App.Tabs.clearTabSelection();
      expect(App.state.selectedTabs.size).toBe(0);
    });
  });

  describe('selectTabRange', () => {
    it('selects range from lower to higher index', () => {
      App.Tabs.selectTabRange(1, 4);
      expect(App.state.selectedTabs.has(1)).toBe(true);
      expect(App.state.selectedTabs.has(2)).toBe(true);
      expect(App.state.selectedTabs.has(3)).toBe(true);
      expect(App.state.selectedTabs.has(4)).toBe(true);
      expect(App.state.selectedTabs.has(5)).toBe(false);
    });

    it('selects range regardless of argument order', () => {
      App.Tabs.selectTabRange(4, 1);
      expect(App.state.selectedTabs.has(1)).toBe(true);
      expect(App.state.selectedTabs.has(4)).toBe(true);
    });

    it('clears previous selection', () => {
      App.state.selectedTabs.add(5);
      App.Tabs.selectTabRange(1, 2);
      expect(App.state.selectedTabs.has(5)).toBe(false);
      expect(App.state.selectedTabs.size).toBe(2);
    });

    it('handles invalid IDs gracefully', () => {
      App.Tabs.selectTabRange(1, 999);
      // Should not throw; selection may be cleared or unchanged
      expect(() => App.Tabs.selectTabRange(999, 1)).not.toThrow();
    });
  });

  describe('reorderTabs', () => {
    it('moves a tab forward in paneOrder', () => {
      // Initial order: [1, 2, 3, 4, 5]
      App.Tabs.reorderTabs(1, 3);
      // 1 should now be after 3: [2, 3, 1, 4, 5]
      expect(App.state.paneOrder.indexOf(1)).toBe(2);
      expect(App.state.paneOrder.indexOf(2)).toBe(0);
      expect(App.state.paneOrder.indexOf(3)).toBe(1);
    });

    it('moves a tab backward in paneOrder', () => {
      App.Tabs.reorderTabs(5, 2);
      // 5 should now be before 2: [1, 5, 2, 3, 4]
      expect(App.state.paneOrder.indexOf(5)).toBe(1);
      expect(App.state.paneOrder.indexOf(1)).toBe(0);
      expect(App.state.paneOrder.indexOf(2)).toBe(2);
    });

    it('handles same from/to gracefully', () => {
      const before = [...App.state.paneOrder];
      App.Tabs.reorderTabs(3, 3);
      expect(App.state.paneOrder).toEqual(before);
    });
  });

  describe('renameTab', () => {
    it('sets customName on terminal entry', () => {
      App.Tabs.renameTab(1, 'MyShell');
      const entry = App.state.terminals.get(1);
      expect(entry.customName).toBe('MyShell');
    });

    it('updates tab label text', () => {
      App.Tabs.renameTab(1, 'Dev Server');
      const tab = App.Tabs.getTabCache().get(1);
      const label = tab.querySelector('.tab-label');
      expect(label.textContent).toBe('Dev Server');
    });
  });
});
