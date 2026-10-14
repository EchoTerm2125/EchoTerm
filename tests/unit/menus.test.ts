// Unit tests for menus.js — context menus, confirm dialog
import { resetTestEnv, loadModules, getApp } from '../setup.js';

// Helper to get confirm dialog elements directly from DOM
function getConfirmElements() {
  return {
    dialog: document.getElementById('confirmDialog'),
    message: document.getElementById('confirmMessage'),
    ok: document.getElementById('confirmOk'),
    cancel: document.getElementById('confirmCancel'),
    dontShow: document.getElementById('confirmDontShowAgain'),
  };
}

describe('Menus (menus.js)', () => {
  beforeEach(async () => {
    await resetTestEnv();
    // menus.js needs Tabs reference
    await loadModules('terminal', 'tabs', 'groups', 'menus');
  });

  describe('showConfirm', () => {
    it('calls callback immediately when localStorage skip key is set', () => {
      localStorage.setItem('skipTestConfirm', 'true');
      let called = false;
      getApp().Menus.showConfirm('Are you sure?', () => { called = true; }, 'skipTestConfirm');
      expect(called).toBe(true);
    });

    it('shows dialog when skip key is not set', () => {
      let called = false;
      getApp().Menus.showConfirm('Are you sure?', () => { called = true; }, 'skipTestConfirm');
      expect(called).toBe(false);
      const { dialog, message } = getConfirmElements();
      expect(dialog).not.toBeNull();
      expect(dialog.classList.contains('hidden')).toBe(false);
      expect(message.textContent).toBe('Are you sure?');
    });

    it('closes dialog and calls callback when OK is clicked', () => {
      let called = false;
      getApp().Menus.showConfirm('Proceed?', () => { called = true; }, 'skipTestConfirm');
      const { dialog, ok } = getConfirmElements();
      ok.click();
      expect(called).toBe(true);
      expect(dialog.classList.contains('hidden')).toBe(true);
    });

    it('closes dialog without calling callback when Cancel is clicked', () => {
      let called = false;
      getApp().Menus.showConfirm('Proceed?', () => { called = true; }, 'skipTestConfirm');
      const { dialog, cancel } = getConfirmElements();
      cancel.click();
      expect(called).toBe(false);
      expect(dialog.classList.contains('hidden')).toBe(true);
    });

    it('sets localStorage when "dont show again" is checked and OK clicked', () => {
      let called = false;
      const App = getApp();
      App.Menus.showConfirm('Msg', () => { called = true; }, 'skipTestKey');
      // showConfirm resets checkbox to false, so set it AFTER calling showConfirm
      const { dontShow, ok } = getConfirmElements();
      dontShow.checked = true;
      ok.click();
      expect(called).toBe(true);
      expect(localStorage.getItem('skipTestKey')).toBe('true');
    });

    it('shows the Delete label on the OK button when okLabelKey is provided', () => {
      const App = getApp();
      App.Menus.showConfirm('Delete this?', () => {}, 'skipTestKey', 'confirmDelete');
      const { ok } = getConfirmElements();
      expect(ok.textContent).toBe(App.__('confirmDelete'));
    });

    it('shows the default Close label on the OK button when no okLabelKey is given', () => {
      const App = getApp();
      App.Menus.showConfirm('Close this?', () => {}, 'skipTestKey');
      const { ok } = getConfirmElements();
      expect(ok.textContent).toBe(App.__('confirmClose'));
    });

    it('resets the OK label back to Close after a Delete-labelled confirm', () => {
      const App = getApp();
      App.Menus.showConfirm('Delete this?', () => {}, 'skipTestKey', 'confirmDelete');
      App.Menus.showConfirm('Close this?', () => {}, 'skipTestKey');
      const { ok } = getConfirmElements();
      expect(ok.textContent).toBe(App.__('confirmClose'));
    });
  });

  describe('context menus', () => {
    it('setupContextMenu registers without errors', () => {
      const App = getApp();
      expect(() => App.Menus.setupContextMenu()).not.toThrow();
    });

    it('context menu elements exist in the DOM', () => {
      const ctxMenu = document.getElementById('contextMenu');
      const tabCtx = document.getElementById('tabContextMenu');
      const groupCtx = document.getElementById('groupContextMenu');
      expect(ctxMenu).not.toBeNull();
      expect(tabCtx).not.toBeNull();
      expect(groupCtx).not.toBeNull();
    });

    it('closeAllMenus hides all menus (via document click)', () => {
      const App = getApp();
      App.Menus.setupContextMenu();

      const ctxMenu = document.getElementById('contextMenu');
      const tabCtx = document.getElementById('tabContextMenu');
      ctxMenu.classList.remove('hidden');
      tabCtx.classList.remove('hidden');

      // Dispatch a click on the document itself (not body) to trigger the listener
      document.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(ctxMenu.classList.contains('hidden')).toBe(true);
      expect(tabCtx.classList.contains('hidden')).toBe(true);
    });
  });

  describe('context submenu filter', () => {
    function buildSub() {
      const App = getApp();
      const submenu = document.createElement('div');
      submenu.className = 'context-submenu';
      document.body.appendChild(submenu);
      const clicked: string[] = [];
      App.Menus.buildSubmenu(submenu, [
        { label: 'Alpha', onClick: () => clicked.push('Alpha') },
        { label: 'beta', onClick: () => clicked.push('beta') },
        { label: 'Alpine', onClick: () => clicked.push('Alpine') },
      ]);
      return { App, submenu, clicked };
    }

    function options(submenu: HTMLElement) {
      return [...submenu.querySelectorAll('.context-submenu-options button')];
    }

    afterEach(() => {
      document.body.innerHTML = '';
    });

    it('builds a Filter box, an option list and hidden empty text', () => {
      const { submenu } = buildSub();
      expect(submenu.querySelector('.context-submenu-filter')).not.toBeNull();
      expect(options(submenu).length).toBe(3);
      const empty = submenu.querySelector('.context-submenu-empty') as HTMLElement;
      expect(empty.classList.contains('hidden')).toBe(true);
    });

    it('filters options case-insensitively on substring', () => {
      const { submenu } = buildSub();
      const filter = submenu.querySelector('.context-submenu-filter') as HTMLInputElement;

      filter.value = 'AL';
      filter.dispatchEvent(new Event('input'));

      const visible = options(submenu).filter((b) => !b.classList.contains('hidden'));
      expect(visible.map((b) => b.textContent)).toEqual(['Alpha', 'Alpine']);
      expect((submenu.querySelector('.context-submenu-empty') as HTMLElement).classList.contains('hidden')).toBe(true);
    });

    it('shows the empty text when nothing matches', () => {
      const { submenu } = buildSub();
      const filter = submenu.querySelector('.context-submenu-filter') as HTMLInputElement;

      filter.value = 'zzz';
      filter.dispatchEvent(new Event('input'));

      expect(options(submenu).every((b) => b.classList.contains('hidden'))).toBe(true);
      expect((submenu.querySelector('.context-submenu-empty') as HTMLElement).classList.contains('hidden')).toBe(false);
    });

    it('Enter activates the highlighted option, else the first visible one', () => {
      const { submenu, clicked } = buildSub();
      const filter = submenu.querySelector('.context-submenu-filter') as HTMLInputElement;

      filter.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      filter.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      filter.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(clicked).toEqual(['beta']);

      // No highlight (e.g. after re-filtering) → Enter takes the first visible.
      clicked.length = 0;
      filter.dispatchEvent(new Event('input'));
      filter.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(clicked).toEqual(['Alpha']);
    });

    it('Escape clears the filter first, then closes the menu', () => {
      const { submenu } = buildSub();
      const filter = submenu.querySelector('.context-submenu-filter') as HTMLInputElement;

      filter.value = 'zzz';
      filter.dispatchEvent(new Event('input'));
      filter.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(filter.value).toBe('');
      expect(options(submenu).every((b) => !b.classList.contains('hidden'))).toBe(true);
      expect(submenu.classList.contains('hidden')).toBe(false);

      filter.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(submenu.classList.contains('hidden')).toBe(true);
    });

    it('closeSubmenu clears stale filter text on close', () => {
      const { App, submenu } = buildSub();
      const filter = submenu.querySelector('.context-submenu-filter') as HTMLInputElement;

      filter.value = 'al';
      filter.dispatchEvent(new Event('input'));
      App.Menus.closeSubmenu(submenu);

      expect(submenu.classList.contains('hidden')).toBe(true);
      expect(filter.value).toBe('');
      expect(options(submenu).every((b) => !b.classList.contains('hidden'))).toBe(true);
    });

    it('openSubmenu focuses the Filter box', () => {
      const { App, submenu } = buildSub();
      App.Menus.openSubmenu(submenu);
      expect(document.activeElement).toBe(submenu.querySelector('.context-submenu-filter'));
    });
  });

  describe('positionSubmenu', () => {
    function makeSubmenu() {
      const trigger = document.createElement('div');
      const submenu = document.createElement('div');
      submenu.className = 'context-submenu';
      trigger.appendChild(submenu);
      document.body.appendChild(trigger);
      return { trigger, submenu };
    }

    function mockRect(el, rect) {
      vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(rect as DOMRect);
    }

    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    it('opens the flyout to the left when it would overflow the right edge', () => {
      const App = getApp();
      const { trigger, submenu } = makeSubmenu();
      vi.stubGlobal('innerWidth', 800);
      vi.stubGlobal('innerHeight', 600);
      mockRect(trigger, { left: 700, top: 100, right: 750, width: 50, height: 30, bottom: 130, x: 700, y: 100, toJSON: () => ({}) });
      mockRect(submenu, { left: 752, top: 96, right: 952, width: 200, height: 100, bottom: 196, x: 752, y: 96, toJSON: () => ({}) });

      App.Menus.positionSubmenu(submenu);

      // right edge would be 952 > 792 (800 - 8) → flip left, clamped to 8px margin
      expect(submenu.style.left).toBe('-202px');
    });

    it('keeps the flyout on the right when there is room', () => {
      const App = getApp();
      const { trigger, submenu } = makeSubmenu();
      vi.stubGlobal('innerWidth', 800);
      vi.stubGlobal('innerHeight', 600);
      mockRect(trigger, { left: 100, top: 100, right: 150, width: 50, height: 30, bottom: 130, x: 100, y: 100, toJSON: () => ({}) });
      mockRect(submenu, { left: 152, top: 96, right: 352, width: 200, height: 100, bottom: 196, x: 152, y: 96, toJSON: () => ({}) });

      App.Menus.positionSubmenu(submenu);

      expect(submenu.style.left).toBe('');
      expect(submenu.style.top).toBe('');
    });

    it('shifts the flyout up when it would overflow the bottom edge', () => {
      const App = getApp();
      const { trigger, submenu } = makeSubmenu();
      vi.stubGlobal('innerWidth', 800);
      vi.stubGlobal('innerHeight', 600);
      mockRect(trigger, { left: 100, top: 550, right: 150, width: 50, height: 30, bottom: 580, x: 100, y: 550, toJSON: () => ({}) });
      mockRect(submenu, { left: 152, top: 546, right: 352, width: 200, height: 100, bottom: 646, x: 152, y: 546, toJSON: () => ({}) });

      App.Menus.positionSubmenu(submenu);

      // bottom would be 550 - 4 + 100 = 646 > 592 (600 - 8) → shift up by 54px
      expect(submenu.style.top).toBe('-58px');
      expect(submenu.style.left).toBe('');
    });

    it('does nothing when the flyout is hidden', () => {
      const App = getApp();
      const { submenu } = makeSubmenu();
      submenu.classList.add('hidden');

      App.Menus.positionSubmenu(submenu);

      expect(submenu.style.left).toBe('');
      expect(submenu.style.top).toBe('');
    });
  });

  describe('submenu hover pinning', () => {
    const HOVER_DELAY = 200; // the 150ms hide timer plus slack

    function bind() {
      const App = getApp();
      const trigger = document.createElement('div');
      trigger.className = 'context-submenu-trigger';
      const submenu = document.createElement('div');
      submenu.className = 'context-submenu hidden';
      trigger.appendChild(submenu);
      document.body.appendChild(trigger);
      App.Menus.buildSubmenu(submenu, [
        { label: 'Alpha', onClick: () => {} },
        { label: 'beta', onClick: () => {} },
      ]);
      App.Menus.bindSubmenuHover(trigger, submenu);
      return { trigger, submenu };
    }

    const filterOf = (submenu: HTMLElement) =>
      submenu.querySelector('.context-submenu-filter') as HTMLInputElement;

    it('hover-opened flyout closes when the mouse leaves, despite Filter focus', async () => {
      const { trigger, submenu } = bind();

      trigger.dispatchEvent(new MouseEvent('mouseenter'));
      expect(submenu.classList.contains('hidden')).toBe(false);
      // openSubmenu focuses the Filter box…
      expect(document.activeElement).toBe(filterOf(submenu));

      trigger.dispatchEvent(new MouseEvent('mouseleave'));
      await new Promise((r) => setTimeout(r, HOVER_DELAY));

      // …but hover-close must still work: no other menu item is hovered.
      expect(submenu.classList.contains('hidden')).toBe(true);
    });

    it('typing into the Filter box pins the flyout open against hover-close', async () => {
      const { trigger, submenu } = bind();

      trigger.dispatchEvent(new MouseEvent('mouseenter'));
      filterOf(submenu).value = 'al';
      filterOf(submenu).dispatchEvent(new Event('input'));

      trigger.dispatchEvent(new MouseEvent('mouseleave'));
      await new Promise((r) => setTimeout(r, HOVER_DELAY));

      expect(submenu.classList.contains('hidden')).toBe(false);
    });

    it('a later hover-open is hover-dismissable again after a typing pin', async () => {
      const App = getApp();
      const { trigger, submenu } = bind();

      // Pin via typing, then close through the real path (which clears the pin).
      trigger.dispatchEvent(new MouseEvent('mouseenter'));
      filterOf(submenu).dispatchEvent(new Event('input'));
      App.Menus.closeSubmenu(submenu);
      expect(submenu.classList.contains('hidden')).toBe(true);

      // Re-open by hovering only: no typing, so it must close on hover-out.
      trigger.dispatchEvent(new MouseEvent('mouseenter'));
      trigger.dispatchEvent(new MouseEvent('mouseleave'));
      await new Promise((r) => setTimeout(r, HOVER_DELAY));

      expect(submenu.classList.contains('hidden')).toBe(true);
    });
  });
});
