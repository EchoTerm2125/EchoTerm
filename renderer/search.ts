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

  // Remembered find-bar query per pane, so reopening restores what was searched.
  const findMemory = new Map(); // terminalId -> { query, caseSensitive, wholeWord }

  let activePaneId = null;
  let findOpen = false;
  let debounceTimer = null;

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
      addon.onDidChangeResults((e) => {
        if (findOpen && ts.id === activePaneId) updateCount(e);
      });
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

  // ─── Find bar ──────────────────────────────────────────────────────────────
  function findBarEl() { return document.getElementById('findBar'); }
  function findInput() { return document.getElementById('findBarInput') as HTMLInputElement | null; }

  function currentFindTarget() {
    if (state.terminals.has(state.activeTerminalId)) return state.activeTerminalId;
    const ids = App.Groups.getGroupTerminalIds(state.activeGroupId);
    return ids.find((id) => state.terminals.has(id)) || null;
  }

  function memoryFor(id) {
    if (!findMemory.has(id)) {
      findMemory.set(id, { query: '', caseSensitive: false, wholeWord: false });
    }
    return findMemory.get(id);
  }

  function findOptions(mem) {
    return {
      caseSensitive: mem.caseSensitive,
      wholeWord: mem.wholeWord,
      incremental: false,
      decorations: decorations('bar'),
    };
  }

  function toggleFindBar() {
    if (findOpen) closeFindBar();
    else openFindBar();
  }

  function openFindBar() {
    const id = currentFindTarget();
    if (!id) return;
    activePaneId = id;
    const bar = findBarEl();
    const input = findInput();
    if (!bar || !input) return;

    const mem = memoryFor(id);
    bar.classList.remove('hidden');
    findOpen = true;
    input.value = mem.query;
    input.focus();
    input.select();
    syncToggles(mem);
    if (mem.query) runFind('first');
    else updateCount(null);
  }

  function closeFindBar() {
    if (!findOpen) return;
    if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
    const bar = findBarEl();
    if (bar) bar.classList.add('hidden');
    clearBarDecorations();
    findOpen = false;
    const id = activePaneId;
    activePaneId = null;
    if (id && state.terminals.has(id)) App.Terminal.refocus(id);
  }

  function clearBarDecorations() {
    for (const [, ts] of state.terminals) {
      const addon = ts._searchBar;
      if (!addon) continue;
      try { addon.clearDecorations(); } catch { /* pane not ready */ }
    }
  }

  function syncToggles(mem) {
    const caseBtn = document.getElementById('findBarCase');
    const wordBtn = document.getElementById('findBarWord');
    if (caseBtn) caseBtn.classList.toggle('active', mem.caseSensitive);
    if (wordBtn) wordBtn.classList.toggle('active', mem.wholeWord);
  }

  // direction: 'first' re-runs from the top of the buffer, otherwise it walks
  // from the current match.
  function runFind(direction) {
    if (!findOpen || !activePaneId) return;
    const ts = state.terminals.get(activePaneId);
    const input = findInput();
    if (!ts || !input) { closeFindBar(); return; }

    const mem = memoryFor(activePaneId);
    mem.query = input.value;
    findMemory.set(activePaneId, mem);

    const addon = getAddon(ts, 'bar');
    if (!addon) return;
    const opts = findOptions(mem);

    try {
      if (direction === 'first') addon.clearDecorations();
      if (!mem.query) { addon.clearDecorations(); updateCount(null); return; }
      if (direction === 'prev') addon.findPrevious(mem.query, opts);
      else addon.findNext(mem.query, opts);
    } catch { /* pane not ready */ }
  }

  function updateCount(e) {
    const el = document.getElementById('findBarCount');
    if (!el) return;
    if (!e || !e.resultCount) { el.textContent = findInput() && findInput()!.value ? App.__('findNoResults') : ''; return; }
    const idx = e.resultIndex >= 0 ? e.resultIndex + 1 : '?';
    el.textContent = `${idx}/${e.resultCount}`;
  }

  function bindFindBarEvents() {
    const input = findInput();
    const prev = document.getElementById('findBarPrev');
    const next = document.getElementById('findBarNext');
    const caseBtn = document.getElementById('findBarCase');
    const wordBtn = document.getElementById('findBarWord');
    const closeBtn = document.getElementById('findBarClose');
    if (!input) return;

    input.addEventListener('input', () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => { debounceTimer = null; runFind('first'); }, DEBOUNCE_MS);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); runFind(e.shiftKey ? 'prev' : 'next'); return; }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeFindBar(); }
    });

    if (prev) prev.addEventListener('click', () => runFind('prev'));
    if (next) next.addEventListener('click', () => runFind('next'));
    if (caseBtn) caseBtn.addEventListener('click', () => {
      if (!activePaneId) return;
      const mem = memoryFor(activePaneId);
      mem.caseSensitive = !mem.caseSensitive;
      syncToggles(mem);
      runFind('first');
    });
    if (wordBtn) wordBtn.addEventListener('click', () => {
      if (!activePaneId) return;
      const mem = memoryFor(activePaneId);
      mem.wholeWord = !mem.wholeWord;
      syncToggles(mem);
      runFind('first');
    });
    if (closeBtn) closeBtn.addEventListener('click', () => closeFindBar());
  }

  // ─── Search panel ──────────────────────────────────────────────────────────
  // Scope: the panes currently on screen — every pane of the active group in
  // echo mode, otherwise just the active pane.
  function visibleTerminals() {
    const ids = state.echoModeActive
      ? App.Groups.getGroupTerminalIds(state.activeGroupId)
      : [state.activeTerminalId];
    return ids.map((id) => state.terminals.get(id)).filter(Boolean);
  }

  function paneLabel(ts) {
    return ts.customName || App.getShellName(ts.shell);
  }

  function isWholeWord(text, idx, len) {
    const before = idx > 0 ? text[idx - 1] : '';
    const after = idx + len < text.length ? text[idx + len] : '';
    return (!before || !WORD_CHAR.test(before)) && (!after || !WORD_CHAR.test(after));
  }

  // Reads a pane's buffer and returns its matches. The addon only reports
  // counts, so the results list needs its own scan over the buffer lines.
  function scanPane(ts, query, options, remaining) {
    const matches = [];
    const buffer = ts.term && ts.term.buffer && ts.term.buffer.active;
    if (!buffer) return matches;
    const needle = options.caseSensitive ? query : query.toLowerCase();
    if (!needle) return matches;

    const total = buffer.length;
    for (let row = 0; row < total && matches.length < remaining; row++) {
      const line = buffer.getLine(row);
      if (!line) continue;
      const text = line.translateToString(true);
      if (!text) continue;
      const hay = options.caseSensitive ? text : text.toLowerCase();
      const preview = text.trim().slice(0, PREVIEW_LEN);
      let from = 0;
      while (matches.length < remaining) {
        const idx = hay.indexOf(needle, from);
        if (idx === -1) break;
        if (!options.wholeWord || isWholeWord(text, idx, needle.length)) {
          matches.push({ terminalId: ts.id, line: row, col: idx, length: needle.length, text: preview });
        }
        from = idx + needle.length;
      }
    }
    return matches;
  }

  const PANEL_OPTIONS = { caseSensitive: false, wholeWord: false };

  function runPanelSearch(query) {
    const panes = visibleTerminals();
    const groups = [];
    let total = 0;
    let truncated = false;

    for (const ts of panes) {
      const remaining = MATCH_LIMIT - total;
      const matches = remaining > 0 ? scanPane(ts, query, PANEL_OPTIONS, remaining) : [];
      total += matches.length;
      if (total >= MATCH_LIMIT) truncated = true;

      // Highlight this pane's matches with the panel's own decorations.
      const addon = getAddon(ts, 'panel');
      if (addon && query) {
        try {
          addon.clearDecorations();
          addon.findNext(query, { ...PANEL_OPTIONS, decorations: decorations('panel') });
        } catch { /* pane not ready */ }
      }
      if (matches.length > 0 || panes.length === 1) {
        groups.push({ terminalId: ts.id, label: paneLabel(ts), matches });
      }
    }

    return { empty: panes.length === 0, groups, total, truncated, query };
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
      api.onPanelRun((requestId, query) => {
        let results;
        try {
          results = runPanelSearch(query);
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
      if (el.id !== 'findBar') return true;
    }
    return false;
  }

  function handleShortcut(allPanes) {
    if (allPanes) {
      if (!anyOverlayOpen()) openSearchPanel();
      return;
    }
    // The find bar itself is not an obstacle to Ctrl+F.
    if (!findOpen && anyOverlayOpen()) return;
    toggleFindBar();
  }

  function init() {
    bindFindBarEvents();
    bindPanelEvents();
    if (App.Theme && App.Theme.onThemeChange) App.Theme.onThemeChange(() => pushThemeToPanel());
    if (App.i18n && App.i18n.onLocaleChange) App.i18n.onLocaleChange(() => pushThemeToPanel());
  }

  // Called by the terminal lifecycle when a pane disappears so the find bar
  // never stays open over a dead pane.
  function notifyTerminalClosed(id) {
    if (activePaneId === id) closeFindBar();
  }

  // ─── Expose ─────────────────────────────────────────────────────────────────
  App.Search = {
    init,
    handleShortcut,
    toggleFindBar, openFindBar, closeFindBar,
    openSearchPanel, runPanelSearch, jumpToMatch, clearPanelHighlights,
    pushThemeToPanel, notifyTerminalClosed,
    // exported for tests
    visibleTerminals, scanPane, MATCH_LIMIT,
  };
})();

export {};
