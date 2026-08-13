// Integration tests — Group management (create, switch, delete)
import { setupTest, injectTerminal } from '../setup.js';

describe('Integration: Group Switching', () => {
  let App;

  beforeEach(async () => {
    App = await setupTest('terminal', 'tabs', 'groups', 'ui', 'echo', 'menus');
  });

  describe('createGroup', () => {
    it('creates a group and adds it to state', () => {
      const group = App.Groups.createGroup('Dev', true);
      expect(App.state.groups.has(group.id)).toBe(true);
    });

    it('sets group as active when isDefault=true', () => {
      const group = App.Groups.createGroup('Default', true);
      expect(App.state.activeGroupId).toBe(group.id);
    });

    it('adds group to groupOrder', () => {
      const group = App.Groups.createGroup('Group A', false);
      expect(App.state.groupOrder).toContain(group.id);
    });

    it('creates a DOM tab element', () => {
      const group = App.Groups.createGroup('Dev', false);
      const tab = App.groupList.querySelector(`[data-group-id="${group.id}"]`);
      expect(tab).not.toBeNull();
      expect(tab.querySelector('.group-name').textContent).toBe('Dev');
    });

    it('creates multiple groups with unique IDs', () => {
      const g1 = App.Groups.createGroup('G1', true);
      const g2 = App.Groups.createGroup('G2', false);
      expect(g1.id).not.toBe(g2.id);
      expect(App.state.groups.size).toBe(2);
      expect(App.state.groupOrder.length).toBe(2);
    });
  });

  describe('switchGroup', () => {
    it('changes activeGroupId', () => {
      App.Groups.createGroup('Group 1', true);
      const g2 = App.Groups.createGroup('Group 2', false);

      App.Groups.switchGroup(g2.id);

      expect(App.state.activeGroupId).toBe(g2.id);
    });

    it('updates group tab active class', () => {
      const g1 = App.Groups.createGroup('Group 1', true);
      const g2 = App.Groups.createGroup('Group 2', false);
      App.Groups.switchGroup(g2.id);

      const tab1 = App.groupList.querySelector(`[data-group-id="${g1.id}"]`);
      const tab2 = App.groupList.querySelector(`[data-group-id="${g2.id}"]`);
      expect(tab1.classList.contains('active')).toBe(false);
      expect(tab2.classList.contains('active')).toBe(true);
    });

    it('preserves group selection across switches', () => {
      const g1 = App.Groups.createGroup('Group 1', true);
      const g2 = App.Groups.createGroup('Group 2', false);
      App.state.selectedGroups.add(g1.id);

      App.Groups.switchGroup(g2.id);

      // selectedGroups should be preserved (not cleared)
      expect(App.state.selectedGroups.has(g1.id)).toBe(true);
    });

    it('hides echo control buttons when switching to a group with echo off', () => {
      const g1 = App.Groups.createGroup('Group 1', true);
      const g2 = App.Groups.createGroup('Group 2', false);

      injectTerminal(1);
      injectTerminal(2);
      App.state.terminalGroups.set(1, g1.id);
      App.state.terminalGroups.set(2, g1.id);
      App.state.groups.get(g1.id).terminalIds.add(1);
      App.state.groups.get(g1.id).terminalIds.add(2);

      App.Echo.toggleEchoMode(); // echo ON for g1
      expect(App.btnEchoAll.classList.contains('hidden')).toBe(false);

      App.Groups.switchGroup(g2.id);

      expect(App.state.echoModeActive).toBe(false);
      expect(App.btnEchoAll.classList.contains('hidden')).toBe(true);
      expect(App.btnEchoToggle.classList.contains('hidden')).toBe(true);
      expect(App.btnEchoPaste.classList.contains('hidden')).toBe(true);
    });

    it('shows echo control buttons when switching back to a group with echo active', () => {
      const g1 = App.Groups.createGroup('Group 1', true);
      const g2 = App.Groups.createGroup('Group 2', false);

      injectTerminal(1);
      injectTerminal(2);
      App.state.terminalGroups.set(1, g1.id);
      App.state.terminalGroups.set(2, g1.id);
      App.state.groups.get(g1.id).terminalIds.add(1);
      App.state.groups.get(g1.id).terminalIds.add(2);

      App.Echo.toggleEchoMode(); // echo ON for g1
      App.Groups.switchGroup(g2.id); // echo OFF
      expect(App.btnEchoAll.classList.contains('hidden')).toBe(true);

      App.Groups.switchGroup(g1.id); // echo restored

      expect(App.state.echoModeActive).toBe(true);
      expect(App.btnEchoAll.classList.contains('hidden')).toBe(false);
      expect(App.btnEchoToggle.classList.contains('hidden')).toBe(false);
      expect(App.btnEchoPaste.classList.contains('hidden')).toBe(false);
    });
  });

  describe('deleteGroup', () => {
    it('removes group from state', () => {
      App.Groups.createGroup('Group 1', true);
      const g2 = App.Groups.createGroup('Group 2', false);

      App.Groups.deleteGroup(g2.id);

      expect(App.state.groups.has(g2.id)).toBe(false);
      expect(App.state.groupOrder).not.toContain(g2.id);
    });

    it('switches to another group when active group is deleted', () => {
      const g1 = App.Groups.createGroup('Group 1', true);
      const g2 = App.Groups.createGroup('Group 2', false);
      App.Groups.switchGroup(g2.id);

      App.Groups.deleteGroup(g2.id);

      expect(App.state.activeGroupId).toBe(g1.id);
    });

    it('does not delete the last group', () => {
      const g1 = App.Groups.createGroup('Group 1', true);

      App.Groups.deleteGroup(g1.id);

      // Should still exist
      expect(App.state.groups.has(g1.id)).toBe(true);
    });

    it('closes all terminals in deleted group', () => {
      App.Groups.createGroup('Group 1', true);
      const g2 = App.Groups.createGroup('Group 2', false);
      App.Groups.switchGroup(g2.id);

      // Add terminals to g2 via spawn
      injectTerminal(1);
      injectTerminal(2);
      App.state.terminalGroups.set(1, g2.id);
      App.state.terminalGroups.set(2, g2.id);
      App.state.groups.get(g2.id).terminalIds.add(1);
      App.state.groups.get(g2.id).terminalIds.add(2);

      App.Groups.deleteGroup(g2.id);

      expect(App.state.terminals.has(1)).toBe(false);
      expect(App.state.terminals.has(2)).toBe(false);
    });

    it('hides echo control buttons when deleting the active echo group', () => {
      const g1 = App.Groups.createGroup('Group 1', true);
      App.Groups.createGroup('Group 2', false);

      injectTerminal(1);
      injectTerminal(2);
      App.state.terminalGroups.set(1, g1.id);
      App.state.terminalGroups.set(2, g1.id);
      App.state.groups.get(g1.id).terminalIds.add(1);
      App.state.groups.get(g1.id).terminalIds.add(2);

      App.Echo.toggleEchoMode(); // echo ON for g1
      expect(App.btnEchoAll.classList.contains('hidden')).toBe(false);

      App.Groups.deleteGroup(g1.id);

      expect(App.state.echoModeActive).toBe(false);
      expect(App.btnEchoAll.classList.contains('hidden')).toBe(true);
      expect(App.btnEchoToggle.classList.contains('hidden')).toBe(true);
      expect(App.btnEchoPaste.classList.contains('hidden')).toBe(true);
    });
  });

  describe('moveTerminalToGroup', () => {
    it('moves terminal between groups', () => {
      const g1 = App.Groups.createGroup('Group 1', true);
      const g2 = App.Groups.createGroup('Group 2', false);

      injectTerminal(1);
      App.state.terminalGroups.set(1, g1.id);
      App.state.groups.get(g1.id).terminalIds.add(1);

      App.Groups.moveTerminalToGroup(1, g2.id);

      expect(App.state.terminalGroups.get(1)).toBe(g2.id);
      expect(App.state.groups.get(g1.id).terminalIds.has(1)).toBe(false);
      expect(App.state.groups.get(g2.id).terminalIds.has(1)).toBe(true);
    });
  });
});
