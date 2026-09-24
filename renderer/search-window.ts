/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Search panel window
   UI-only: it renders the result list and relays "run" / "jump" to the main
   window's renderer through the main process, because the terminal buffers
   that searching reads live only in the main window.
   ═══════════════════════════════════════════════════════════════════════════ */

import type {
  PanelGroupState,
  PanelSearchOptions,
  SearchMatch,
  SearchPanelLabels,
  SearchPanelTheme,
  SearchResults,
} from '../shared/ipc';

interface SearchApi {
  init(): Promise<SearchPanelTheme>;
  groupState(): Promise<PanelGroupState | null>;
  onShow(callback: (state: PanelGroupState | null) => void): () => void;
  run(query: string, options: PanelSearchOptions): Promise<SearchResults>;
  jump(match: SearchMatch): void;
  close(): void;
  onTheme(callback: (info: SearchPanelTheme) => void): () => void;
}

(function () {
  'use strict';
  const api = (window as unknown as { searchApi: SearchApi }).searchApi;

  let labels: Partial<SearchPanelLabels> = {};
  const options: PanelSearchOptions = { caseSensitive: false, wholeWord: false, regex: false };
  // A group-state push that arrives while the window is loading wins over the
  // state fetched at startup, which may be older.
  let gotGroupPush = false;

  const $ = (id: string) => document.getElementById(id);

  function applyTheme(info: SearchPanelTheme) {
    if (!info) return;
    if (info.labels) labels = info.labels;
    const theme = info.theme === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;

    const titleLabel = $('panelTitleLabel');
    const input = $('panelInput') as HTMLInputElement | null;
    const run = $('panelRun');
    const hint = $('panelHint');
    const close = $('panelClose');
    const docTitle = $('panelTitle');
    if (titleLabel) titleLabel.textContent = labels.title || 'Search';
    if (docTitle) docTitle.textContent = labels.title || 'Search';
    if (input) input.placeholder = labels.placeholder || '';
    if (run) run.textContent = labels.run || 'Search';
    if (hint) hint.textContent = labels.hint || '';
    if (close) close.title = labels.closeTitle || 'Close';

    const caseBtn = $('panelCase');
    const wordBtn = $('panelWord');
    const regexBtn = $('panelRegex');
    if (caseBtn) caseBtn.title = labels.caseTitle || '';
    if (wordBtn) wordBtn.title = labels.wordTitle || '';
    if (regexBtn) regexBtn.title = labels.regexTitle || '';
  }

  function syncToggles() {
    const caseBtn = $('panelCase');
    const wordBtn = $('panelWord');
    const regexBtn = $('panelRegex');
    if (caseBtn) caseBtn.classList.toggle('active', options.caseSensitive);
    if (wordBtn) wordBtn.classList.toggle('active', options.wholeWord);
    if (regexBtn) regexBtn.classList.toggle('active', options.regex);
  }

  function renderMessage(text: string) {
    const container = $('panelResults');
    if (!container) return;
    container.textContent = '';
    const div = document.createElement('div');
    div.className = 'panel-empty';
    div.textContent = text;
    container.appendChild(div);
  }

  function renderResults(results: SearchResults) {
    const container = $('panelResults');
    if (!container) return;
    container.textContent = '';

    if (!results) { renderMessage(labels.empty || ''); return; }
    if (results.empty) { renderMessage(labels.empty || ''); return; }
    if (results.total === 0) { renderMessage(labels.noResults || ''); return; }

    for (const group of results.groups) {
      if (!group.matches.length) continue;
      const section = document.createElement('div');
      section.className = 'panel-group';

      const header = document.createElement('div');
      header.className = 'panel-group-header';
      const label = document.createElement('span');
      label.textContent = group.label;
      const count = document.createElement('span');
      count.className = 'panel-group-count';
      count.textContent = `(${group.matches.length})`;
      header.appendChild(label);
      header.appendChild(count);
      section.appendChild(header);

      for (const match of group.matches) {
        const row = document.createElement('button');
        row.className = 'panel-match';
        row.title = match.text;

        const lineNo = document.createElement('span');
        lineNo.className = 'panel-match-line';
        lineNo.textContent = `${match.line + 1}`;
        row.appendChild(lineNo);

        const text = document.createElement('span');
        text.textContent = match.text;
        row.appendChild(text);

        row.addEventListener('click', () => api.jump(match));
        section.appendChild(row);
      }
      container.appendChild(section);
    }

    if (results.truncated && labels.truncated) {
      const note = document.createElement('div');
      note.className = 'panel-empty';
      note.textContent = labels.truncated;
      container.appendChild(note);
    }
  }

  function runSearch() {
    const input = $('panelInput') as HTMLInputElement | null;
    const query = input ? input.value : '';
    if (!query) {
      // Nothing to search for: clear the list instead of showing the "no tab
      // opened" empty state, which would be misleading with tabs open.
      const container = $('panelResults');
      if (container) container.textContent = '';
      return;
    }
    Promise.resolve(api.run(query, { ...options })).then(renderResults).catch(() => renderMessage(labels.noResults || ''));
  }

  // A group's remembered search: its query, toggles and result list. Null means
  // the group has never been searched, so the panel resets to the empty state.
  function applyGroupState(state: PanelGroupState | null) {
    const input = $('panelInput') as HTMLInputElement | null;
    if (!state) {
      if (input) input.value = '';
      options.caseSensitive = false;
      options.wholeWord = false;
      options.regex = false;
      syncToggles();
      renderMessage(labels.empty || '');
      return;
    }
    if (input) input.value = state.query || '';
    const saved = state.options || { caseSensitive: false, wholeWord: false, regex: false };
    options.caseSensitive = !!saved.caseSensitive;
    options.wholeWord = !!saved.wholeWord;
    options.regex = !!saved.regex;
    syncToggles();
    renderResults(state.results);
  }

  function bindToggle(id: string, key: keyof PanelSearchOptions) {
    const btn = $(id);
    if (!btn) return;
    btn.addEventListener('click', () => {
      options[key] = !options[key];
      syncToggles();
      // Re-run so the list reflects the new matching immediately.
      const input = $('panelInput') as HTMLInputElement | null;
      if (input && input.value) runSearch();
    });
  }

  function init() {
    const input = $('panelInput') as HTMLInputElement | null;
    const runBtn = $('panelRun');
    const closeBtn = $('panelClose');

    if (runBtn) runBtn.addEventListener('click', runSearch);
    if (closeBtn) closeBtn.addEventListener('click', () => api.close());
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); runSearch(); }
        else if (e.key === 'Escape') { e.preventDefault(); api.close(); }
      });
    }
    // A button takes focus on mouse-down, and a focused button is activated by
    // Space — so without this, clicking a control would make the next Space
    // re-run it instead of reaching the input. Keep the focus where it was;
    // Tab + Space still activate a button reached by keyboard.
    document.addEventListener('mousedown', (e) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest('button')) e.preventDefault();
    });
    bindToggle('panelCase', 'caseSensitive');
    bindToggle('panelWord', 'wholeWord');
    bindToggle('panelRegex', 'regex');
    syncToggles();

    // Subscribe before asking for anything so no update is missed.
    api.onTheme(applyTheme);
    api.onShow((state) => {
      gotGroupPush = true;
      applyGroupState(state);
    });
    api.init()
      .then((theme) => {
        applyTheme(theme);
        return api.groupState();
      })
      .then((state) => {
        if (!gotGroupPush) applyGroupState(state);
      })
      .catch(() => {});

    renderMessage(labels.empty || '');
    if (input) input.focus();
  }

  document.addEventListener('DOMContentLoaded', init);
})();

export {};
