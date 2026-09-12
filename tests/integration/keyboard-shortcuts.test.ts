// Integration tests — Keyboard shortcuts
import { setupTest, injectTerminal, injectGroup } from '../setup.js';

describe('Integration: Keyboard Shortcuts', () => {
  let App;

  beforeEach(async () => {
    App = await setupTest('terminal', 'tabs', 'groups', 'ui', 'echo', 'menus', 'search');

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

  describe('Ctrl+N → New Tab', () => {
    it('triggers spawnTerminal', () => {
      const spy = vi.spyOn(App.Terminal, 'spawnTerminal');

      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'n',
        code: 'KeyN',
        ctrlKey: true,
        bubbles: true,
      }));

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('Ctrl+Shift+N → New Group', () => {
    it('creates a new group', () => {
      const spy = vi.spyOn(App.Groups, 'createGroup');

      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'N',
        code: 'KeyN',
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
        code: 'KeyT',
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
        code: 'KeyW',
        ctrlKey: true,
        bubbles: true,
      }));

      expect(spy).toHaveBeenCalled();
      // First argument should mention closing terminal
      expect(spy.mock.calls[0][0]).toContain('Close');
    });
  });

  describe('Ctrl+F → Find bar', () => {
    it('opens the find bar for the active terminal', () => {
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'f',
        code: 'KeyF',
        ctrlKey: true,
        bubbles: true,
      }));

      expect(document.getElementById('findBar').classList.contains('hidden')).toBe(false);
    });

    it('closes it again on a second press', () => {
      const press = () => document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'f',
        code: 'KeyF',
        ctrlKey: true,
        bubbles: true,
      }));

      press();
      press();

      expect(document.getElementById('findBar').classList.contains('hidden')).toBe(true);
    });
  });

  describe('Ctrl+Shift+F → Search panel', () => {
    it('opens the search panel window', () => {
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'F',
        code: 'KeyF',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      }));

      expect(window.api.panelOpen).toHaveBeenCalled();
      // The panel window needs the current theme + labels before it opens.
      expect(window.api.panelPushTheme).toHaveBeenCalled();
    });

    it('does not open the find bar', () => {
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'F',
        code: 'KeyF',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      }));

      expect(document.getElementById('findBar').classList.contains('hidden')).toBe(true);
    });
  });
});
