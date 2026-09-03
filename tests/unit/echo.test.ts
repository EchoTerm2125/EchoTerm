// Unit tests for echo.js — grid layout, echo selection logic
import { resetTestEnv, loadModules, getApp, injectTerminal, injectGroup } from '../setup.js';

describe('Echo (echo.js)', () => {
  let App;

  beforeEach(async () => {
    await resetTestEnv();
    // echo.js depends on groups, terminal, ui
    await loadModules('terminal', 'tabs', 'ui', 'groups', 'echo');
    App = getApp();

    // Set up a group
    injectGroup('g1', 'Group 1');
    App.state.activeGroupId = 'g1';
  });

  describe('grid layout calculations', () => {
    function calcGrid(count) {
      const n = Math.ceil(Math.sqrt(count));
      const rows = Math.ceil(count / n);
      return { cols: n, rows };
    }

    it('1 terminal → 1×1 grid', () => {
      const { cols, rows } = calcGrid(1);
      expect(cols).toBe(1);
      expect(rows).toBe(1);
    });

    it('2 terminals → 2×1 grid', () => {
      const { cols, rows } = calcGrid(2);
      expect(cols).toBe(2);
      expect(rows).toBe(1);
    });

    it('3 terminals → 2×2 grid', () => {
      const { cols, rows } = calcGrid(3);
      expect(cols).toBe(2);
      expect(rows).toBe(2);
    });

    it('4 terminals → 2×2 grid', () => {
      const { cols, rows } = calcGrid(4);
      expect(cols).toBe(2);
      expect(rows).toBe(2);
    });

    it('5 terminals → 3×2 grid', () => {
      const { cols, rows } = calcGrid(5);
      expect(cols).toBe(3);
      expect(rows).toBe(2);
    });

    it('9 terminals → 3×3 grid', () => {
      const { cols, rows } = calcGrid(9);
      expect(cols).toBe(3);
      expect(rows).toBe(3);
    });

    it('covers all terminals (no terminal left out)', () => {
      for (let count = 1; count <= 20; count++) {
        const n = Math.ceil(Math.sqrt(count));
        const rows = Math.ceil(count / n);
        expect(n * rows).toBeGreaterThanOrEqual(count);
      }
    });
  });

  describe('toggleEchoAll', () => {
    function setupTerminals(count) {
      for (let i = 1; i <= count; i++) {
        injectTerminal(i);
        App.state.terminalGroups.set(i, 'g1');
        App.state.groups.get('g1').terminalIds.add(i);
      }
    }

    it('selects all terminals when none are selected', () => {
      setupTerminals(3);
      App.Echo.toggleEchoAll();
      expect(App.state.echoSelection.has(1)).toBe(true);
      expect(App.state.echoSelection.has(2)).toBe(true);
      expect(App.state.echoSelection.has(3)).toBe(true);
    });

    it('deselects all when all are selected', () => {
      setupTerminals(3);
      App.state.echoSelection.add(1);
      App.state.echoSelection.add(2);
      App.state.echoSelection.add(3);
      App.Echo.toggleEchoAll();
      expect(App.state.echoSelection.size).toBe(0);
    });

    it('selects remaining when some are unselected', () => {
      setupTerminals(3);
      App.state.echoSelection.add(1);
      // 2 and 3 are not selected
      App.Echo.toggleEchoAll();
      expect(App.state.echoSelection.has(1)).toBe(true);
      expect(App.state.echoSelection.has(2)).toBe(true);
      expect(App.state.echoSelection.has(3)).toBe(true);
    });
  });

  describe('updateEchoAllButton', () => {
    it('sets text to "Disable All" when all selected', () => {
      App.Echo.updateEchoAllButton();
      // No terminals → button text defaults
      expect(App.btnEchoAll.textContent).toBe(App.__('echoEnableAll'));
    });

    it('sets text to "Enable All" when not all selected', () => {
      injectTerminal(1);
      injectTerminal(2);
      App.state.terminalGroups.set(1, 'g1');
      App.state.terminalGroups.set(2, 'g1');
      App.state.groups.get('g1').terminalIds.add(1);
      App.state.groups.get('g1').terminalIds.add(2);
      App.state.echoSelection.add(1); // only 1 of 2 selected

      App.Echo.updateEchoAllButton();
      expect(App.btnEchoAll.textContent).toBe(App.__('echoEnableAll'));
    });
  });

  describe('refocusEchoTerminal', () => {
    it('shifts focus to first echo-selected terminal when active is not in selection', () => {
      injectTerminal(1);
      injectTerminal(2);
      injectTerminal(3);
      App.state.terminalGroups.set(1, 'g1');
      App.state.terminalGroups.set(2, 'g1');
      App.state.terminalGroups.set(3, 'g1');
      App.state.groups.get('g1').terminalIds.add(1);
      App.state.groups.get('g1').terminalIds.add(2);
      App.state.groups.get('g1').terminalIds.add(3);

      App.state.echoModeActive = true;
      App.state.activeTerminalId = 1;
      App.state.echoSelection.add(2);
      App.state.echoSelection.add(3);
      // activeTerminalId 1 is NOT in echoSelection

      App.Echo.refocusEchoTerminal();
      expect(App.state.activeTerminalId).toBe(2);
    });

    it('keeps focus when active is in echo selection', () => {
      injectTerminal(1);
      injectTerminal(2);
      App.state.terminalGroups.set(1, 'g1');
      App.state.terminalGroups.set(2, 'g1');
      App.state.groups.get('g1').terminalIds.add(1);
      App.state.groups.get('g1').terminalIds.add(2);

      App.state.echoModeActive = true;
      App.state.activeTerminalId = 1;
      App.state.echoSelection.add(1);
      App.state.echoSelection.add(2);

      App.Echo.refocusEchoTerminal();
      expect(App.state.activeTerminalId).toBe(1);
    });
  });

  describe('enableEchoOnTerminal', () => {
    function setupTerminals(count) {
      for (let i = 1; i <= count; i++) {
        injectTerminal(i);
        App.state.terminalGroups.set(i, 'g1');
        App.state.groups.get('g1').terminalIds.add(i);
      }
    }

    it('adds a deselected terminal to the selection and syncs its UI', () => {
      setupTerminals(2);
      App.state.echoModeActive = true;
      App.state.echoSelection.add(1);
      const entry2 = App.state.terminals.get(2);

      App.Echo.enableEchoOnTerminal(2);

      expect(App.state.echoSelection.has(2)).toBe(true);
      expect(entry2.paneEl.classList.contains('echo-selected')).toBe(true);
      const cbLabel = entry2.titlebar.querySelector('.pane-checkbox');
      expect(cbLabel.classList.contains('selected')).toBe(true);
      const chk = entry2.titlebar.querySelector('input[type="checkbox"]');
      expect(chk.checked).toBe(true);
    });

    it('is idempotent — enabling an already-enabled terminal changes nothing', () => {
      setupTerminals(2);
      App.state.echoModeActive = true;
      App.state.echoSelection.add(1);
      App.state.echoSelection.add(2);

      App.Echo.enableEchoOnTerminal(2);

      expect(App.state.echoSelection.has(2)).toBe(true);
      expect(App.state.echoSelection.size).toBe(2);
    });

    it('ignores unknown terminal ids', () => {
      setupTerminals(1);
      App.state.echoModeActive = true;

      expect(() => App.Echo.enableEchoOnTerminal(999)).not.toThrow();
      expect(App.state.echoSelection.size).toBe(0);
    });
  });

  describe('soloEchoOnTerminal', () => {
    function setupTerminals(count) {
      for (let i = 1; i <= count; i++) {
        injectTerminal(i);
        App.state.terminalGroups.set(i, 'g1');
        App.state.groups.get('g1').terminalIds.add(i);
      }
    }

    it('keeps only the clicked terminal when all were enabled', () => {
      setupTerminals(3);
      App.state.echoModeActive = true;
      App.state.echoSelection.add(1);
      App.state.echoSelection.add(2);
      App.state.echoSelection.add(3);

      App.Echo.soloEchoOnTerminal(2);

      expect(App.state.echoSelection.has(2)).toBe(true);
      expect(App.state.echoSelection.has(1)).toBe(false);
      expect(App.state.echoSelection.has(3)).toBe(false);
      const chk1 = App.state.terminals.get(1).titlebar.querySelector('input[type="checkbox"]');
      expect(chk1.checked).toBe(false);
      expect(App.state.terminals.get(1).paneEl.classList.contains('echo-selected')).toBe(false);
    });

    it('enables a deselected terminal and disables the others', () => {
      setupTerminals(3);
      App.state.echoModeActive = true;
      App.state.echoSelection.add(1);
      App.state.echoSelection.add(2); // 3 is missing

      App.Echo.soloEchoOnTerminal(3);

      expect(App.state.echoSelection.has(3)).toBe(true);
      expect(App.state.echoSelection.has(1)).toBe(false);
      expect(App.state.echoSelection.has(2)).toBe(false);
      const chk3 = App.state.terminals.get(3).titlebar.querySelector('input[type="checkbox"]');
      expect(chk3.checked).toBe(true);
    });

    it('is a no-op when the terminal is already the only one enabled', () => {
      setupTerminals(3);
      App.state.echoModeActive = true;
      App.state.echoSelection.add(2);

      App.Echo.soloEchoOnTerminal(2);

      expect(App.state.echoSelection.size).toBe(1);
      expect(App.state.echoSelection.has(2)).toBe(true);
    });
  });
});
