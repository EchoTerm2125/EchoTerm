// Integration tests — Keyboard shortcuts
import { setupTest, injectTerminal, injectGroup } from '../setup.js';

describe('Integration: Keyboard Shortcuts', () => {
  let App;

  beforeEach(async () => {
    App = await setupTest('terminal', 'tabs', 'groups', 'ui', 'echo', 'menus');

    injectGroup('g1', 'Group 1');
    App.state.activeGroupId = 'g1';

    // Add 3 terminals
    for (let i = 1; i <= 3; i++) {
      injectTerminal(i);
      App.state.terminalGroups.set(i, 'g1');
      App.state.groups.get('g1').terminalIds.add(i);
      App.Tabs.addTab(i, 'powershell');
    }
    App.state.activeTerminalId = 1;

    // Bind keyboard shortcuts (normally done in app.js init)
    App.UI.bindKeyboardShortcuts();
  });

  describe('Ctrl+Shift+N → New Terminal', () => {
    it('triggers spawnTerminal', () => {
      const spy = vi.spyOn(App.Terminal, 'spawnTerminal');

      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'N',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      }));

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('Ctrl+Shift+T → Toggle Echo', () => {
    it('triggers toggleEchoMode', () => {
      const spy = vi.spyOn(App.Echo, 'toggleEchoMode');

      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'T',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      }));

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('Ctrl+Tab → Cycle Terminal', () => {
    it('cycles forward', () => {
      const spy = vi.spyOn(App.Terminal, 'cycleTerminal');

      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Tab',
        ctrlKey: true,
        bubbles: true,
      }));

      expect(spy).toHaveBeenCalledWith(1); // forward
    });

    it('cycles backward with Shift', () => {
      const spy = vi.spyOn(App.Terminal, 'cycleTerminal');

      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Tab',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      }));

      expect(spy).toHaveBeenCalledWith(-1); // backward
    });
  });

  describe('Ctrl+W → Close Terminal', () => {
    it('opens confirm dialog for active terminal', () => {
      const spy = vi.spyOn(App.Menus, 'showConfirm');

      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'w',
        ctrlKey: true,
        bubbles: true,
      }));

      expect(spy).toHaveBeenCalled();
      // First argument should mention closing terminal
      expect(spy.mock.calls[0][0]).toContain('Close');
    });
  });
});
