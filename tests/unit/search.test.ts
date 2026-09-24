// Unit tests — Terminal search (find bar + search panel)
import { setupTest, injectTerminal, injectGroup, findBarFor } from '../setup.js';

/** Minimal xterm stand-in that exposes just what the search scan reads. */
function fakeTerm(lines) {
  const bufferLines = lines.map((text) => ({
    translateToString: () => text,
  }));
  return {
    _addons: [],
    loadAddon(addon) { this._addons.push(addon); },
    buffer: { active: { length: bufferLines.length, getLine: (i) => bufferLines[i] } },
    focus() {},
    dispose() { this._disposed = true; },
    scrollToLine(line) { this.lastScrolled = line; },
    select(col, row, len) { this.lastSelection = { col, row, len }; },
  };
}

function dispatchKey(el, key, opts = {}) {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...opts }));
}

/** Arguments of every panelShowResults push, oldest first. */
function showCalls() {
  const spy = window.api.panelShowResults as unknown as { mock: { calls: unknown[][] } };
  return spy.mock.calls;
}

function lastPushedState() {
  return showCalls().at(-1)?.[0] as any;
}

describe('Unit: Terminal search', () => {
  let App;

  beforeEach(async () => {
    App = await setupTest('terminal', 'tabs', 'groups', 'ui', 'echo', 'menus', 'search');
    App.Search.init();
  });

  describe('find bar (Ctrl+F)', () => {
    it('opens on the active pane and focuses the input', () => {
      injectTerminal(1);
      App.state.activeTerminalId = 1;

      App.Search.handleShortcut(false);

      expect(findBarFor(1).classList.contains('hidden')).toBe(false);
      expect(document.activeElement).toBe(findBarFor(1).querySelector('.find-bar-input'));
    });

    it('builds the bar inside the pane it searches', () => {
      const ts = injectTerminal(1);
      App.state.activeTerminalId = 1;

      App.Search.openFindBar();

      expect(ts.paneEl.querySelector('.xterm-screen').contains(findBarFor(1))).toBe(true);
    });

    it('gives every pane its own bar, closed on its own', () => {
      injectTerminal(1);
      injectTerminal(2);

      App.state.activeTerminalId = 1;
      App.Search.openFindBar();
      App.state.activeTerminalId = 2;
      App.Search.openFindBar();

      expect(findBarFor(1).classList.contains('hidden')).toBe(false);
      expect(findBarFor(2).classList.contains('hidden')).toBe(false);

      App.Search.closeFindBar();

      expect(findBarFor(2).classList.contains('hidden')).toBe(true);
      expect(findBarFor(1).classList.contains('hidden')).toBe(false);
    });

    it('does nothing when an overlay is open', () => {
      injectTerminal(1);
      App.state.activeTerminalId = 1;
      App.optionsPanel.classList.remove('hidden');

      App.Search.handleShortcut(false);

      // Blocked by the overlay, so no bar was built for the pane.
      expect(findBarFor(1)).toBeNull();
    });

    it('toggles closed on a second Ctrl+F', () => {
      injectTerminal(1);
      App.state.activeTerminalId = 1;

      App.Search.handleShortcut(false);
      App.Search.handleShortcut(false);

      expect(findBarFor(1).classList.contains('hidden')).toBe(true);
    });

    it('searches forward on Enter and backward on Shift+Enter', () => {
      const ts = injectTerminal(1, { term: fakeTerm(['hello world']) });
      App.state.activeTerminalId = 1;
      App.Search.openFindBar();

      const input = findBarFor(1).querySelector('.find-bar-input');
      input.value = 'world';

      dispatchKey(input, 'Enter');
      expect(ts.term._addons[0].calls.findNext[0].term).toBe('world');

      dispatchKey(input, 'Enter', { shiftKey: true });
      expect(ts.term._addons[0].calls.findPrevious[0].term).toBe('world');
    });

    it('passes decoration colors so matches are highlighted', () => {
      const ts = injectTerminal(1, { term: fakeTerm(['hello']) });
      App.state.activeTerminalId = 1;
      App.Search.openFindBar();

      const input = findBarFor(1).querySelector('.find-bar-input');
      input.value = 'hello';
      dispatchKey(input, 'Enter');

      const options = ts.term._addons[0].calls.findNext[0].options;
      expect(options.decorations.matchBackground).toBe(App.Theme.getSearchColors().barMatch);
      expect(options.decorations.activeMatchBackground).toBe(App.Theme.getSearchColors().barActiveMatch);
    });

    it('renders the match counter from the addon event', () => {
      const ts = injectTerminal(1, { term: fakeTerm(['a', 'a']) });
      App.state.activeTerminalId = 1;
      App.Search.openFindBar();

      const input = findBarFor(1).querySelector('.find-bar-input');
      input.value = 'a';
      dispatchKey(input, 'Enter');

      ts.term._addons[0]._fireResults({ resultIndex: 1, resultCount: 2 });

      expect(findBarFor(1).querySelector('.find-bar-count').textContent).toBe('2/2');
    });

    it('debounces live search while typing', () => {
      vi.useFakeTimers();
      try {
        const ts = injectTerminal(1, { term: fakeTerm(['needle']) });
        App.state.activeTerminalId = 1;
        App.Search.openFindBar();

        const input = findBarFor(1).querySelector('.find-bar-input');
        input.value = 'needle';
        dispatchKey(input, 'Enter'); // establishes the addon + first search
        const addon = ts.term._addons[0];
        expect(addon.calls.findNext.length).toBe(1);

        input.value = 'needl';
        input.dispatchEvent(new Event('input'));
        expect(addon.calls.findNext.length).toBe(1); // still debounced

        vi.advanceTimersByTime(300);
        expect(addon.calls.findNext.length).toBe(2);
      } finally {
        vi.useRealTimers();
      }
    });

    it('enables regex search from the toggle', () => {
      const ts = injectTerminal(1, { term: fakeTerm(['abc123']) });
      App.state.activeTerminalId = 1;
      App.Search.openFindBar();

      const input = findBarFor(1).querySelector('.find-bar-input');
      input.value = '\\d+';
      (findBarFor(1).querySelector('.find-bar-regex') as HTMLElement).click();

      const options = ts.term._addons[0].calls.findNext.at(-1).options;
      expect(options.regex).toBe(true);
      expect(findBarFor(1).querySelector('.find-bar-regex').classList.contains('active')).toBe(true);
    });

    it('passes case sensitivity from the toggle', () => {
      const ts = injectTerminal(1, { term: fakeTerm(['Hello']) });
      App.state.activeTerminalId = 1;
      App.Search.openFindBar();

      const input = findBarFor(1).querySelector('.find-bar-input');
      input.value = 'Hello';
      (findBarFor(1).querySelector('.find-bar-case') as HTMLElement).click();

      expect(ts.term._addons[0].calls.findNext.at(-1).options.caseSensitive).toBe(true);
    });

    it('does not let a button keep focus, so Space is not replayed on it', () => {
      injectTerminal(1);
      App.state.activeTerminalId = 1;
      App.Search.openFindBar();

      const bar = findBarFor(1);
      const onButton = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      (bar.querySelector('.find-bar-next') as HTMLElement).dispatchEvent(onButton);
      expect(onButton.defaultPrevented).toBe(true);

      // The input must still be clickable/focusable.
      const onInput = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      (bar.querySelector('.find-bar-input') as HTMLElement).dispatchEvent(onInput);
      expect(onInput.defaultPrevented).toBe(false);
    });

    it('closes on Escape, clears decorations and remembers the query', () => {
      const ts = injectTerminal(1, { term: fakeTerm(['hello']) });
      App.state.activeTerminalId = 1;
      App.Search.openFindBar();
      const input = findBarFor(1).querySelector('.find-bar-input');
      input.value = 'hello';
      dispatchKey(input, 'Enter');

      dispatchKey(input, 'Escape');

      expect(findBarFor(1).classList.contains('hidden')).toBe(true);
      expect(ts.term._addons[0].calls.clearDecorations).toBeGreaterThan(0);

      // Reopening restores the remembered query.
      App.Search.openFindBar();
      expect(findBarFor(1).querySelector('.find-bar-input').value).toBe('hello');
    });
  });

  describe('search panel (Ctrl+Shift+F)', () => {
    it('asks the main process to open the panel window', () => {
      App.Search.handleShortcut(true);
      expect(window.api.panelOpen).toHaveBeenCalled();
    });

    it('scopes to the active pane when echo mode is off', () => {
      injectGroup('g1', 'Group 1');
      App.state.activeGroupId = 'g1';
      injectTerminal(1);
      injectTerminal(2);
      App.state.terminalGroups.set(1, 'g1');
      App.state.terminalGroups.set(2, 'g1');
      App.state.activeTerminalId = 2;

      const visible = App.Search.visibleTerminals().map((t) => t.id);
      expect(visible).toEqual([2]);
    });

    it('scopes to every pane of the group in echo mode', () => {
      injectGroup('g1', 'Group 1');
      App.state.activeGroupId = 'g1';
      injectTerminal(1);
      injectTerminal(2);
      App.state.terminalGroups.set(1, 'g1');
      App.state.terminalGroups.set(2, 'g1');
      App.state.groups.get('g1').terminalIds.add(1);
      App.state.groups.get('g1').terminalIds.add(2);
      App.state.echoModeActive = true;
      App.state.activeTerminalId = 1;

      const visible = App.Search.visibleTerminals().map((t) => t.id);
      expect(visible.sort()).toEqual([1, 2]);
    });

    it('reports the empty state when nothing can be searched', () => {
      const results = App.Search.runPanelSearch('anything');
      expect(results.empty).toBe(true);
      expect(results.groups).toEqual([]);
    });

    it('finds matches per pane and highlights them with panel colors', () => {
      injectGroup('g1', 'Group 1');
      App.state.activeGroupId = 'g1';
      const ts = injectTerminal(1, { term: fakeTerm(['error: one', 'ok', 'error: two']) });
      App.state.terminalGroups.set(1, 'g1');
      App.state.groups.get('g1').terminalIds.add(1);
      App.state.echoModeActive = true;
      App.state.activeTerminalId = 1;

      const results = App.Search.runPanelSearch('error');

      expect(results.empty).toBe(false);
      expect(results.total).toBe(2);
      expect(results.groups[0].terminalId).toBe(1);
      expect(results.groups[0].matches.map((m) => m.line)).toEqual([0, 2]);

      const options = ts.term._addons[0].calls.findNext[0].options;
      expect(options.decorations.matchBackground).toBe(App.Theme.getSearchColors().panelMatch);
    });

    it('ignores case by default and caps results', () => {
      App.state.activeTerminalId = 1;
      const ts = injectTerminal(1, { term: fakeTerm(['Match', 'match', 'MaTcH']) });
      injectGroup('g1', 'Group 1');
      App.state.activeGroupId = 'g1';
      App.state.terminalGroups.set(1, 'g1');
      App.state.echoModeActive = false;

      const results = App.Search.runPanelSearch('match');
      expect(results.total).toBe(3);
      expect(App.Search.MATCH_LIMIT).toBe(500);
      expect(ts.term._addons.length).toBeGreaterThan(0);
    });

    it('applies case, whole word and regex options to the scan and the addon', () => {
      injectGroup('g1', 'Group 1');
      App.state.activeGroupId = 'g1';
      const ts = injectTerminal(1, { term: fakeTerm(['Error 123', 'error 456', 'ERROR 789']) });
      App.state.terminalGroups.set(1, 'g1');
      App.state.groups.get('g1').terminalIds.add(1);
      App.state.activeTerminalId = 1;

      const results = App.Search.runPanelSearch('error\\s+\\d+', {
        caseSensitive: true, wholeWord: false, regex: true,
      });

      expect(results.total).toBe(1);
      expect(results.groups[0].matches[0].line).toBe(1);

      const options = ts.term._addons[0].calls.findNext.at(-1).options;
      expect(options.regex).toBe(true);
      expect(options.caseSensitive).toBe(true);
    });

    it('reports no matches for an invalid regular expression', () => {
      injectGroup('g1', 'Group 1');
      App.state.activeGroupId = 'g1';
      injectTerminal(1, { term: fakeTerm(['anything']) });
      App.state.terminalGroups.set(1, 'g1');
      App.state.groups.get('g1').terminalIds.add(1);
      App.state.activeTerminalId = 1;

      const results = App.Search.runPanelSearch('([', { regex: true });

      expect(results.total).toBe(0);
    });

    it('remembers the last search per group and restores it on switch back', () => {
      injectGroup('g1', 'Group 1');
      injectGroup('g2', 'Group 2');
      App.state.activeGroupId = 'g1';
      injectTerminal(1, { term: fakeTerm(['alpha']) });
      App.state.terminalGroups.set(1, 'g1');
      App.state.groups.get('g1').terminalIds.add(1);
      App.state.activeTerminalId = 1;

      App.Search.runPanelSearch('alpha', { regex: false });

      // g2 has never been searched → empty state.
      App.Groups.switchGroup('g2');
      expect(lastPushedState()).toBeNull();

      // Back to g1 → its query, toggles and result list come back.
      App.Groups.switchGroup('g1');
      expect(lastPushedState().query).toBe('alpha');
      expect(lastPushedState().options).toEqual({ caseSensitive: false, wholeWord: false, regex: false });
      expect(lastPushedState().results.total).toBe(1);
    });

    it('keeps each group\'s own query and options', () => {
      injectGroup('g1', 'Group 1');
      injectGroup('g2', 'Group 2');
      App.state.activeGroupId = 'g1';
      injectTerminal(1, { term: fakeTerm(['alpha']) });
      App.state.terminalGroups.set(1, 'g1');
      App.state.groups.get('g1').terminalIds.add(1);
      App.state.activeTerminalId = 1;
      App.Search.runPanelSearch('alpha', { caseSensitive: true });

      App.state.activeGroupId = 'g2';
      injectTerminal(2, { term: fakeTerm(['beta']) });
      App.state.terminalGroups.set(2, 'g2');
      App.state.groups.get('g2').terminalIds.add(2);
      App.state.activeTerminalId = 2;
      App.Search.runPanelSearch('beta', { regex: true });

      App.Groups.switchGroup('g1');
      expect(lastPushedState().query).toBe('alpha');
      expect(lastPushedState().options.caseSensitive).toBe(true);
      expect(lastPushedState().options.regex).toBe(false);

      App.Groups.switchGroup('g2');
      expect(lastPushedState().query).toBe('beta');
      expect(lastPushedState().options.regex).toBe(true);
    });

    it('drops a deleted group\'s remembered search', () => {
      injectGroup('g1', 'Group 1');
      App.state.activeGroupId = 'g1';
      injectTerminal(1, { term: fakeTerm(['alpha']) });
      App.state.terminalGroups.set(1, 'g1');
      App.state.groups.get('g1').terminalIds.add(1);
      App.state.activeTerminalId = 1;
      App.Search.runPanelSearch('alpha', { regex: false });

      App.Search.onGroupDeleted('g1');
      App.Search.onActiveGroupChanged();

      expect(lastPushedState()).toBeNull();
    });

    it('pushes the active group state when the panel opens', () => {
      injectGroup('g1', 'Group 1');
      App.state.activeGroupId = 'g1';
      injectTerminal(1, { term: fakeTerm(['alpha']) });
      App.state.terminalGroups.set(1, 'g1');
      App.state.groups.get('g1').terminalIds.add(1);
      App.state.activeTerminalId = 1;
      App.Search.runPanelSearch('alpha', { regex: false });

      App.Search.openSearchPanel();

      expect(window.api.panelOpen).toHaveBeenCalled();
      expect(lastPushedState().query).toBe('alpha');
    });

    it('clears a closed tab\'s matches from the remembered results', () => {
      injectGroup('g1', 'Group 1');
      App.state.activeGroupId = 'g1';
      injectTerminal(1, { term: fakeTerm(['alpha']) });
      injectTerminal(2, { term: fakeTerm(['alpha']) });
      App.state.terminalGroups.set(1, 'g1');
      App.state.terminalGroups.set(2, 'g1');
      App.state.groups.get('g1').terminalIds.add(1);
      App.state.groups.get('g1').terminalIds.add(2);
      App.state.echoModeActive = true;
      App.state.activeTerminalId = 1;

      const results = App.Search.runPanelSearch('alpha', { regex: false });
      expect(results.total).toBe(2);

      App.Terminal.closeTerminal(2);

      expect(lastPushedState().query).toBe('alpha');
      expect(lastPushedState().results.total).toBe(1);
      expect(lastPushedState().results.groups.map((g) => g.terminalId)).toEqual([1]);
    });

    it('keeps the query but shows no matches when the last matching tab closes', () => {
      injectGroup('g1', 'Group 1');
      App.state.activeGroupId = 'g1';
      injectTerminal(1, { term: fakeTerm(['alpha']) });
      App.state.terminalGroups.set(1, 'g1');
      App.state.groups.get('g1').terminalIds.add(1);
      App.state.echoModeActive = true;
      App.state.activeTerminalId = 1;

      App.Search.runPanelSearch('alpha', { regex: false });

      App.Terminal.closeTerminal(1);

      expect(lastPushedState().query).toBe('alpha');
      expect(lastPushedState().results.total).toBe(0);
      expect(lastPushedState().results.groups).toEqual([]);
    });

    it('jumps to a match by scrolling and selecting it', () => {
      const ts = injectTerminal(1, { term: fakeTerm(['a', 'b']) });
      App.state.activeTerminalId = 1;
      const focusSpy = vi.spyOn(App.Terminal, 'focusTerminal');

      App.Search.jumpToMatch({ terminalId: 1, line: 1, col: 0, length: 1, text: 'b' });

      expect(focusSpy).toHaveBeenCalledWith(1);
      expect(ts.term.lastScrolled).toBe(1);
      expect(ts.term.lastSelection).toEqual({ col: 0, row: 1, len: 1 });
    });

    it('clears panel decorations when the panel closes', () => {
      const ts = injectTerminal(1, { term: fakeTerm(['x']) });
      App.state.activeTerminalId = 1;
      App.Search.runPanelSearch('x');
      const before = ts.term._addons[0].calls.clearDecorations;

      App.Search.clearPanelHighlights();

      expect(ts.term._addons[0].calls.clearDecorations).toBeGreaterThan(before);
    });
  });

  describe('buffer scanning', () => {
    it('matches whole words only when asked', () => {
      const ts = injectTerminal(1, { term: fakeTerm(['cat catalog cat_']) });
      const query = 'cat';

      const loose = App.Search.scanPane(ts, query, { caseSensitive: false, wholeWord: false }, 500);
      expect(loose.map((m) => m.col)).toEqual([0, 4, 12]);

      const strict = App.Search.scanPane(ts, query, { caseSensitive: false, wholeWord: true }, 500);
      expect(strict.map((m) => m.col)).toEqual([0]);
    });

    it('honours case sensitivity', () => {
      const ts = injectTerminal(1, { term: fakeTerm(['Foo foo']) });

      const insensitive = App.Search.scanPane(ts, 'foo', { caseSensitive: false, wholeWord: false }, 500);
      expect(insensitive.length).toBe(2);

      const sensitive = App.Search.scanPane(ts, 'foo', { caseSensitive: true, wholeWord: false }, 500);
      expect(sensitive.map((m) => m.col)).toEqual([4]);
    });

    it('stops at the remaining budget', () => {
      const ts = injectTerminal(1, { term: fakeTerm(['aaaa']) });
      const matches = App.Search.scanPane(ts, 'a', { caseSensitive: false, wholeWord: false }, 2);
      expect(matches.length).toBe(2);
    });

    it('returns each regex match with its own length', () => {
      const ts = injectTerminal(1, { term: fakeTerm(['a1 bb22 c333']) });
      const matches = App.Search.scanPane(
        ts, '\\d+', { caseSensitive: false, wholeWord: false, regex: true }, 500);

      expect(matches.map((m) => [m.col, m.length])).toEqual([[1, 1], [5, 2], [9, 3]]);
    });

    it('applies whole-word matching to regex results', () => {
      const ts = injectTerminal(1, { term: fakeTerm(['cat catalog cat_']) });
      const matches = App.Search.scanPane(
        ts, 'cat', { caseSensitive: false, wholeWord: true, regex: true }, 500);

      expect(matches.map((m) => m.col)).toEqual([0]);
    });

    it('terminates on zero-length regex matches', () => {
      const ts = injectTerminal(1, { term: fakeTerm(['abc']) });
      const matches = App.Search.scanPane(
        ts, 'x*', { caseSensitive: false, wholeWord: false, regex: true }, 3);

      expect(matches.length).toBe(3);
    });

    it('treats an invalid regex as no matches', () => {
      const ts = injectTerminal(1, { term: fakeTerm(['abc']) });
      const matches = App.Search.scanPane(
        ts, '([', { caseSensitive: false, wholeWord: false, regex: true }, 500);

      expect(matches).toEqual([]);
    });
  });
});
