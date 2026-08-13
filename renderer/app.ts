/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Application Orchestrator
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';
  const state = App.state;

  // Drain tracked IPC unsubscribers on window reload (e.g. dev Ctrl+R).
  window.addEventListener('beforeunload', () => {
    for (const unsub of state.dataUnsubscribers) {
      try { unsub(); } catch {}
    }
    state.dataUnsubscribers.length = 0;
  });

  async function init() {
    // ── Localize static DOM text ──
    if (App.i18n && App.i18n.localizeDom) App.i18n.localizeDom();

    // ── Populate shell icons from TAB_ICONS (single source of truth) ──
    App.UI.populateShellIcons();

    // ── Load shell info ──
    const info = await App.api.getDefaultShells();
    App.gitBashPath = info.gitBashPath;

    if (!App.gitBashPath) {
      App.gitBashStatus.textContent = App.__('gitBashNotFound');
      App.gitBashStatus.className = 'status-badge warning';
    }

    // ── Load saved shell preference ──
    const savedShell = localStorage.getItem('defaultShell');
    if (savedShell && App.SHELL_LABELS[savedShell]) {
      state.selectedShell = savedShell;
    }

    // ── Bootstrap ──
    App.Groups.createGroup(App.__('groupDefaultName', { n: 1 }), true);
    await App.Terminal.spawnTerminal(state.selectedShell);

    // ── Wire UI ──
    App.UI.bindToolbar();
    App.UI.bindSettings();
    App.UI.bindKeyboardShortcuts();
    App.UI.bindGlobalEvents();
    App.Menus.setupContextMenu();
    App.Menus.bindSubmenuHover();
    App.Echo.bindEchoControls();
    App.Groups.bindGroupBar();
    await App.SshPanel.init();

    // ── IPC listeners ──
    const unsubData = App.api.onData((id, data) => {
      const term = state.terminals.get(id);
      if (term) term.term.write(data);
      if (term) App.Terminal.noteOutput(id, data);
    });
    state.dataUnsubscribers.push(unsubData);

    const unsubExit = App.api.onExit((id) => {
      App.Terminal.handleTerminalExit(id);
    });
    state.dataUnsubscribers.push(unsubExit);

    // ── Single-instance warning (a second launch focuses this window) ──
    const unsubSingle = App.api.onSingleInstanceWarning(() => {
      App.UI.showToast(App.__('toastAlreadyRunning'));
    });
    state.dataUnsubscribers.push(unsubSingle);

    // ── Close confirmation dialog ──
    App.Menus.bindCloseConfirmDialog();

    // ── Locale change listener (re-render dynamic UI when language switches) ──
    App.i18n.onLocaleChange(() => {
      App.UI.updateStatusBar();
      App.Echo.setEchoButtonLabel(App.state.echoModeActive);
      if (App.state.echoModeActive) App.Echo.updateEchoAllButton();
      // Re-localize all DOM (catches data-i18n attributes on dynamic elements)
      App.i18n.localizeDom();
      // Refresh SSH sidebar tree and password icon
      if (App.SshPanel && App.SshPanel.refreshAll) App.SshPanel.refreshAll();
      if (App.SshPanel && App.SshPanel.updatePasswordIcon) App.SshPanel.updatePasswordIcon();
    });

    // ── Ready ──
    App.UI.updateStatusBar();

    // Auto-focus the initial terminal
    if (state.activeTerminalId) {
      const ts = state.terminals.get(state.activeTerminalId);
      if (ts) setTimeout(() => ts.term.focus(), 200);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();

export {};
