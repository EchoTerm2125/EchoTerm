/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — App-wide shortcuts: one definition list behind every surface.

   DEFS is the single source of truth. It drives the keydown bindings, the
   Keyboard Shortcuts tab, the Context menu Shortcut hints, and the toolbar
   tooltips. Adding a shortcut here makes it real everywhere at once.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  interface ShortcutDef {
    id: string;
    /** Matched against KeyboardEvent.code (letters) or .key (Tab). */
    code?: string;
    key?: string;
    shift?: boolean;
    labelKey: string;
    /** Extra condition for a shortcut that does not reach every focus. */
    when?: () => boolean;
    run: () => void;
  }

  const DEFS: ShortcutDef[] = [
    {
      id: 'newTerminal',
      code: 'KeyN',
      labelKey: 'optionsShortcutNewTerminal',
      run: () => App.Terminal.spawnTerminal(App.state.selectedShell),
    },
    {
      id: 'newGroup',
      code: 'KeyN',
      shift: true,
      labelKey: 'optionsShortcutNewGroup',
      run: () => {
        const count = App.state.groups.size + 1;
        const group = App.Groups.createGroup(App.__('groupDefaultName', { n: count }));
        App.Groups.switchGroup(group.id);
        App.Terminal.spawnTerminal(App.state.selectedShell);
      },
    },
    {
      id: 'toggleEcho',
      code: 'KeyT',
      shift: true,
      labelKey: 'ctxToggleEcho',
      run: () => App.Echo.toggleEchoMode(),
    },
    {
      id: 'closeTerminal',
      code: 'KeyW',
      labelKey: 'optionsShortcutCloseTerminal',
      run: () => {
        const id = App.state.activeTerminalId;
        if (!id) return;
        App.Menus.showConfirm(
          App.__('confirmCloseTerminal'),
          () => App.Terminal.closeTerminal(id),
          'skipTabCloseConfirm',
        );
      },
    },
    {
      id: 'find',
      code: 'KeyF',
      labelKey: 'optionsShortcutFind',
      run: () => App.Search.handleShortcut(false),
    },
    {
      id: 'searchAll',
      code: 'KeyF',
      shift: true,
      labelKey: 'optionsShortcutSearchAll',
      run: () => App.Search.handleShortcut(true),
    },
    {
      id: 'selectAll',
      code: 'KeyA',
      shift: true,
      labelKey: 'optionsShortcutSelectAll',
      // Select All targets the Active pane, and only when that pane's own
      // terminal input holds focus, so it never fires from a dialog, a rename
      // box, the Find bar, or the sidebar.
      when: () => {
        const ts = App.state.terminals.get(App.state.activeTerminalId);
        return !!ts?.term && document.activeElement === ts.term.textarea;
      },
      run: () => {
        const ts = App.state.terminals.get(App.state.activeTerminalId);
        if (ts?.term) ts.term.selectAll();
      },
    },
    {
      id: 'nextTerminal',
      key: 'Tab',
      labelKey: 'optionsShortcutNextTerminal',
      run: () => App.Terminal.cycleTerminal(1),
    },
    {
      id: 'prevTerminal',
      key: 'Tab',
      shift: true,
      labelKey: 'optionsShortcutPrevTerminal',
      run: () => App.Terminal.cycleTerminal(-1),
    },
    {
      id: 'toggleSidebar',
      code: 'KeyS',
      shift: true,
      labelKey: 'optionsShortcutToggleSidebar',
      run: () => App.SshPanel.toggleSidebar(),
    },
  ];

  function keyParts(def: ShortcutDef): string[] {
    const parts = ['Ctrl'];
    if (def.shift) parts.push('Shift');
    parts.push(def.key || (def.code && def.code.startsWith('Key') ? def.code.slice(3) : def.code) || '');
    return parts;
  }

  function format(def: ShortcutDef): string {
    return keyParts(def).join('+');
  }

  function defFor(id: string): ShortcutDef | undefined {
    return DEFS.find((def) => def.id === id);
  }

  // Capture phase so shortcuts fire before xterm.js consumes Ctrl+W / Ctrl+Tab
  // (which map to control characters) from the focused terminal textarea.
  // Modifiers match exactly: an extra Alt must never fire an undocumented combo.
  let bound = false;
  function bind() {
    if (bound) return;
    bound = true;
    document.addEventListener('keydown', (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl || e.altKey) return;
      for (const def of DEFS) {
        if (!!def.shift !== e.shiftKey) continue;
        if (def.code ? e.code !== def.code : e.key !== def.key) continue;
        if (def.when && !def.when()) continue;
        e.preventDefault();
        e.stopPropagation();
        def.run();
        return;
      }
    }, true);
  }

  // One keycap per key, joined by a plus: [Ctrl] + [Shift] + [A].
  function renderKeys(def: ShortcutDef): HTMLElement {
    const wrap = document.createElement('span');
    wrap.className = 'shortcut-keys';
    keyParts(def).forEach((part, i) => {
      if (i > 0) {
        const plus = document.createElement('span');
        plus.className = 'shortcut-key-plus';
        plus.textContent = '+';
        wrap.appendChild(plus);
      }
      const kbd = document.createElement('kbd');
      kbd.textContent = part;
      wrap.appendChild(kbd);
    });
    return wrap;
  }

  function renderTable(container: HTMLElement | null) {
    if (!container) return;
    container.replaceChildren();

    const table = document.createElement('table');
    table.className = 'options-shortcut-table';

    const head = document.createElement('thead');
    const headRow = document.createElement('tr');
    const shortcutTh = document.createElement('th');
    shortcutTh.scope = 'col';
    shortcutTh.textContent = App.__('optionsShortcutColumnKeys');
    const actionTh = document.createElement('th');
    actionTh.scope = 'col';
    actionTh.textContent = App.__('optionsShortcutColumnAction');
    headRow.append(shortcutTh, actionTh);
    head.appendChild(headRow);

    const body = document.createElement('tbody');
    for (const def of DEFS) {
      const row = document.createElement('tr');
      const keysCell = document.createElement('td');
      keysCell.className = 'shortcut-table-keys';
      keysCell.appendChild(renderKeys(def));
      const actionCell = document.createElement('td');
      actionCell.className = 'shortcut-table-action';
      actionCell.textContent = App.__(def.labelKey);
      row.append(keysCell, actionCell);
      body.appendChild(row);
    }
    table.append(head, body);
    container.appendChild(table);
  }

  // Fill the display-only copies from DEFS: Context menu hints and toolbar
  // tooltips. Their labels come from i18n, their keys never do.
  function hydrate(root: ParentNode = document) {
    for (const el of root.querySelectorAll<HTMLElement>('.context-shortcut[data-shortcut-id]')) {
      const def = defFor(el.dataset.shortcutId || '');
      if (def) el.textContent = format(def);
    }
    for (const el of root.querySelectorAll<HTMLElement>('[data-shortcut-title]')) {
      const def = defFor(el.dataset.shortcutTitle || '');
      if (def) el.setAttribute('title', `${App.__(def.labelKey)} (${format(def)})`);
    }
  }

  function refresh() {
    renderTable(document.getElementById('shortcutTable'));
    hydrate();
  }

  App.Shortcuts = {
    DEFS,
    bind,
    refresh,
    renderTable,
    renderKeys,
    hydrate,
    format,
  };
})();

export {};
