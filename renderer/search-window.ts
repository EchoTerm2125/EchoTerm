/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Search panel window
   UI-only: it renders the result list and relays "run" / "jump" to the main
   window's renderer through the main process, because the terminal buffers
   that searching reads live only in the main window.
   ═══════════════════════════════════════════════════════════════════════════ */

import type { SearchMatch, SearchPanelLabels, SearchPanelTheme, SearchResults } from '../shared/ipc';

interface SearchApi {
  init(): Promise<SearchPanelTheme>;
  run(query: string): Promise<SearchResults>;
  jump(match: SearchMatch): void;
  close(): void;
  onTheme(callback: (info: SearchPanelTheme) => void): () => void;
}

(function () {
  'use strict';
  const api = (window as unknown as { searchApi: SearchApi }).searchApi;

  let labels: Partial<SearchPanelLabels> = {};

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
    if (!query) { renderMessage(labels.empty || ''); return; }
    Promise.resolve(api.run(query)).then(renderResults).catch(() => renderMessage(labels.noResults || ''));
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

    // Subscribe before asking for the current theme so no update is missed.
    api.onTheme(applyTheme);
    api.init().then(applyTheme).catch(() => {});
    renderMessage(labels.empty || '');
    if (input) input.focus();
  }

  document.addEventListener('DOMContentLoaded', init);
})();

export {};
