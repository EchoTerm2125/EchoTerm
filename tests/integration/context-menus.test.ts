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

    it('builds the submenu as a Filter box over a scrollable option list', () => {
      App.Menus.showTabContextMenu(
        new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 200 }),
        1
      );

      const submenu = App.tabCtxGroupSubmenu;
      expect(submenu.querySelector('.context-submenu-filter')).not.toBeNull();
      const list = submenu.querySelector('.context-submenu-options');
      expect(list).not.toBeNull();
      // Options live in the capped, scrolling list — not loose in the flyout.
      expect(list.querySelectorAll('button').length).toBe(1);
    });

    it('narrows the option list as the Filter box is typed into', () => {
      App.Menus.showTabContextMenu(
        new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 200 }),
        1
      );

      const submenu = App.tabCtxGroupSubmenu;
      const filter = submenu.querySelector('.context-submenu-filter') as HTMLInputElement;
      filter.value = 'zzz';
      filter.dispatchEvent(new Event('input'));

      const visible = [...submenu.querySelectorAll('.context-submenu-options button')]
        .filter((b: any) => !b.classList.contains('hidden'));
      expect(visible.length).toBe(0);
      expect((submenu.querySelector('.context-submenu-empty') as HTMLElement).classList.contains('hidden')).toBe(false);
    });

    it('never draws two dividers back to back when items between them are hidden', () => {
      const menu = document.getElementById('tabContextMenu') as HTMLElement;
      menu.innerHTML = `
        <button data-action="tab-rename"></button>
        <div class="context-separator"></div>
        <button data-action="tab-reconnect"></button>
        <div class="context-separator"></div>
        <button data-action="tab-close"></button>
        <button data-action="tab-close-selected"></button>
        <div class="context-separator"></div>
        <button data-action="tab-close-others"></button>
        <div class="context-separator" id="tabCtxMoveSep"></div>
        <div class="context-submenu-trigger" id="tabCtxMoveItem"></div>
      `;
      // A single tab hides Reconnect, Close Selected and Close Others, leaving
      // separators with nothing between them.
      App.state.groups.get('g1').terminalIds = new Set([1]);

      App.Menus.showTabContextMenu(new MouseEvent('contextmenu', { bubbles: true }), 1);

      let previousVisibleWasSeparator = false;
      for (const el of [...menu.children]) {
        if (el.classList.contains('hidden')) continue;
        const isSeparator = el.classList.contains('context-separator');
        if (isSeparator) expect(previousVisibleWasSeparator).toBe(false);
        previousVisibleWasSeparator = isSeparator;
      }
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

  describe('context menu — Select All', () => {
    function buildMenu(): HTMLElement {
      const menu = document.getElementById('contextMenu') as HTMLElement;
      menu.innerHTML = `<button data-action="select-all" data-i18n="ctxSelectAll"></button>`;
      App.Menus.setupContextMenu();
      return menu;
    }

    function open(paneEl: HTMLElement, id: number) {
      App.Menus.bindContextMenu(paneEl, id);
      paneEl.querySelector('.xterm-container').dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, clientX: 10, clientY: 10 })
      );
    }

    it('selects the whole pane buffer and leaves the terminal focused', () => {
      const menu = buildMenu();
      const entry = App.state.terminals.get(1);
      const selectAll = vi.spyOn(entry.term, 'selectAll');
      const focus = vi.spyOn(entry.term, 'focus');

      open(entry.paneEl, 1);
      (menu.querySelector('[data-action="select-all"]') as HTMLElement).click();

      expect(selectAll).toHaveBeenCalled();
      expect(focus).toHaveBeenCalled();
    });
  });

  describe('context menu — Copy', () => {
    function buildMenu(): HTMLElement {
      const menu = document.getElementById('contextMenu') as HTMLElement;
      menu.innerHTML = `<button data-action="copy"></button>`;
      App.Menus.setupContextMenu();
      return menu;
    }

    it('drops the trailing blank rows a Select All copy would otherwise include', () => {
      const menu = buildMenu();
      const entry = App.state.terminals.get(1);
      // What xterm's selectAll() + getSelection() yields: the content followed
      // by every empty row below it, all the way to the bottom of the buffer.
      vi.spyOn(entry.term, 'getSelection').mockReturnValue('prompt\n$ \n\n\n   \n');

      App.Menus.bindContextMenu(entry.paneEl, 1);
      entry.paneEl.querySelector('.xterm-container').dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, clientX: 10, clientY: 10 })
      );
      (menu.querySelector('[data-action="copy"]') as HTMLElement).click();

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('prompt\n$');
    });
  });

  describe('context menu — Shortcut hints', () => {
    function hint(menu: HTMLElement, action: string): HTMLElement {
      return menu.querySelector(`[data-action="${action}"] .context-shortcut`) as HTMLElement;
    }

    function buildPaneMenu(): HTMLElement {
      const menu = document.getElementById('contextMenu') as HTMLElement;
      menu.innerHTML = `
        <button data-action="select-all"><span class="menu-item-label">Select All</span><span class="context-shortcut" data-scope="target">Ctrl+Shift+A</span></button>
        <button data-action="echo"><span class="menu-item-label">Toggle Echo</span><span class="context-shortcut">Ctrl+Shift+T</span></button>
        <button data-action="close"><span class="menu-item-label">Close Pane</span><span class="context-shortcut" data-scope="target">Ctrl+W</span></button>
      `;
      return menu;
    }

    function openPaneMenu(paneEl: HTMLElement, id: number) {
      App.Menus.bindContextMenu(paneEl, id);
      paneEl.querySelector('.xterm-container').dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, clientX: 10, clientY: 10 })
      );
    }

    it('shows every hint on the Active pane', () => {
      const menu = buildPaneMenu();
      const entry = App.state.terminals.get(1);
      App.state.activeTerminalId = 1;

      openPaneMenu(entry.paneEl, 1);

      expect(hint(menu, 'select-all').classList.contains('hidden')).toBe(false);
      expect(hint(menu, 'echo').classList.contains('hidden')).toBe(false);
      expect(hint(menu, 'close').classList.contains('hidden')).toBe(false);
    });

    it('hides target-scoped hints on a pane that is not Active', () => {
      const menu = buildPaneMenu();
      const entry = App.state.terminals.get(2);
      App.state.activeTerminalId = 1;

      openPaneMenu(entry.paneEl, 2);

      expect(hint(menu, 'select-all').classList.contains('hidden')).toBe(true);
      expect(hint(menu, 'close').classList.contains('hidden')).toBe(true);
      // Toggle Echo is app-wide, so its hint never depends on the target.
      expect(hint(menu, 'echo').classList.contains('hidden')).toBe(false);
    });

    it('shows Ctrl+W on Close Tab only when that tab is Active', () => {
      const menu = document.getElementById('tabContextMenu') as HTMLElement;
      menu.innerHTML = `
        <button data-action="tab-rename"><span class="menu-item-label">Rename Tab</span></button>
        <button data-action="tab-close"><span class="menu-item-label">Close Tab</span><span class="context-shortcut" data-scope="target">Ctrl+W</span></button>
      `;
      App.state.activeTerminalId = 1;

      App.Menus.showTabContextMenu(new MouseEvent('contextmenu', { bubbles: true }), 1);
      expect(hint(menu, 'tab-close').classList.contains('hidden')).toBe(false);

      App.Menus.showTabContextMenu(new MouseEvent('contextmenu', { bubbles: true }), 2);
      expect(hint(menu, 'tab-close').classList.contains('hidden')).toBe(true);
    });
  });

  describe('context menus — closing an open menu', () => {
    function openPaneMenu(id: number) {
      const entry = App.state.terminals.get(id);
      App.Menus.bindContextMenu(entry.paneEl, id);
      entry.paneEl.querySelector('.xterm-container').dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, clientX: 10, clientY: 10 })
      );
    }

    it('closes the Pane menu when a Tab is right-clicked', () => {
      App.Menus.setupContextMenu();
      const paneMenu = document.getElementById('contextMenu') as HTMLElement;
      const tabMenu = document.getElementById('tabContextMenu') as HTMLElement;

      openPaneMenu(1);
      expect(paneMenu.classList.contains('hidden')).toBe(false);

      const tabEl = App.Tabs.getTabCache().get(1) as HTMLElement;
      tabEl.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 20, clientY: 20 }));

      expect(paneMenu.classList.contains('hidden')).toBe(true);
      expect(tabMenu.classList.contains('hidden')).toBe(false);
    });

    it('closes every context menu — SSH included — on an outside right-click', () => {
      App.Menus.setupContextMenu();
      const groupMenu = document.getElementById('groupContextMenu') as HTMLElement;
      const sshMenu = document.getElementById('sshContextMenu') as HTMLElement;
      groupMenu.classList.remove('hidden');
      sshMenu.classList.remove('hidden');

      document.getElementById('tabList').dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, clientX: 30, clientY: 30 })
      );

      expect(groupMenu.classList.contains('hidden')).toBe(true);
      expect(sshMenu.classList.contains('hidden')).toBe(true);
    });

    it('closes the open menu when the click target stops propagation', () => {
      App.Menus.setupContextMenu();
      const paneMenu = document.getElementById('contextMenu') as HTMLElement;
      openPaneMenu(1);
      expect(paneMenu.classList.contains('hidden')).toBe(false);

      // Mirrors the SSH section "+" buttons, whose click handler stops the
      // event from ever reaching the document.
      const btn = document.createElement('button');
      btn.className = 'ssh-section-add-btn';
      btn.addEventListener('click', (e) => e.stopPropagation());
      document.body.appendChild(btn);

      btn.click();

      expect(paneMenu.classList.contains('hidden')).toBe(true);
      btn.remove();
    });

    it('closes the shell-type dropdown on an outside right-click', () => {
      App.UI.bindToolbar();
      App.newTermDropdown.classList.remove('hidden');

      document.getElementById('tabList').dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, clientX: 30, clientY: 30 })
      );

      expect(App.newTermDropdown.classList.contains('hidden')).toBe(true);
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
