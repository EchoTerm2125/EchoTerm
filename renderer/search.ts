/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Terminal Search (Ctrl+F find bar, Ctrl+Shift+F search panel)
   Searching runs entirely against the renderer's xterm buffers: the find bar
   drives a SearchAddon on the active pane, while the search panel window asks
   this module for a result list and for jump-to-match.
   ═══════════════════════════════════════════════════════════════════════════ */

import './theme';

(function () {
  'use strict';
  const state = App.state;
  const api = App.api;

  const MATCH_LIMIT = 500;  // cap on matches returned to the search panel
  const DEBOUNCE_MS = 250;  // find bar re-searches while the user types
  const PREVIEW_LEN = 200;  // characters of a line shown in the results list

  const WORD_CHAR = /[A-Za-z0-9_]/;

  // The find bar belongs to the pane it searches: it is created on first use
  // and lives inside that pane's xterm screen element, so the pane positions
  // and clips it. Query, toggles, open state and the pending debounce all hang
  // off the pane entry, so they are dropped with the pane.

  // ─── SearchAddon plumbing ──────────────────────────────────────────────────
  // Two addon instances per pane: the find bar and the search panel each own
  // one so both can highlight the same buffer in their own colors at once.
  function getAddon(ts, which) {
    const key = which === 'bar' ? '_searchBar' : '_searchPanel';
    if (ts[key]) return ts[key];
    const Ctor = (typeof SearchAddon !== 'undefined' && (SearchAddon as any).SearchAddon) || SearchAddon;
    if (!Ctor) return null;
    let addon;
    try {
      addon = new (Ctor as any)({ highlightLimit: MATCH_LIMIT });
    } catch {
      return null;
    }
    try {
      ts.term.loadAddon(addon);
    } catch {
      return null;
    }
    ts[key] = addon;
    if (which === 'bar' && typeof addon.onDidChangeResults === 'function') {
      addon.onDidChangeResults((e) => { if (ts._findOpen) updateCount(ts, e); });
    }
    return addon;
  }

  // Decoration options require opaque #RRGGBB backgrounds and both overview
  // ruler colors; the active band sits on top of xterm's selection.
  function decorations(which) {
    const c = App.Theme.getSearchColors();
    const match = which === 'bar' ? c.barMatch : c.panelMatch;
    const active = which === 'bar' ? c.barActiveMatch : c.panelActiveMatch;
    return {
      matchBackground: match,
      activeMatchBackground: active,
      matchOverviewRuler: match,
      activeMatchColorOverviewRuler: active,
    };
  }

  // ─── Find bar (one per pane, inside that pane's terminal screen) ───────────
  // Built lazily on first use and appended to the pane's `.xterm-screen`, which
  // xterm sizes to the terminal grid: the bar therefore aligns with the pane's
  // own text area and is clipped by the pane. Several panes can each own a bar
  // and search at the same time; Ctrl+F only touches the active pane's.
  const BAR_HTML = `
    <input type="text" class="find-bar-input" placeholder="Find" data-i18n-placeholder="findPlaceholder" autocomplete="off" spellcheck="false" />
    <span class="find-bar-count"></span>
    <button class="find-bar-btn find-bar-prev" data-i18n-title="findPrevTitle" title="Previous match (Shift+Enter)">↑</button>
    <button class="find-bar-btn find-bar-next" data-i18n-title="findNextTitle" title="Next match (Enter)">↓</button>
    <button class="find-bar-btn find-bar-toggle find-bar-case" data-i18n-title="findCaseTitle" title="Match case">Aa</button>
    <button class="find-bar-btn find-bar-toggle find-bar-word" data-i18n-title="findWordTitle" title="Match whole word">ab</button>
    <button class="find-bar-btn find-bar-toggle find-bar-regex" data-i18n-title="findRegexTitle" title="Use regular expression">.*</button>
    <button class="find-bar-btn find-bar-close" data-i18n-title="searchPanelCloseTitle" title="Close">×</button>
  `;

  const TOGGLES = [
    { selector: '.find-bar-case', key: 'caseSensitive' },
    { selector: '.find-bar-word', key: 'wholeWord' },
    { selector: '.find-bar-regex', key: 'regex' },
  ];

  function q(ts, selector) {
    return ts && ts._findBar ? ts._findBar.querySelector(selector) : null;
  }

  function findInput(ts) { return q(ts, '.find-bar-input') as HTMLInputElement | null; }

  function ensureBar(ts) {
    if (ts._findBar) return ts._findBar;
    const host = ts.paneEl ? ts.paneEl.querySelector('.xterm-screen') : null;
    if (!host) return null;
    const bar = document.createElement('div');
    bar.className = 'find-bar hidden';
    bar.setAttribute('data-overlay', '');
    bar.innerHTML = BAR_HTML;
    host.appendChild(bar);
    ts._findBar = bar;
    // Lazy DOM: the one-shot init scan has already run, so localize it here.
    if (App.i18n && App.i18n.localizeDom) App.i18n.localizeDom(bar);
    bindBarEvents(ts, bar);
    return bar;
  }

  function currentFindTarget() {
    if (state.terminals.has(state.activeTerminalId)) return state.terminals.get(state.activeTerminalId);
    const ids = App.Groups.getGroupTerminalIds(state.activeGroupId);
    const id = ids.find((tid) => state.terminals.has(tid));
    return id ? state.terminals.get(id) : null;
  }

  function memoryFor(ts) {
    if (!ts._findMemory) {
      ts._findMemory = { query: '', caseSensitive: false, wholeWord: false, regex: false };
    }
    return ts._findMemory;
  }

  function findOptions(mem) {
    return {
      caseSensitive: mem.caseSensitive,
      wholeWord: mem.wholeWord,
      regex: mem.regex,
      incremental: false,
      decorations: decorations('bar'),
    };
  }

  function isFindOpen(ts) { return !!(ts && ts._findOpen); }

  function toggleFindBar() {
    const ts = currentFindTarget();
    if (!ts) return;
    if (isFindOpen(ts)) closeFindBar(ts);
    else openFindBar(ts);
  }

  function openFindBar(target) {
    const ts = target || currentFindTarget();
    const bar = ts ? ensureBar(ts) : null;
    const input = findInput(ts);
    if (!bar || !input) return;

    const mem = memoryFor(ts);
    bar.classList.remove('hidden');
    ts._findOpen = true;
    input.value = mem.query;
    input.focus();
    input.select();
    syncToggles(ts, mem);
    if (mem.query) runFind(ts, 'first');
    else updateCount(ts, null);
  }

  function closeFindBar(target) {
    const ts = target || currentFindTarget();
    if (!ts || !ts._findOpen) return;
    if (ts._findDebounce) { clearTimeout(ts._findDebounce); ts._findDebounce = null; }
    ts._findOpen = false;
    if (ts._findBar) ts._findBar.classList.add('hidden');
    clearBarDecorations(ts);
    if (state.terminals.has(ts.id)) App.Terminal.refocus(ts.id);
  }

  function clearBarDecorations(ts) {
    const addon = ts._searchBar;
    if (!addon) return;
    try { addon.clearDecorations(); } catch { /* pane not ready */ }
  }

  function syncToggles(ts, mem) {
    for (const toggle of TOGGLES) {
      const btn = q(ts, toggle.selector);
      if (btn) btn.classList.toggle('active', !!mem[toggle.key]);
    }
  }

  // direction: 'first' re-runs from the top of the buffer, otherwise it walks
  // from the current match.
  function runFind(ts, direction) {
    const input = findInput(ts);
    // A closed bar, or one whose pane was torn down while a debounce was
    // pending, must not search.
    if (!ts._findOpen || !input || !ts._findBar.isConnected) return;

    const mem = memoryFor(ts);
    mem.query = input.value;

    const addon = getAddon(ts, 'bar');
    if (!addon) return;
    const opts = findOptions(mem);

    try {
      if (direction === 'first') addon.clearDecorations();
      if (!mem.query) { addon.clearDecorations(); updateCount(ts, null); return; }
      if (direction === 'prev') addon.findPrevious(mem.query, opts);
      else addon.findNext(mem.query, opts);
    } catch { /* pane not ready */ }
  }

  function updateCount(ts, e) {
    const el = q(ts, '.find-bar-count');
    if (!el) return;
    const input = findInput(ts);
    if (!e || !e.resultCount) { el.textContent = input && input.value ? App.__('findNoResults') : ''; return; }
    const idx = e.resultIndex >= 0 ? e.resultIndex + 1 : '?';
    el.textContent = `${idx}/${e.resultCount}`;
  }

  function bindBarEvents(ts, bar) {
    const input = findInput(ts);
    if (!input) return;

    // The bar sits inside xterm's screen element, so its mouse events would
    // otherwise reach xterm's mousedown handler on `.xterm` (which preventDefaults
    // a primary press and starts a terminal selection) and the pane's click
    // handler (which pulls focus back to the terminal). Keep them on the bar.
    for (const type of ['mousedown', 'click', 'dblclick', 'contextmenu', 'wheel']) {
      bar.addEventListener(type, (e) => e.stopPropagation());
    }

    // A button takes focus on mouse-down, and a focused button is activated by
    // Space — so without this, clicking a control would make the next Space
    // re-run it instead of reaching the input. Keep the focus where it was;
    // Tab + Space still activate a button reached by keyboard.
    bar.addEventListener('mousedown', (e) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest('button')) e.preventDefault();
    });

    input.addEventListener('input', () => {
      if (ts._findDebounce) clearTimeout(ts._findDebounce);
      ts._findDebounce = setTimeout(() => { ts._findDebounce = null; runFind(ts, 'first'); }, DEBOUNCE_MS);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); runFind(ts, e.shiftKey ? 'prev' : 'next'); return; }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeFindBar(ts); }
    });

    const prev = q(ts, '.find-bar-prev');
    const next = q(ts, '.find-bar-next');
    if (prev) prev.addEventListener('click', () => runFind(ts, 'prev'));
    if (next) next.addEventListener('click', () => runFind(ts, 'next'));
    for (const toggle of TOGGLES) {
      const btn = q(ts, toggle.selector);
      if (!btn) continue;
      btn.addEventListener('click', () => {
        const mem = memoryFor(ts);
        mem[toggle.key] = !mem[toggle.key];
        syncToggles(ts, mem);
        runFind(ts, 'first');
      });
    }
    const closeBtn = q(ts, '.find-bar-close');
    if (closeBtn) closeBtn.addEventListener('click', () => closeFindBar(ts));
  }

  // ─── Search panel ──────────────────────────────────────────────────────────
  // Scope: the panes currently on screen — every pane of the active group in
  // echo mode, otherwise just the active pane.
  // The last search is kept per group so switching groups restores what that
  // group was showing (and shows the empty state when it was never searched).
  const groupResults = new Map(); // groupId -> { query, options, results }

  function pushGroupState() {
    if (!api.panelShowResults) return;
    const entry = state.activeGroupId ? groupResults.get(state.activeGroupId) : null;
    try {
      api.panelShowResults(entry
        ? { query: entry.query, options: entry.options, results: entry.results }
        : null);
    } catch { /* no popup support */ }
  }

  function onActiveGroupChanged() {
    pushGroupState();
  }

  function onGroupDeleted(groupId) {
    groupResults.delete(groupId);
  }

  function visibleTerminals() {
    const ids = state.echoModeActive
      ? App.Groups.getGroupTerminalIds(state.activeGroupId)
      : [state.activeTerminalId];
    return ids.map((id) => state.terminals.get(id)).filter(Boolean);
  }

  function isWholeWord(text, idx, len) {
    const before = idx > 0 ? text[idx - 1] : '';
    const after = idx + len < text.length ? text[idx + len] : '';
    return (!before || !WORD_CHAR.test(before)) && (!after || !WORD_CHAR.test(after));
  }

  // Normalizes the options the search panel sends: every flag defaults to off.
  function normalizeOptions(raw) {
    return {
      caseSensitive: !!(raw && raw.caseSensitive),
      wholeWord: !!(raw && raw.wholeWord),
      regex: !!(raw && raw.regex),
    };
  }

  // Builds the line matcher for a scan: a compiled RegExp for regex search, or
  // a lower-cased needle for plain search. Returns null when a regex is invalid
  // so the caller can report "no matches" instead of throwing.
  function compileMatcher(query, options) {
    if (!options.regex) {
      return { needle: options.caseSensitive ? query : query.toLowerCase(), regex: null };
    }
    try {
      return { needle: null, regex: new RegExp(query, options.caseSensitive ? 'g' : 'gi') };
    } catch {
      return null;
    }
  }

  // Reads a pane's buffer and returns its matches. The addon only reports
  // counts, so the results list needs its own scan over the buffer lines.
  function scanPane(ts, query, options, remaining) {
    const matches = [];
    const buffer = ts.term && ts.term.buffer && ts.term.buffer.active;
    if (!buffer || !query) return matches;
    const matcher = compileMatcher(query, options);
    if (!matcher) return matches;

    const total = buffer.length;
    for (let row = 0; row < total && matches.length < remaining; row++) {
      const line = buffer.getLine(row);
      if (!line) continue;
      const text = line.translateToString(true);
      if (!text) continue;
      const preview = text.trim().slice(0, PREVIEW_LEN);

      const push = (col, length) => {
        if (options.wholeWord && !isWholeWord(text, col, length)) return;
        matches.push({ terminalId: ts.id, line: row, col, length, text: preview });
      };

      if (matcher.regex) {
        matcher.regex.lastIndex = 0;
        let m;
        while (matches.length < remaining && (m = matcher.regex.exec(text)) !== null) {
          push(m.index, m[0].length);
          // A zero-length match would otherwise loop forever.
          if (m[0].length === 0) matcher.regex.lastIndex++;
        }
      } else {
        const hay = options.caseSensitive ? text : text.toLowerCase();
        let from = 0;
        while (matches.length < remaining) {
          const idx = hay.indexOf(matcher.needle, from);
          if (idx === -1) break;
          push(idx, matcher.needle.length);
          from = idx + matcher.needle.length;
        }
      }
    }
    return matches;
  }

  function runPanelSearch(query, rawOptions) {
    const options = normalizeOptions(rawOptions);
    const panes = visibleTerminals();
    const groups = [];
    let total = 0;
    let truncated = false;

    for (const ts of panes) {
      const remaining = MATCH_LIMIT - total;
      const matches = remaining > 0 ? scanPane(ts, query, options, remaining) : [];
      total += matches.length;
      if (total >= MATCH_LIMIT) truncated = true;

      // Highlight this pane's matches with the panel's own decorations.
      const addon = getAddon(ts, 'panel');
      if (addon && query) {
        try {
          addon.clearDecorations();
          addon.findNext(query, { ...options, decorations: decorations('panel') });
        } catch { /* invalid pattern or pane not ready */ }
      }
      if (matches.length > 0 || panes.length === 1) {
        groups.push({ terminalId: ts.id, label: App.Terminal.paneTitle(ts), matches });
      }
    }

    const results = { empty: panes.length === 0, groups, total, truncated, query };
    // Remember this group's search so switching away and back restores it.
    if (state.activeGroupId) groupResults.set(state.activeGroupId, { query, options, results });
    return results;
  }

  function jumpToMatch(match) {
    const ts = state.terminals.get(match.terminalId);
    if (!ts) return;
    App.Terminal.focusTerminal(match.terminalId);
    try {
      ts.term.scrollToLine(match.line);
      ts.term.select(match.col, match.line, match.length);
    } catch { /* pane not ready */ }
  }

  function clearPanelHighlights() {
    for (const [, ts] of state.terminals) {
      const addon = ts._searchPanel;
      if (!addon) continue;
      try { addon.clearDecorations(); } catch { /* pane not ready */ }
    }
  }

  function openSearchPanel() {
    if (!api.panelOpen) return;
    pushThemeToPanel();
    pushGroupState();
    api.panelOpen().catch(() => {});
  }

  function panelLabels() {
    return {
      title: App.__('searchPanelTitle'),
      placeholder: App.__('searchPanelPlaceholder'),
      run: App.__('searchPanelRun'),
      hint: App.__('searchPanelHint'),
      empty: App.__('searchPanelEmpty'),
      noResults: App.__('searchPanelNoResults'),
      truncated: App.__('searchPanelTruncated', { count: MATCH_LIMIT }),
      closeTitle: App.__('searchPanelCloseTitle'),
      caseTitle: App.__('findCaseTitle'),
      wordTitle: App.__('findWordTitle'),
      regexTitle: App.__('findRegexTitle'),
    };
  }

  function pushThemeToPanel() {
    if (!api.panelPushTheme) return;
    try {
      api.panelPushTheme({ theme: App.Theme.getTheme(), labels: panelLabels() });
    } catch { /* no popup support */ }
  }

  function bindPanelEvents() {
    if (api.onPanelRun) {
      api.onPanelRun((requestId, query, options) => {
        let results;
        try {
          results = runPanelSearch(query, options);
        } catch {
          results = { empty: true, groups: [], total: 0, truncated: false, query };
        }
        if (api.panelRunResult) api.panelRunResult(requestId, results);
      });
    }
    if (api.onPanelJump) api.onPanelJump((match) => jumpToMatch(match));
    if (api.onPanelClosed) api.onPanelClosed(() => clearPanelHighlights());
  }

  // ─── Shortcut entry point (called from the capture-phase key handler) ──────
  function anyOverlayOpen() {
    const open = document.querySelectorAll('[data-overlay]:not(.hidden)');
    for (const el of open) {
      if (!el.classList.contains('find-bar')) return true;
    }
    return false;
  }

  function handleShortcut(allPanes) {
    if (allPanes) {
      if (!anyOverlayOpen()) openSearchPanel();
      return;
    }
    const ts = currentFindTarget();
    if (!ts) return;
    // Open find bars are not an obstacle to Ctrl+F.
    if (!isFindOpen(ts) && anyOverlayOpen()) return;
    toggleFindBar();
  }

  // Decoration colors are baked in when the addons run, so a theme change must
  // re-apply them or the existing highlights keep the old theme's tones.
  function refreshDecorations() {
    for (const [, ts] of state.terminals) {
      if (ts._findOpen) runFind(ts, 'first');
    }
    const entry = state.activeGroupId ? groupResults.get(state.activeGroupId) : null;
    if (!entry || !entry.query) return;
    for (const group of entry.results.groups) {
      const ts = state.terminals.get(group.terminalId);
      const addon = ts && ts._searchPanel;
      if (!addon) continue;
      try {
        addon.clearDecorations();
        addon.findNext(entry.query, { ...entry.options, decorations: decorations('panel') });
      } catch { /* pane not ready */ }
    }
  }

  function init() {
    bindPanelEvents();
    if (App.Theme && App.Theme.onThemeChange) {
      App.Theme.onThemeChange(() => {
        pushThemeToPanel();
        refreshDecorations();
      });
    }
    if (App.i18n && App.i18n.onLocaleChange) App.i18n.onLocaleChange(() => pushThemeToPanel());
  }

  // Called by the terminal lifecycle when a pane disappears. The pane's own bar
  // went with it; only the panel's remembered results need pruning.
  function notifyTerminalClosed(id) {
    pruneClosedPane(id);
  }

  // Drops a closed pane's matches from every group's remembered search. The
  // group keeps its query and options so the panel falls back to "no matches"
  // instead of listing rows that can no longer be jumped to.
  function pruneClosedPane(id) {
    let activeChanged = false;
    for (const [groupId, entry] of groupResults) {
      const groups = entry.results.groups;
      if (!groups.some((g) => g.terminalId === id)) continue;
      const kept = groups.filter((g) => g.terminalId !== id);
      let total = 0;
      for (const g of kept) total += g.matches.length;
      entry.results = { ...entry.results, groups: kept, total, truncated: total >= MATCH_LIMIT };
      if (groupId === state.activeGroupId) activeChanged = true;
    }
    if (activeChanged) pushGroupState();
  }

  // ─── Expose ─────────────────────────────────────────────────────────────────
  App.Search = {
    init,
    handleShortcut,
    toggleFindBar, openFindBar, closeFindBar,
    openSearchPanel, runPanelSearch, jumpToMatch, clearPanelHighlights,
    pushThemeToPanel, notifyTerminalClosed,
    onActiveGroupChanged, onGroupDeleted,
    // exported for tests
    visibleTerminals, scanPane, MATCH_LIMIT,
  };
})();

export {};
