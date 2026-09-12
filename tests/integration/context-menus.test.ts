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

  describe('showTabContextMenu — multi-tab actions', () => {
    function buildTabMenu(): HTMLElement {
      const menu = document.getElementById('tabContextMenu') as HTMLElement;
      menu.innerHTML = `
        <button data-action="tab-rename"></button>
        <div class="context-separator"></div>
        <button data-action="tab-close"></button>
        <button data-action="tab-close-selected" id="btnCloseSelected"></button>
        <div class="context-separator"></div>
        <button data-action="tab-close-others"></button>
      `;
      return menu;
    }

    function show(targetId: number) {
      App.Menus.showTabContextMenu(
        new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 200 }),
        targetId
      );
    }

    it('hides single-target items when several tabs are selected', () => {
      const menu = buildTabMenu();
      App.Tabs.toggleTabSelection(1);
      App.Tabs.toggleTabSelection(2);

      show(1);

      for (const action of ['tab-rename', 'tab-close']) {
        const btn = menu.querySelector(`[data-action="${action}"]`) as HTMLElement;
        expect(btn.classList.contains('hidden')).toBe(true);
      }
      const closeOthers = menu.querySelector('[data-action="tab-close-others"]') as HTMLElement;
      expect(closeOthers.classList.contains('hidden')).toBe(false);
      expect(closeOthers.textContent).toBe('Close Others (1)');
      const closeSelected = menu.querySelector('[data-action="tab-close-selected"]') as HTMLElement;
      expect(closeSelected.classList.contains('hidden')).toBe(false);
      expect(closeSelected.textContent).toBe('Close Selected (2)');
    });

    it('shows single-target items for a single selection', () => {
      const menu = buildTabMenu();

      show(1);

      for (const action of ['tab-rename', 'tab-close']) {
        const btn = menu.querySelector(`[data-action="${action}"]`) as HTMLElement;
        expect(btn.classList.contains('hidden')).toBe(false);
      }
      const closeOthers = menu.querySelector('[data-action="tab-close-others"]') as HTMLElement;
      expect(closeOthers.classList.contains('hidden')).toBe(false);
      expect(closeOthers.textContent).toBe('Close Others (2)');
      const closeSelected = menu.querySelector('[data-action="tab-close-selected"]') as HTMLElement;
      expect(closeSelected.classList.contains('hidden')).toBe(true);
    });

    it('hides Close Others when every tab is selected', () => {
      const menu = buildTabMenu();
      App.Tabs.selectTabRange(1, 3);

      show(1);

      const closeOthers = menu.querySelector('[data-action="tab-close-others"]') as HTMLElement;
      expect(closeOthers.classList.contains('hidden')).toBe(true);
    });

    it('restores single-target items after a multi-selection', () => {
      const menu = buildTabMenu();
      App.Tabs.toggleTabSelection(1);
      App.Tabs.toggleTabSelection(2);
      show(1);

      App.Tabs.clearTabSelection();
      show(2);

      const rename = menu.querySelector('[data-action="tab-rename"]') as HTMLElement;
      expect(rename.classList.contains('hidden')).toBe(false);
    });

    it('closes every tab outside the selection when Close Others is clicked', () => {
      injectTerminal(4);
      App.state.terminalGroups.set(4, 'g1');
      App.state.groups.get('g1').terminalIds.add(4);
      App.Tabs.addTab(4, 'powershell');

      const menu = buildTabMenu();
      App.Menus.setupContextMenu();
      const closeSpy = vi.spyOn(App.Terminal, 'closeTerminal').mockImplementation(() => {});
      localStorage.setItem('skipTabCloseConfirm', 'true');
      App.Tabs.toggleTabSelection(2);
      App.Tabs.toggleTabSelection(3);

      show(2);
      (menu.querySelector('[data-action="tab-close-others"]') as HTMLElement).click();

      const closed = closeSpy.mock.calls.map((call: any[]) => call[0]).sort();
      expect(closed).toEqual([1, 4]);
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

  describe('showGroupContextMenu — multi-group actions', () => {
    function buildMenuButtons(): HTMLElement {
      const menu = document.getElementById('groupContextMenu') as HTMLElement;
      menu.innerHTML = `
        <button data-action="group-rename"></button>
        <button data-action="group-delete"></button>
        <button data-action="group-close-selected"></button>
        <button data-action="group-close-others"></button>
        <div class="context-separator"></div>
        <button data-action="group-close-terminals"></button>
      `;
      return menu;
    }

    function show(targetId: string) {
      App.Menus.showGroupContextMenu(
        new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 200 }),
        targetId
      );
    }

    it('hides Close Selected for a single selection', () => {
      const menu = buildMenuButtons();

      show('g1');

      const btn = menu.querySelector('[data-action="group-close-selected"]') as HTMLElement;
      expect(btn.classList.contains('hidden')).toBe(true);
    });

    it('shows Close Selected with a count when several groups are selected', () => {
      const menu = buildMenuButtons();
      App.Groups.toggleGroupSelection('g1');
      App.Groups.toggleGroupSelection('g2');

      show('g1');

      const btn = menu.querySelector('[data-action="group-close-selected"]') as HTMLElement;
      expect(btn.classList.contains('hidden')).toBe(false);
      expect(btn.textContent).toBe('Close Selected (2)');
    });

    it('hides Close Others when every group is selected', () => {
      const menu = buildMenuButtons();
      const btn = menu.querySelector('[data-action="group-close-others"]') as HTMLElement;

      show('g1');
      expect(btn.textContent).toBe('Close Others (1)');

      App.Groups.toggleGroupSelection('g2');
      show('g1');
      expect(btn.classList.contains('hidden')).toBe(true);
    });

    it('hides single-target items and their separator when several groups are selected', () => {
      const menu = buildMenuButtons();
      App.Groups.toggleGroupSelection('g1');
      App.Groups.toggleGroupSelection('g2');

      show('g1');

      for (const action of ['group-rename', 'group-delete', 'group-close-terminals']) {
        const btn = menu.querySelector(`[data-action="${action}"]`) as HTMLElement;
        expect(btn.classList.contains('hidden')).toBe(true);
      }
      const separator = menu.querySelector('.context-separator') as HTMLElement;
      expect(separator.classList.contains('hidden')).toBe(true);
    });

    it('shows single-target items for a single selection', () => {
      const menu = buildMenuButtons();

      show('g1');

      for (const action of ['group-rename', 'group-delete']) {
        const btn = menu.querySelector(`[data-action="${action}"]`) as HTMLElement;
        expect(btn.classList.contains('hidden')).toBe(false);
      }
      const closeTerminals = menu.querySelector('[data-action="group-close-terminals"]') as HTMLElement;
      expect(closeTerminals.classList.contains('hidden')).toBe(false);
      expect(closeTerminals.textContent).toBe('Close All Terminals (3)');
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
