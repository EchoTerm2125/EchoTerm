// Unit tests for groups.js — group management, selection, reorder
import { resetTestEnv, loadModules, getApp, injectTerminal, injectGroup } from '../setup.js';

describe('Groups (groups.js)', () => {
  let App;

  beforeEach(async () => {
    await resetTestEnv();
    // groups.js references App.Terminal, App.Tabs, App.UI, App.Menus, App.Echo
    await loadModules('terminal', 'tabs', 'ui', 'echo', 'menus', 'groups');
    App = getApp();
  });

  describe('getGroupTerminalIds', () => {
    it('returns terminal IDs belonging to a group in paneOrder', () => {
      injectGroup('g1', 'Group 1');
      injectGroup('g2', 'Group 2');
      App.state.activeGroupId = 'g1';

      injectTerminal(1);
      injectTerminal(2);
      injectTerminal(3);
      App.state.terminalGroups.set(1, 'g1');
      App.state.terminalGroups.set(2, 'g2');
      App.state.terminalGroups.set(3, 'g1');
      App.state.groups.get('g1').terminalIds.add(1);
      App.state.groups.get('g1').terminalIds.add(3);
      App.state.groups.get('g2').terminalIds.add(2);

      const ids = App.Groups.getGroupTerminalIds('g1');
      expect(ids).toEqual([1, 3]);
    });

    it('returns empty array for group with no terminals', () => {
      injectGroup('g1', 'Group 1');
      const ids = App.Groups.getGroupTerminalIds('g1');
      expect(ids).toEqual([]);
    });
  });

  describe('toggleGroupSelection', () => {
    it('adds group to selectedGroups', () => {
      injectGroup('g1', 'Group 1');
      App.Groups.toggleGroupSelection('g1');
      expect(App.state.selectedGroups.has('g1')).toBe(true);
    });

    it('removes group from selectedGroups on second call', () => {
      injectGroup('g1', 'Group 1');
      App.Groups.toggleGroupSelection('g1');
      App.Groups.toggleGroupSelection('g1');
      expect(App.state.selectedGroups.has('g1')).toBe(false);
    });
  });

  describe('clearGroupSelection', () => {
    it('removes all selected groups', () => {
      injectGroup('g1', 'G1');
      injectGroup('g2', 'G2');
      App.state.selectedGroups.add('g1');
      App.state.selectedGroups.add('g2');
      App.Groups.clearGroupSelection();
      expect(App.state.selectedGroups.size).toBe(0);
    });
  });

  describe('selectGroupRange', () => {
    it('selects range of groups by order', () => {
      injectGroup('g1', 'G1');
      injectGroup('g2', 'G2');
      injectGroup('g3', 'G3');
      injectGroup('g4', 'G4');

      App.Groups.selectGroupRange('g1', 'g3');
      expect(App.state.selectedGroups.has('g1')).toBe(true);
      expect(App.state.selectedGroups.has('g2')).toBe(true);
      expect(App.state.selectedGroups.has('g3')).toBe(true);
      expect(App.state.selectedGroups.has('g4')).toBe(false);
    });

    it('handles reverse order', () => {
      injectGroup('g1', 'G1');
      injectGroup('g2', 'G2');
      injectGroup('g3', 'G3');

      App.Groups.selectGroupRange('g3', 'g1');
      expect(App.state.selectedGroups.has('g1')).toBe(true);
      expect(App.state.selectedGroups.has('g2')).toBe(true);
      expect(App.state.selectedGroups.has('g3')).toBe(true);
    });

    it('clears previous selection', () => {
      injectGroup('g1', 'G1');
      injectGroup('g2', 'G2');
      injectGroup('g3', 'G3');
      App.state.selectedGroups.add('g3');
      App.Groups.selectGroupRange('g1', 'g2');
      expect(App.state.selectedGroups.has('g3')).toBe(false);
    });
  });

  describe('reorderGroups', () => {
    it('moves a group forward in groupOrder', () => {
      injectGroup('g1', 'G1');
      injectGroup('g2', 'G2');
      injectGroup('g3', 'G3');
      // Initial order: [g1, g2, g3]
      App.Groups.reorderGroups('g1', 'g3');
      // g1 should now be after g3: [g2, g3, g1]
      expect(App.state.groupOrder.indexOf('g1')).toBe(2);
      expect(App.state.groupOrder.indexOf('g2')).toBe(0);
      expect(App.state.groupOrder.indexOf('g3')).toBe(1);
    });

    it('moves a group backward in groupOrder', () => {
      injectGroup('g1', 'G1');
      injectGroup('g2', 'G2');
      injectGroup('g3', 'G3');
      App.Groups.reorderGroups('g3', 'g1');
      // g3 before g1: [g3, g1, g2]
      expect(App.state.groupOrder.indexOf('g3')).toBe(0);
      expect(App.state.groupOrder.indexOf('g1')).toBe(1);
      expect(App.state.groupOrder.indexOf('g2')).toBe(2);
    });
  });

  describe('moveTerminalToGroup', () => {
    it('moves a terminal from one group to another', () => {
      injectGroup('g1', 'Group 1');
      injectGroup('g2', 'Group 2');

      injectTerminal(1);
      App.state.terminalGroups.set(1, 'g1');
      App.state.groups.get('g1').terminalIds.add(1);

      App.Groups.moveTerminalToGroup(1, 'g2');

      expect(App.state.terminalGroups.get(1)).toBe('g2');
      expect(App.state.groups.get('g1').terminalIds.has(1)).toBe(false);
      expect(App.state.groups.get('g2').terminalIds.has(1)).toBe(true);
    });

    it('does nothing when source and target are same', () => {
      injectGroup('g1', 'G1');
      injectTerminal(1);
      App.state.terminalGroups.set(1, 'g1');
      App.state.groups.get('g1').terminalIds.add(1);

      App.Groups.moveTerminalToGroup(1, 'g1');
      expect(App.state.terminalGroups.get(1)).toBe('g1');
      expect(App.state.groups.get('g1').terminalIds.has(1)).toBe(true);
    });
  });

  describe('updateGroupTabs', () => {
    it('updates group count display', () => {
      injectGroup('g1', 'Group 1', [1, 2, 3]);
      const group = App.state.groups.get('g1');
      // Mock _tabEl since we're not going through createGroup
      group._tabEl = document.createElement('div');
      group._tabEl.innerHTML = '<span class="group-count"></span>';
      App.Groups.updateGroupTabs();
      const countEl = group._tabEl.querySelector('.group-count');
      expect(countEl.textContent).toBe('3');
    });
  });
});
