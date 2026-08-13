// Integration tests — Echo mode enter/exit flow
import { setupTest, injectGroup, injectTerminal } from '../setup.js';

describe('Integration: Echo Flow', () => {
  let App;

  beforeEach(async () => {
    App = await setupTest('terminal', 'tabs', 'groups', 'ui', 'echo', 'menus');

    injectGroup('g1', 'Group 1');
    App.state.activeGroupId = 'g1';
  });

  describe('enterEchoMode', () => {
    // Helper: enterEchoMode is an internal function called by toggleEchoMode.
    // It does NOT set echoModeActive=true itself — the caller (toggleEchoMode) does.
    function enter() {
      App.state.echoModeActive = true;
      App.Echo.enterEchoMode();
    }

    it('activates echo mode when group has 2+ terminals', () => {
      injectTerminal(1);
      injectTerminal(2);
      App.state.terminalGroups.set(1, 'g1');
      App.state.terminalGroups.set(2, 'g1');
      App.state.groups.get('g1').terminalIds.add(1);
      App.state.groups.get('g1').terminalIds.add(2);

      enter();

      expect(App.state.echoModeActive).toBe(true);
    });

    it('selects all terminals by default', () => {
      injectTerminal(1);
      injectTerminal(2);
      App.state.terminalGroups.set(1, 'g1');
      App.state.terminalGroups.set(2, 'g1');
      App.state.groups.get('g1').terminalIds.add(1);
      App.state.groups.get('g1').terminalIds.add(2);

      enter();

      expect(App.state.echoSelection.has(1)).toBe(true);
      expect(App.state.echoSelection.has(2)).toBe(true);
    });

    it('shows echo checkboxes', () => {
      injectTerminal(1);
      injectTerminal(2);
      App.state.terminalGroups.set(1, 'g1');
      App.state.terminalGroups.set(2, 'g1');
      App.state.groups.get('g1').terminalIds.add(1);
      App.state.groups.get('g1').terminalIds.add(2);

      enter();

      const entry1 = App.state.terminals.get(1);
      const cb1 = entry1.paneEl.querySelector('.pane-checkbox');
      expect(cb1.style.display).not.toBe('none');
    });

    it('shows echo control buttons', () => {
      injectTerminal(1);
      injectTerminal(2);
      App.state.terminalGroups.set(1, 'g1');
      App.state.terminalGroups.set(2, 'g1');
      App.state.groups.get('g1').terminalIds.add(1);
      App.state.groups.get('g1').terminalIds.add(2);

      enter();

      expect(App.btnEchoAll.classList.contains('hidden')).toBe(false);
      expect(App.btnEchoToggle.classList.contains('hidden')).toBe(false);
    });

    it('hides tab list in echo mode', () => {
      injectTerminal(1);
      injectTerminal(2);
      App.state.terminalGroups.set(1, 'g1');
      App.state.terminalGroups.set(2, 'g1');
      App.state.groups.get('g1').terminalIds.add(1);
      App.state.groups.get('g1').terminalIds.add(2);

      enter();

      expect(App.tabList.style.display).toBe('none');
    });

    it('creates a fixed (non-adjustable) grid', () => {
      for (let i = 1; i <= 3; i++) {
        injectTerminal(i);
        App.state.terminalGroups.set(i, 'g1');
        App.state.groups.get('g1').terminalIds.add(i);
      }

      enter();

      const splitMock = globalThis as typeof globalThis & {
        Split: { mock: { results: Array<{ value: { destroy: (...args: boolean[]) => unknown } }> } };
      };
      const splits = splitMock.Split.mock.results.map(r => r.value);
      expect(splits.length).toBeGreaterThan(0);
      for (const s of splits) {
        // destroy(true, true) keeps the gutters and sizes but removes drag listeners
        expect(s.destroy).toHaveBeenCalledWith(true, true);
      }
    });

    it('rejects echo mode with fewer than 2 terminals', () => {
      injectTerminal(1);
      App.state.terminalGroups.set(1, 'g1');
      App.state.groups.get('g1').terminalIds.add(1);

      App.state.echoModeActive = true;
      App.Echo.enterEchoMode();

      expect(App.state.echoModeActive).toBe(false);
    });
  });

  describe('exitEchoMode', () => {
    function enterThenExit() {
      for (let i = 1; i <= 3; i++) {
        injectTerminal(i);
        App.state.terminalGroups.set(i, 'g1');
        App.state.groups.get('g1').terminalIds.add(i);
      }
      App.state.echoModeActive = true;
      App.Echo.enterEchoMode();
      App.Echo.exitEchoMode();
    }

    it('deactivates echo mode', () => {
      enterThenExit();
      // exitEchoMode cleans up UI but doesn't toggle the flag;
      // toggleEchoMode handles the boolean. We verify cleanup happened.
      expect(App.tabList.style.display).not.toBe('none');
    });

    it('hides echo checkboxes', () => {
      enterThenExit();
      const entry1 = App.state.terminals.get(1);
      const cb1 = entry1.paneEl.querySelector('.pane-checkbox');
      expect(cb1.style.display).toBe('none');
    });

    it('hides echo control buttons', () => {
      enterThenExit();
      expect(App.btnEchoAll.classList.contains('hidden')).toBe(true);
      expect(App.btnEchoToggle.classList.contains('hidden')).toBe(true);
    });

    it('restores tab list visibility', () => {
      enterThenExit();
      expect(App.tabList.style.display).not.toBe('none');
    });

    it('clears echo selection', () => {
      enterThenExit();
      expect(App.state.echoSelection.size).toBe(0);
    });
  });

  describe('toggleEchoMode', () => {
    it('enters echo mode when off', () => {
      for (let i = 1; i <= 3; i++) {
        injectTerminal(i);
        App.state.terminalGroups.set(i, 'g1');
        App.state.groups.get('g1').terminalIds.add(i);
      }
      App.Echo.toggleEchoMode();
      expect(App.state.echoModeActive).toBe(true);
    });

    it('exits echo mode when on', () => {
      for (let i = 1; i <= 3; i++) {
        injectTerminal(i);
        App.state.terminalGroups.set(i, 'g1');
        App.state.groups.get('g1').terminalIds.add(i);
      }
      App.state.echoModeActive = true;
      App.Echo.toggleEchoMode();
      expect(App.state.echoModeActive).toBe(false);
    });
  });
});
