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
});
