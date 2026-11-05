// Unit tests for the shortcut registry — one definition list behind bindings,
// the Keyboard Shortcuts tab, context-menu hints, and toolbar tooltips.
import { setupTest } from '../setup.js';

describe('Shortcut registry', () => {
  let App;
  beforeEach(async () => {
    App = await setupTest('shortcuts');
  });

  it('every definition has a label key and a unique combo', () => {
    const seen = new Set();
    for (const def of App.Shortcuts.DEFS) {
      expect(def.labelKey, def.id).toBeTruthy();
      expect(App.__(def.labelKey), def.id).not.toBe(def.labelKey);
      const combo = App.Shortcuts.format(def);
      expect(seen.has(combo), `duplicate combo ${combo}`).toBe(false);
      seen.add(combo);
    }
  });

  it('formats combos as Ctrl+Shift+Key', () => {
    const byId = Object.fromEntries(App.Shortcuts.DEFS.map((d) => [d.id, d]));
    expect(App.Shortcuts.format(byId.newTerminal)).toBe('Ctrl+N');
    expect(App.Shortcuts.format(byId.newGroup)).toBe('Ctrl+Shift+N');
    expect(App.Shortcuts.format(byId.nextTerminal)).toBe('Ctrl+Tab');
    expect(App.Shortcuts.format(byId.toggleSidebar)).toBe('Ctrl+Shift+S');
  });

  it('renders one table row per definition', () => {
    const container = document.createElement('div');
    App.Shortcuts.renderTable(container);
    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(App.Shortcuts.DEFS.length);
    expect(container.querySelectorAll('kbd').length).toBeGreaterThan(0);
  });

  it('hydrates context-menu hints and toolbar tooltips from the definitions', () => {
    const hint = document.createElement('span');
    hint.className = 'context-shortcut';
    hint.dataset.shortcutId = 'closeTerminal';
    const btn = document.createElement('button');
    btn.dataset.shortcutTitle = 'newTerminal';
    document.body.append(hint, btn);

    App.Shortcuts.hydrate();

    expect(hint.textContent).toBe('Ctrl+W');
    expect(btn.getAttribute('title')).toBe('New terminal (Ctrl+N)');
  });
});
