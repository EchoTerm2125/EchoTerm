// Integration tests — Context menu actions
import { setupTest, injectTerminal, injectGroup } from '../setup.js';

describe('Integration: Context Menus', () => {
  let App;

  beforeEach(async () => {
    App = await setupTest('terminal', 'tabs', 'groups', 'ui', 'echo', 'menus');

    injectGroup('g1', 'Group 1');
    injectGroup('g2', 'Group 2');
    App.state.activeGroupId = 'g1';

    // Add terminals to g1
    for (let i = 1; i <= 3; i++) {
      injectTerminal(i);
      App.state.terminalGroups.set(i, 'g1');
      App.state.groups.get('g1').terminalIds.add(i);
      App.Tabs.addTab(i, 'powershell');
    }
  });

  describe('showTabContextMenu', () => {
    it('populates Move to Group submenu with other groups', () => {
      App.Menus.showTabContextMenu(
        new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 200 }),
        1
      );

      // Check that the submenu has a button for g2
      const submenu = App.tabCtxGroupSubmenu;
      const buttons = submenu.querySelectorAll('button');
      const g2Button = Array.from(buttons).find((b: any) => b.textContent === 'Group 2');
      expect(g2Button).not.toBeUndefined();
    });

    it('selects the right-clicked tab if not already selected', () => {
      App.Menus.showTabContextMenu(
        new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 200 }),
        1
      );

      expect(App.state.selectedTabs.has(1)).toBe(true);
      expect(App.state.lastClickedTabId).toBe(1);
    });

    it('makes tab context menu visible', () => {
      App.Menus.showTabContextMenu(
        new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 200 }),
        1
      );

      const tabCtx = document.getElementById('tabContextMenu');
      // Menu should be shown (hidden class removed)
      expect(tabCtx.classList.contains('hidden')).toBe(false);
    });

    it('positions menu at mouse coordinates', () => {
      App.Menus.showTabContextMenu(
        new MouseEvent('contextmenu', { bubbles: true, clientX: 150, clientY: 250 }),
        1
      );

      const tabCtx = document.getElementById('tabContextMenu');
      expect(tabCtx.style.left).toBe('150px');
      expect(tabCtx.style.top).toBe('250px');
    });
  });

  describe('showGroupContextMenu', () => {
    it('makes group context menu visible', () => {
      App.Menus.showGroupContextMenu(
        new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 200 }),
        'g1'
      );

      const groupCtx = document.getElementById('groupContextMenu');
      expect(groupCtx.classList.contains('hidden')).toBe(false);
    });

    it('selects the right-clicked group', () => {
      App.Menus.showGroupContextMenu(
        new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 200 }),
        'g1'
      );

      expect(App.state.selectedGroups.has('g1')).toBe(true);
    });
  });

  describe('showConfirm integration', () => {
    it('fires callback immediately when skip is set (close terminal)', () => {
      localStorage.setItem('skipTabCloseConfirm', 'true');
      let closed = false;

      // Simulate what closeTerminal does through confirm
      App.Menus.showConfirm(
        'Close terminal?',
        () => { closed = true; },
        'skipTabCloseConfirm'
      );

      expect(closed).toBe(true);
    });
  });

  describe('context menu viewport clamping', () => {
    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    function setViewport(w: number, h: number) {
      vi.stubGlobal('innerWidth', w);
      vi.stubGlobal('innerHeight', h);
    }

    // jsdom does no layout, so simulate the menu's on-screen geometry
    function mockMenuRect(el: HTMLElement, x: number, y: number, width: number, height: number) {
      vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
        left: x, top: y, width, height, right: x + width, bottom: y + height, x, y,
        toJSON: () => ({}),
      } as DOMRect);
    }

    it('keeps menu at cursor when it fits within the viewport', () => {
      setViewport(800, 600);
      const tabCtx = document.getElementById('tabContextMenu');
      mockMenuRect(tabCtx!, 100, 200, 160, 80);
      App.Menus.showTabContextMenu(
        new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 200 }),
        1
      );

      expect(tabCtx!.style.left).toBe('100px');
      expect(tabCtx!.style.top).toBe('200px');
    });

    it('clamps menu upward when it would overflow the window bottom', () => {
      setViewport(800, 600);
      const tabCtx = document.getElementById('tabContextMenu');
      mockMenuRect(tabCtx!, 100, 550, 160, 80);
      App.Menus.showTabContextMenu(
        new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 550 }),
        1
      );

      expect(tabCtx!.style.top).toBe('512px'); // 600 - 80 - 8 (edge margin)
      expect(tabCtx!.style.left).toBe('100px');
    });

    it('clamps menu left when it would overflow the window right edge', () => {
      setViewport(800, 600);
      const tabCtx = document.getElementById('tabContextMenu');
      mockMenuRect(tabCtx!, 750, 200, 160, 80);
      App.Menus.showTabContextMenu(
        new MouseEvent('contextmenu', { bubbles: true, clientX: 750, clientY: 200 }),
        1
      );

      expect(tabCtx!.style.left).toBe('632px'); // 800 - 160 - 8 (edge margin)
      expect(tabCtx!.style.top).toBe('200px');
    });
  });
});
