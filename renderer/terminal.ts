/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Terminal Lifecycle
   ═══════════════════════════════════════════════════════════════════════════ */

import './theme';
import './icons';

(function () {
  'use strict';
  const state = App.state;
  const api = App.api;

  let lastAutoRespawnAt = 0; // debounce auto-respawn to avoid a spawn→exit loop
  let _pasteEscHandler = null; // current paste-preview document keydown handler
  // Restore builds its Panes before it is ready to connect any of them; while
  // this is set, becoming visible must not start a session.
  let _suppressAutoConnect = false;

  // ─── Pane mounting ─────────────────────────────────────────────────────────
  // A Pane's tab, box and xterm exist from the moment the Pane does. Only a live
  // Pane has a session behind it: a Dormant pane (Restore) starts one on Connect
  // or the first time it becomes visible. Both paths share this builder so their
  // DOM and event wiring cannot drift apart.

  function mountPane(spec) {
    const id = spec.id;
    const shell = spec.shell;
    const dormant = !!spec.dormant;
    const label = spec.label || null;
    const host = spec.host || null;
    const username = spec.username || null;
    const connectionId = spec.connectionId || null;
    const groupId = spec.groupId || state.activeGroupId;

    const paneEl = document.createElement('div');
    paneEl.className = dormant ? 'pane pane-dormant' : 'pane';
    paneEl.dataset.termId = String(id);

    // Title bar — a Dormant pane offers Connect where a live SSH pane offers
    // Reconnect, and a local Pane offers neither.
    const titlebar = document.createElement('div');
    titlebar.className = 'pane-titlebar';
    const hasConnectControl = shell === 'ssh' || dormant;
    titlebar.innerHTML = `
      <span class="pane-label">${shell === 'ssh' ? '🖥️ ' : ''}<span class="pane-name"></span></span>
      ${hasConnectControl
        ? `<button class="pane-reconnect" data-i18n-title="${dormant ? 'paneConnectTitle' : 'paneReconnectTitle'}" title="${dormant ? 'Connect' : 'Reconnect'}">${dormant ? App.Icons.play : App.Icons.refresh}</button>`
        : ''}
      <button class="pane-paste" data-i18n-title="panePasteTitle" title="Paste">${App.Icons.clipboard}</button>
      <label class="pane-checkbox" data-i18n-title="paneEchoTitle" title="Echo input to this terminal" style="display:none">
        <input type="checkbox" />
        <span data-i18n="paneEchoLabel">Echo</span>
      </label>
      <button class="pane-close" data-i18n-title="paneCloseTitle" title="Close">×</button>
    `;
    paneEl.appendChild(titlebar);

    // xterm container
    const xtermDiv = document.createElement('div');
    xtermDiv.className = 'xterm-container';
    paneEl.appendChild(xtermDiv);

    if (dormant) {
      const notice = document.createElement('div');
      notice.className = 'pane-dormant-notice';
      notice.textContent = App.__('paneDormantNotice');
      paneEl.appendChild(notice);
    }

    // Initialize xterm
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontSize: App.Theme.getTermFontSize(),
      scrollback: App.Theme.getMaxRetainedLines(),
      fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', 'Courier New', 'Microsoft YaHei', 'Noto Sans Mono CJK SC', 'Noto Sans CJK SC', 'PingFang SC', 'WenQuanYi Micro Hei', monospace",
      bracketedPasteMode: true,
      // Reflow the line under the cursor on resize (default is to truncate it).
      // Echo-mode grid resizes constantly; truncating the input line corrupts
      // long commands so copying the wrapped text yields stray newlines.
      reflowCursorLine: true,
      // Required by @xterm/addon-search's decorations (registerDecoration is
      // still an experimental xterm API).
      allowProposedApi: true,
      theme: App.Theme.getXtermTheme(),
    } as any);

    const FitAddonClass: any = FitAddon.FitAddon || FitAddon;
    const fitAddon = new FitAddonClass();
    term.loadAddon(fitAddon);
    term.open(xtermDiv);

    // Intercept paste event for multi-line preview / echo paste-all
    xtermDiv.addEventListener('paste', (e) => {
      if (fromFindBar(e)) return;
      // Normalize here, not just in pasteToTerminal(): the echo-mode branch below
      // writes this text straight to the pty and never passes through
      // pasteToTerminal(), so this is its only CRLF guard.
      const text = normalizeNewlines(e.clipboardData ? e.clipboardData.getData('text') : '');
      if (!text) return;
      if (state.echoModeActive) {
        e.preventDefault();
        e.stopPropagation();
        if (text.includes('\n') && localStorage.getItem('skipPastePreview') !== 'true') showPastePreview(null, text);
        else for (const bid of state.echoSelection) api.write(bid, bracketFor(bid, text));
        return;
      }
      if (text.includes('\n')) {
        e.preventDefault();
        e.stopPropagation();
        if (localStorage.getItem('skipPastePreview') === 'true') pasteToTerminal(id, text);
        else showPastePreview(id, text);
      }
    }, true);

    // Right-click copy/paste
    xtermDiv.addEventListener('contextmenu', (e) => {
      if (fromFindBar(e)) return;
      if (localStorage.getItem('skipRightClickPaste') !== 'false') return; // show normal menu
      e.preventDefault();
      e.stopImmediatePropagation();
      const sel = term.getSelection();
      if (sel) {
        const out = trimSelection(sel);
        if (out) navigator.clipboard.writeText(out).catch(() => {});
        term.clearSelection();
        term.focus();
      } else {
        pasteToTerminal(state.echoModeActive ? null : id);
      }
    }, true);

    term.onResize(({ cols, rows }) => { api.resize(id, cols, rows); });

    const termState = {
      id, shell, term, fitAddon, paneEl, titlebar,
      customName: spec.customName || (shell === 'ssh' ? label : null),
      label, host, username, connectionId,
      outBuf: '', pwPrompt: false, _reconnecting: false,
      _dormant: dormant,
      // A restored Pane rejoins the Echo selection once its session is up.
      _restoreEcho: !!spec.echo,
    };
    state.terminals.set(id, termState);
    state.paneOrder.push(id);
    if (!dormant) state.activeTerminalId = id;
    renderPaneTitle(termState);

    // A live SSH pane with no Connection to reconnect to keeps the button away.
    const reconnectBtn = titlebar.querySelector('.pane-reconnect');
    if (shell === 'ssh' && !dormant && !connectionId && reconnectBtn) {
      reconnectBtn.style.display = 'none';
    }

    state.terminalGroups.set(id, groupId);
    if (state.groups.has(groupId)) {
      state.groups.get(groupId).terminalIds.add(id);
    }
    App.Groups.updateGroupTabs();

    App.container.appendChild(paneEl);

    term.onData((data) => {
      // A Dormant pane has nothing to write to; its keystrokes are not queued.
      const live = state.terminals.get(id);
      if (!live || live._dormant) return;
      if (state.echoModeActive) {
        if (state.echoSelection.has(id)) {
          api.write(id, data);
          for (const bid of state.echoSelection) {
            if (bid !== id) api.write(bid, data);
          }
        }
      } else {
        api.write(id, data);
      }
    });

    setTimeout(() => fitAddon.fit(), 50);

    // Titlebar events
    const checkbox = titlebar.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        state.echoSelection.add(id);
        paneEl.classList.add('echo-selected');
        titlebar.querySelector('.pane-checkbox').classList.add('selected');
        App.Terminal.focusTerminal(id);
        App.Echo.refocusEchoTerminal();
      } else {
        state.echoSelection.delete(id);
        paneEl.classList.remove('echo-selected');
        titlebar.querySelector('.pane-checkbox').classList.remove('selected');
        App.Echo.refocusEchoTerminal();
      }
      if (state.echoModeActive) App.Echo.updateEchoAllButton();
      App.UI.updateStatusBar();
    });

    titlebar.querySelector('.pane-close').addEventListener('click', () => closeTerminal(id));

    if (reconnectBtn) {
      reconnectBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const current = state.terminals.get(id);
        if (current && current._dormant) {
          const connected = await connectPane(id);
          if (connected) focusTerminal(id);
          return;
        }
        requestReconnect(id);
      });
    }

    titlebar.querySelector('.pane-paste').addEventListener('click', (e) => {
      e.stopPropagation();
      pasteToTerminal(id);
    });

    paneEl.addEventListener('click', (e) => {
      if (e.target.closest('.pane-checkbox') || e.target.closest('.pane-close') ||
          e.target.closest('.pane-paste') || e.target.closest('.pane-reconnect')) return;
      if (state.echoModeActive) {
        // A title-bar click is enable-then-activate: a deselected terminal is
        // added to the echo selection (never removed) and made the active
        // terminal. Body clicks on a deselected terminal remain a dead zone.
        if (e.target.closest('.pane-titlebar')) {
          App.Echo.enableEchoOnTerminal(id);
          focusTerminal(id);
          return;
        }
        if (!state.echoSelection.has(id)) return;
      }
      focusTerminal(id);
    });

    // A double click on the title bar makes echo exclusive to this terminal:
    // it is enabled and every other terminal in the group is disabled.
    paneEl.addEventListener('dblclick', (e) => {
      if (e.target.closest('.pane-checkbox') || e.target.closest('.pane-close') ||
          e.target.closest('.pane-paste') || e.target.closest('.pane-reconnect')) return;
      if (!state.echoModeActive) return;
      if (!e.target.closest('.pane-titlebar')) return;
      App.Echo.soloEchoOnTerminal(id);
      focusTerminal(id);
    });

    App.Menus.bindContextMenu(paneEl, id);
    App.Tabs.addTab(id, shell, paneName(termState), connectionIdentity(termState));

    if (!dormant && state.echoModeActive) {
      state.echoSelection.add(id);
      paneEl.classList.add('echo-selected');
      const chk = titlebar.querySelector('input[type="checkbox"]');
      if (chk) chk.checked = true;
      const cbLabel = titlebar.querySelector('.pane-checkbox');
      if (cbLabel) { cbLabel.style.display = ''; cbLabel.classList.add('selected'); }
    }

    return termState;
  }

  // ─── Spawn terminal ─────────────────────────────────────────────────────────
  async function spawnTerminal(shell) {
    const shellKey = shell || state.selectedShell;

    if (shellKey === 'gitbash' && !App.gitBashPath) {
      const located = await App.UI.promptLocateGitBash();
      if (!located) {
        App.UI.showToast(App.__('toastGitBashNotFound'));
        return null;
      }
    }

    const result = await api.spawnTerminal(shellKey);
    if (result.error) {
      App.UI.showToast(App.__('toastError', { message: connectErrorText(shellKey, result) }));
      return null;
    }

    const termState = mountPane({ id: result.id, shell: shellKey });
    afterLiveMount(termState);
    return result.id;
  }

  // A live Pane's post-mount behaviour: reveal it, then focus and size it.
  function afterLiveMount(termState) {
    const id = termState.id;
    if (state.echoModeActive) {
      showAllPanes();
      App.Echo.applyGridLayout();
    } else if (!state.splitInstance && state.gridSplits.length === 0) {
      setSinglePane(id);
    }
    focusTerminal(id);
    setTimeout(() => termState.fitAddon.fit(), 300);
    App.UI.updateStatusBar();
  }

  // ─── Dormant panes ─────────────────────────────────────────────────────────
  // A Dormant pane has an id but no session. Connecting it starts one under that
  // same id, so tabs, echo selection and search keep working unchanged.

  function setConnectBusy(termState, busy) {
    const btn = termState.titlebar.querySelector('.pane-reconnect');
    if (btn) btn.disabled = !!busy;
  }

  function connectErrorText(shellKey, result) {
    if (result.errorCode === 'GIT_BASH_NOT_FOUND') return App.__('toastGitBashNotFound');
    if (result.errorCode === 'UNKNOWN_SHELL') return App.__('errorUnknownShell', { shell: shellKey });
    if (result.errorCode === 'CONNECTION_NOT_FOUND' || result.errorCode === 'SESSION_NOT_FOUND') {
      return App.__('errorConnectionNotFound');
    }
    if (result.errorCode === 'SESSION_CONFIG_FAILED') return App.__('errorSessionConfig');
    if (result.errorCode === 'JUMP_CHAIN_INVALID') return App.__('errorJumpChainInvalid');
    return result.error;
  }

  // Returns true when the Pane is live afterwards. Failures are reported here:
  // both the Connect button and Reconnect drive this path.
  async function connectPane(id) {
    const termState = state.terminals.get(id);
    if (!termState || !termState._dormant || termState._connecting) return false;

    termState._connecting = true;
    setConnectBusy(termState, true);

    const fail = (message) => {
      const current = state.terminals.get(id);
      if (current) {
        current._connecting = false;
        setConnectBusy(current, false);
      }
      App.UI.showToast(App.__(
        termState.shell === 'ssh' ? 'toastSshError' : 'toastError',
        { message },
      ));
      return false;
    };

    try {
      if (termState.shell === 'gitbash' && !App.gitBashPath) {
        const located = await App.UI.promptLocateGitBash();
        if (!located) {
          const current = state.terminals.get(id);
          if (current) { current._connecting = false; setConnectBusy(current, false); }
          App.UI.showToast(App.__('toastGitBashNotFound'));
          return false;
        }
      }

      const result = termState.shell === 'ssh'
        ? await api.sshConnect(termState.connectionId, id)
        : await api.spawnTerminal(termState.shell, id);

      if (result && result.error) return fail(connectErrorText(termState.shell, result));

      const current = state.terminals.get(id);
      if (!current) return false; // Pane closed while connecting
      current._connecting = false;
      setConnectBusy(current, false);
      markPaneLive(current, result);
      return true;
    } catch (err) {
      return fail((err && err.message) || String(err));
    }
  }

  // Turn a Dormant pane into a live one, keeping its id, tab and displayed text.
  function markPaneLive(termState, result) {
    termState._dormant = false;
    termState._exited = false;
    termState.paneEl.classList.remove('pane-dormant');
    const notice = termState.paneEl.querySelector('.pane-dormant-notice');
    if (notice) notice.remove();

    const reconnectBtn = termState.titlebar.querySelector('.pane-reconnect');
    if (reconnectBtn) {
      // A local Pane has nothing to reconnect to; the control was only there
      // because this Pane arrived Dormant.
      if (termState.shell !== 'ssh') {
        reconnectBtn.style.display = 'none';
      } else {
        reconnectBtn.setAttribute('data-i18n-title', 'paneReconnectTitle');
        reconnectBtn.title = App.__('paneReconnectTitle');
      }
    }

    if (termState.shell === 'ssh' && result) {
      termState.label = result.label || termState.label;
      termState.host = result.host || termState.host;
      if (result.username !== undefined) termState.username = result.username;
      if (!termState.connectionId && result.connectionId) termState.connectionId = result.connectionId;
    }

    renderPaneTitle(termState);
    App.Tabs.refreshTitle(termState);

    // The Echo selection is restored per Pane, but only once a session exists:
    // a Dormant pane must never receive echo input it cannot deliver.
    if (state.echoModeActive && termState._restoreEcho &&
        state.terminalGroups.get(termState.id) === state.activeGroupId) {
      App.Echo.enableEchoOnTerminal(termState.id);
    }
    delete termState._restoreEcho;

    // The session spawned at the pty's default 80x24: fit() only resizes when
    // the xterm's own dimensions change, which a Pane fitted before it had a
    // session never does. Send the pane's geometry explicitly.
    setTimeout(() => {
      termState.fitAddon.fit();
      api.resize(termState.id, termState.term.cols, termState.term.rows);
    }, 50);
    App.UI.updateStatusBar();
  }

  // Connect every Dormant pane of the Active group that is currently shown.
  function autoConnectVisible() {
    if (_suppressAutoConnect) return;
    const activeGroup = state.activeGroupId;
    for (const [id, t] of state.terminals) {
      if (!t._dormant) continue;
      if (state.terminalGroups.get(id) !== activeGroup) continue;
      if (t.paneEl.style.display === 'none') continue;
      connectPane(id);
    }
  }

  // ─── SSH Terminal Spawning ─────────────────────────────────────────────────
  async function spawnSshTerminal(spawnResult) {
    const termState = mountPane({
      id: spawnResult.id,
      shell: 'ssh',
      label: spawnResult.label,
      host: spawnResult.host,
      username: spawnResult.username,
      connectionId: spawnResult.connectionId,
    });
    afterLiveMount(termState);
    return spawnResult.id;
  }

  function focusTerminal(id) {
    const termState = state.terminals.get(id);
    if (!termState) return;
    state.activeTerminalId = id;

    const activeGroup = state.activeGroupId;
    for (const [tid, t] of state.terminals) {
      if (state.terminalGroups.get(tid) !== activeGroup) continue;
      t.paneEl.style.opacity = tid === id ? '1' : '0.85';
    }

    if (!state.splitInstance && state.gridSplits.length === 0) {
      showOnlyPane(id);
      const t = state.terminals.get(id);
      if (t) setTimeout(() => t.fitAddon.fit(), 100);
    }

    setTimeout(() => {
      if (!state.isRenaming) termState.term.focus();
    }, 20);
    App.Tabs.updateTabSelection(id);
    autoConnectVisible();
    App.Session?.scheduleSave?.();
  }

  function closeTerminal(id) {
    const termState = state.terminals.get(id);
    if (!termState) return;

    const groupId = state.terminalGroups.get(id);

    api.killTerminal(id);
    termState.term.dispose();
    termState.paneEl.remove();
    App.Tabs.removeTab(id);
    state.echoSelection.delete(id);
    state.selectedTabs.delete(id);
    state.terminals.delete(id);
    if (App.Search) App.Search.notifyTerminalClosed(id);

    const grpId = state.terminalGroups.get(id);
    if (grpId && state.groups.has(grpId)) {
      state.groups.get(grpId).terminalIds.delete(id);
    }
    state.terminalGroups.delete(id);
    App.Groups.updateGroupTabs();

    const idx = state.paneOrder.indexOf(id);
    if (idx !== -1) state.paneOrder.splice(idx, 1);
    const remaining = state.paneOrder.length;

    if (remaining <= 1 && (state.splitInstance || state.gridSplits.length > 0)) {
      App.Echo.destroyGrid();
      if (state.echoModeActive) {
        state.echoModeActive = false;
        App.Echo.setEchoButtonLabel(false);
        App.tabList.style.display = '';
        setEchoCheckboxesVisible(false);
        state.echoSelection.clear();
      }
      if (remaining === 1) setSinglePane(state.paneOrder[0]);
    } else if (remaining > 1 && state.echoModeActive) {
      App.Echo.applyGridLayout();
    }

    if (state.activeTerminalId === id) {
      const sameGroup = state.paneOrder.filter(
        pid => pid !== id && state.terminalGroups.get(pid) === groupId);
      if (sameGroup.length > 0) {
        focusTerminal(sameGroup[0]);
      } else {
        state.activeTerminalId = null;
      }
    }
    App.UI.updateStatusBar();
    App.Session?.scheduleSave?.();
  }

  function handleTerminalExit(id) {
    const termState = state.terminals.get(id);
    if (!termState) return;

    // SSH terminals: keep pane visible so user can see error output
    if (termState.shell === 'ssh') {
      markSshPaneExited(termState);
      App.UI.updateStatusBar();
      return;
    }

    if (state.terminals.size <= 1) {
      App.UI.showToast(App.__('toastTerminalExited'));
      termState.term.dispose();
      termState.paneEl.remove();
      state.terminals.delete(id);
      state.paneOrder = [];
      if (App.Search) App.Search.notifyTerminalClosed(id);
      const now = Date.now();
      if (now - lastAutoRespawnAt >= 1500) {
        lastAutoRespawnAt = now;
        spawnTerminal(state.selectedShell);
      } else {
        lastAutoRespawnAt = now; // suppress rapid auto-respawn loop
      }
      return;
    }

    termState.term.dispose();
    termState.paneEl.remove();
    App.Tabs.removeTab(id);
    state.echoSelection.delete(id);
    state.selectedTabs.delete(id);
    state.terminals.delete(id);
    if (App.Search) App.Search.notifyTerminalClosed(id);

    const groupId = state.terminalGroups.get(id);
    if (groupId && state.groups.has(groupId)) {
      state.groups.get(groupId).terminalIds.delete(id);
    }
    state.terminalGroups.delete(id);
    App.Groups.updateGroupTabs();

    const idx = state.paneOrder.indexOf(id);
    if (idx !== -1) state.paneOrder.splice(idx, 1);
    const remaining = state.paneOrder.length;

    if (remaining <= 1 && (state.splitInstance || state.gridSplits.length > 0)) {
      App.Echo.destroyGrid();
      if (remaining === 1) setSinglePane(state.paneOrder[0]);
    } else if (remaining > 1 && state.echoModeActive) {
      App.Echo.applyGridLayout();
    }

    if (state.activeTerminalId === id && remaining > 0) {
      const sameGroup = state.paneOrder.filter(
        pid => pid !== id && state.terminalGroups.get(pid) === groupId);
      if (sameGroup.length > 0) focusTerminal(sameGroup[0]);
      else state.activeTerminalId = null;
    }
    App.UI.updateStatusBar();
    App.Session?.scheduleSave?.();
  }

  // ─── SSH pane state ────────────────────────────────────────────────────────
  // A pane whose session ended is kept (so its output stays readable) until it
  // is dismissed or reconnected.

  function markSshPaneExited(termState) {
    const next = { ...termState, _exited: true };
    state.terminals.set(next.id, next);
    const label = next.titlebar.querySelector('.pane-label');
    if (label) label.style.color = 'var(--text-muted)';
    const closeBtn = next.titlebar.querySelector('.pane-close');
    if (closeBtn) {
      closeBtn.setAttribute('data-i18n-title', 'paneDismissTitle');
      closeBtn.title = App.__('paneDismissTitle');
      closeBtn.style.color = 'var(--warning)';
    }
    renderPaneTitle(next);
  }

  function markSshPaneLive(termState) {
    const next = { ...termState, _exited: false };
    state.terminals.set(next.id, next);
    const label = next.titlebar.querySelector('.pane-label');
    if (label) label.style.color = '';
    const closeBtn = next.titlebar.querySelector('.pane-close');
    if (closeBtn) {
      closeBtn.setAttribute('data-i18n-title', 'paneCloseTitle');
      closeBtn.title = App.__('paneCloseTitle');
      closeBtn.style.color = '';
    }
    renderPaneTitle(next);
    return next;
  }

  // ─── Reconnect ─────────────────────────────────────────────────────────────
  // A Reconnect swaps the ssh process behind a pane's id, so the pane keeps its
  // xterm — and everything already displayed in it — and only the connection is
  // new.

  // Same error-code mapping the sidebar's connect path uses.
  function sshErrorText(result) {
    if (result.errorCode === 'CONNECTION_NOT_FOUND' || result.errorCode === 'SESSION_NOT_FOUND') {
      return App.__('errorConnectionNotFound');
    }
    if (result.errorCode === 'SESSION_CONFIG_FAILED') return App.__('errorSessionConfig');
    if (result.errorCode === 'JUMP_CHAIN_INVALID') return App.__('errorJumpChainInvalid');
    return result.error;
  }

  function setReconnectBusy(termState, busy) {
    const btn = termState.titlebar.querySelector('.pane-reconnect');
    if (btn) btn.disabled = !!busy;
  }

  // Replace the pane's session in place. UI-free: callers decide on confirms
  // and error reporting. `skipped` means there was nothing to reconnect.
  async function reconnectTerminal(id) {
    let termState = state.terminals.get(id);
    if (!termState) return { skipped: true };

    // A Dormant pane has nothing to replace: connecting it is the whole job.
    if (termState._dormant) {
      const connected = await connectPane(id);
      return connected ? { success: true } : { skipped: true };
    }

    if (termState.shell !== 'ssh' || !termState.connectionId) return { skipped: true };
    if (termState._reconnecting) return { skipped: true };

    termState._reconnecting = true;
    setReconnectBusy(termState, true);
    // Push the pane's content into the scrollback first: ConPTY renders the
    // replacement session's output against its own fresh buffer with absolute
    // cursor positions, so it must land on a blank viewport — otherwise those
    // writes shred whatever the pane is showing.
    termState.term.write('\x1b[999;1H' + '\n'.repeat(termState.term.rows));
    // The pane's current geometry travels with the request so the replacement
    // pty spawns at the right size — a resize after the fact would make ConPTY
    // repaint over the content this pane keeps.
    const { cols, rows } = termState.term;
    const size = Number.isInteger(cols) && cols > 0 && Number.isInteger(rows) && rows > 0
      ? { cols, rows }
      : undefined;
    let result;
    try {
      result = await api.sshReconnect(id, termState.connectionId, size);
    } catch (err) {
      // A rejected invoke must still clear the busy state below, or the pane's
      // Reconnect stays disabled for the rest of the session.
      result = { error: (err && err.message) || String(err) };
    }

    termState = state.terminals.get(id);
    if (!termState) return { skipped: true }; // pane closed while reconnecting
    termState._reconnecting = false;
    setReconnectBusy(termState, false);

    if (result && result.error) return { error: sshErrorText(result), errorCode: result.errorCode };

    const live = markSshPaneLive(termState);
    // Drop the superseded session's prompt/paste detection state. No resize
    // here: the replacement pty already spawned at the pane's geometry, and
    // any resize would make ConPTY repaint over the content this pane kept.
    live.outBuf = '';
    live.pwPrompt = false;
    if (live.term.options) live.term.options.ignoreBracketedPasteMode = false;
    return { success: true };
  }

  // Reconnect one pane. A session still connected asks first: reconnecting
  // terminates it and everything running in it.
  function requestReconnect(id) {
    const termState = state.terminals.get(id);
    if (!termState) return;
    const run = () => {
      reconnectTerminal(id).then((r) => {
        if (r.error) App.UI.showToast(App.__('toastSshError', { message: r.error }));
      });
    };
    if (termState._exited || termState._dormant) {
      run();
      return;
    }
    App.Menus.showConfirm(App.__('confirmReconnect'), run, 'skipReconnectConfirm', 'paneReconnectTitle');
  }

  // Reconnect several panes: one confirm for the batch (so the local shells it
  // will not touch are accounted for) and one summary of whatever failed. The
  // batch confirm honours the same "don't show again" choice as the single-pane
  // one; the failure summary is never suppressed. `confirmKey` names the
  // confirm's first line; callers with a non-Selected-tabs target set pass
  // their own wording.
  function reconnectTabs(ids, confirmKey) {
    const sshIds = ids.filter((tid) => {
      const ts = state.terminals.get(tid);
      return ts && ts.shell === 'ssh' && ts.connectionId;
    });
    if (sshIds.length === 0) return;
    const skippedLocals = ids.length - sshIds.length;

    let message = App._p(confirmKey || 'confirmReconnectSelected', sshIds.length);
    if (skippedLocals > 0) message += '\n' + App._p('confirmReconnectSkipLocal', skippedLocals);

    App.Menus.showConfirm(message, () => {
      const failures = [];
      const runAt = (i) => {
        if (i >= sshIds.length) {
          if (failures.length > 0) {
            App.Menus.showConfirm(
              App.__('reconnectFailedSummary', { names: failures.join('; ') }),
              () => {}, null, 'confirmClose'
            );
          }
          return;
        }
        const id = sshIds[i];
        const ts = state.terminals.get(id);
        const name = ts ? paneName(ts) : String(id);
        reconnectTerminal(id).then((r) => {
          if (r.error) failures.push(`${name}: ${r.error}`);
          runAt(i + 1);
        });
      };
      runAt(0);
    }, 'skipReconnectConfirm', 'paneReconnectTitle');
  }

  function setSinglePane(id) {
    showOnlyPane(id);
    const t = state.terminals.get(id);
    if (t && t.paneEl.parentNode !== App.container) {
      App.container.appendChild(t.paneEl);
    }
    if (t) {
      t.paneEl.style.width = '';
      t.paneEl.style.height = '';
      setTimeout(() => t.fitAddon.fit(), 50);
    }
  }

  function showOnlyPane(id) {
    const activeGroup = state.activeGroupId;
    for (const [tid, t] of state.terminals) {
      const inGroup = state.terminalGroups.get(tid) === activeGroup;
      t.paneEl.style.display = (tid === id && inGroup) ? 'flex' : 'none';
    }
  }

  function showAllPanes() {
    const activeGroup = state.activeGroupId;
    for (const [tid, t] of state.terminals) {
      const inGroup = state.terminalGroups.get(tid) === activeGroup;
      t.paneEl.style.display = inGroup ? 'flex' : 'none';
    }
  }

  function setEchoCheckboxesVisible(visible) {
    for (const [, t] of state.terminals) {
      const cb = t.titlebar.querySelector('.pane-checkbox');
      if (cb) cb.style.display = visible ? '' : 'none';
    }
  }

  function cycleTerminal(direction) {
    const groupIds = App.Groups.getGroupTerminalIds(state.activeGroupId);
    if (groupIds.length < 2) return;
    const currentIdx = groupIds.indexOf(state.activeTerminalId);
    const nextIdx = (currentIdx + direction + groupIds.length) % groupIds.length;
    focusTerminal(groupIds[nextIdx]);
  }

  // ─── Pane title ─────────────────────────────────────────────────────────────
  // A Pane title is a Pane name plus, on SSH panes, the Connection identity.
  // All three surfaces (Tab, Pane title bar, Search panel header) render it.

  function paneName(termState) {
    const named = termState.customName || termState.label;
    if (named) return named;
    // A connection stored before the name became mandatory falls back to its host.
    return termState.host || App.getShellName(termState.shell);
  }

  function connectionIdentity(termState) {
    if (termState.shell !== 'ssh' || !termState.host) return '';
    // Nothing to qualify: the Pane name already is the host.
    if (!termState.customName && !termState.label) return '';
    return termState.username ? `${termState.username}@${termState.host}` : termState.host;
  }

  function paneTitle(termState) {
    const identity = connectionIdentity(termState);
    return identity ? `${paneName(termState)} (${identity})` : paneName(termState);
  }

  function renderPaneTitle(termState) {
    const labelEl = termState.titlebar && termState.titlebar.querySelector('.pane-label');
    if (!labelEl) return;
    const nameEl = labelEl.querySelector('.pane-name');
    if (nameEl) nameEl.textContent = (termState._exited ? '⏹ ' : '') + paneName(termState);

    const identity = connectionIdentity(termState);
    let identityEl = labelEl.querySelector('.pane-identity');
    if (!identity) {
      if (identityEl) identityEl.remove();
      labelEl.title = '';
      return;
    }
    if (!identityEl) {
      identityEl = document.createElement('span');
      identityEl.className = 'pane-identity';
      labelEl.appendChild(identityEl);
    }
    identityEl.textContent = `(${identity})`;
    labelEl.title = paneTitle(termState);
  }

  // The find bar lives inside the pane (its terminal screen) but is not a
  // terminal surface: the pane-level paste and context-menu interception below
  // must not hijack events that originate in the bar.
  function fromFindBar(e) {
    return e.target instanceof Element && !!e.target.closest('.find-bar');
  }

  // ─── Bracketed paste helper ───────────────────────────────────────────────
  const BRACKETED_PASTE_START = '\x1b[200~';
  const BRACKETED_PASTE_END = '\x1b[201~';
  function bracketPasteText(text) {
    return BRACKETED_PASTE_START + text + BRACKETED_PASTE_END;
  }

  // ConPTY turns BOTH a carriage return and a line feed into an Enter keypress,
  // so writing a clipboard's verbatim CRLF would deliver two Enters and insert
  // a blank line after every pasted line. Normalize to bare LF before writing.
  function normalizeNewlines(text) {
    return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  // Only wrap pastes when no password prompt is active and the remote
  // application has actually enabled bracketed paste mode.
  function bracketFor(id, text) {
    const ts = state.terminals.get(id);
    if (ts && ts.pwPrompt) return text;
    if (ts && !ts.term.modes?.bracketedPasteMode) return text;
    return bracketPasteText(text);
  }

  // ─── Shared paste helper (id=null means paste-all) ────────────────────────
  function pasteToTerminal(id, text?) {
    if (text !== undefined) {
      text = normalizeNewlines(text);
      if (id === null) {
        for (const bid of state.echoSelection) api.write(bid, bracketFor(bid, text));
        // Paste All can come from the context menu, whose click took focus off
        // the xterm textarea; with no preview dialog to hand it back, do it here.
        refocus();
      } else {
        api.write(id, bracketFor(id, text));
      }
      if (!state.echoModeActive && id !== null) {
        const ts = state.terminals.get(id);
        if (ts) setTimeout(() => ts.term.focus(), 50);
      }
      return;
    }

    navigator.clipboard.readText().then(raw => {
      if (!raw) return;
      const text = normalizeNewlines(raw);
      if (text.includes('\n') && localStorage.getItem('skipPastePreview') !== 'true') {
        showPastePreview(id, text);
      } else if (id === null) {
        for (const bid of state.echoSelection) api.write(bid, bracketFor(bid, text));
        refocus();
      } else {
        api.write(id, bracketFor(id, text));
        if (!state.echoModeActive) {
          const ts = state.terminals.get(id);
          if (ts) setTimeout(() => ts.term.focus(), 50);
        }
      }
    }).catch(() => {});
  }

  const ESC = String.fromCharCode(27);
  const ANSI_CSI_RE = new RegExp(ESC + '\\[[0-9;?]*[ -/]*[@-~]', 'g');
  const CTRL_RE = new RegExp('[' + String.fromCharCode(0) + '-' + String.fromCharCode(8) + String.fromCharCode(11) + String.fromCharCode(12) + String.fromCharCode(14) + '-' + String.fromCharCode(31) + ']', 'g');

  // Track the most recent output so pastes into password/passphrase prompts
  // are sent unwrapped (their readers treat bracketed-paste markers as input).
  function noteOutput(id, data) {
    const ts = state.terminals.get(id);
    if (!ts) return;
    const clean = data.replace(ANSI_CSI_RE, '').replace(CTRL_RE, '');
    ts.outBuf = (ts.outBuf + clean).slice(-200);
    ts.pwPrompt = /(password|passphrase)[^\n]{0,60}:\s*$/i.test(ts.outBuf);
    if (ts.term.options) ts.term.options.ignoreBracketedPasteMode = ts.pwPrompt;
  }

  // Decide which terminal should own keyboard focus and hand it over. Used
  // after dialogs close and (via App.Terminal.refocus) after any tab-bar
  // action click: in echo mode prefer a terminal still in the echo selection,
  // otherwise fall back to the active terminal of the current group.
  function refocus(targetId?) {
    const groupIds = App.Groups.getGroupTerminalIds(state.activeGroupId);
    if (state.echoModeActive) {
      const focusId = state.echoSelection.has(state.activeTerminalId)
        ? state.activeTerminalId
        : groupIds.find(id => state.echoSelection.has(id));
      if (focusId) focusTerminal(focusId);
      return;
    }

    const focusId = targetId ?? state.activeTerminalId ?? groupIds[0];
    if (focusId) focusTerminal(focusId);
  }

  // ─── Paste preview dialog ──────────────────────────────────────────────────
  function showPastePreview(id, text) {
    const dialog = document.getElementById('pastePreviewDialog');
    const textarea = document.getElementById('pastePreviewText');
    const lineCount = document.getElementById('pasteLineCount');
    const dontShow = document.getElementById('pastePreviewDontShow');
    if (!dialog || !textarea) { api.write(id, text); return; }

    textarea.value = text;
    lineCount.textContent = App.__('pastePreviewLines', { count: text.split('\n').length });
    if (dontShow) dontShow.checked = false;
    dialog.classList.remove('hidden');
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = textarea.value.length;

    if (_pasteEscHandler) document.removeEventListener('keydown', _pasteEscHandler);

    const confirmOnce = () => {
      dialog.classList.add('hidden');
      if (dontShow && dontShow.checked) {
        localStorage.setItem('skipPastePreview', 'true');
      }
      const edited = textarea.value;
      if (edited) pasteToTerminal(id, edited);
      document.removeEventListener('keydown', escHandler);
      _pasteEscHandler = null;
      refocus(id);
    };

    document.getElementById('pastePreviewConfirm').onclick = confirmOnce;
    document.getElementById('pastePreviewCancel').onclick = () => {
      dialog.classList.add('hidden');
      document.removeEventListener('keydown', escHandler);
      _pasteEscHandler = null;
      refocus(id);
    };

    function escHandler(e) {
      if (e.key === 'Escape') {
        dialog.classList.add('hidden');
        document.removeEventListener('keydown', escHandler);
        _pasteEscHandler = null;
        refocus(id);
      }
      if (e.ctrlKey && e.key === 'Enter') confirmOnce();
    }
    _pasteEscHandler = escHandler;
    document.addEventListener('keydown', escHandler);
  }

  // A copy of xterm's selectAll() spans the whole buffer, including the empty
  // rows below the last output; pasting that would trail a run of blank lines.
  // Drop that trailing whitespace run on every path to the clipboard.
  function trimSelection(sel: string) {
    return sel.replace(/\s+$/, '');
  }

  // Restore builds the whole layout before anything connects; it flips this off
  // once the layout is in place and instead asks for visible Panes directly.
  function setSuppressAutoConnect(value) {
    _suppressAutoConnect = !!value;
  }

  // ─── Expose ─────────────────────────────────────────────────────────────────
  App.Terminal = {
    spawnTerminal, spawnSshTerminal, focusTerminal, closeTerminal, handleTerminalExit,
    setSinglePane, showOnlyPane, showAllPanes,
    setEchoCheckboxesVisible, cycleTerminal, pasteToTerminal, showPastePreview, noteOutput,
    paneName, connectionIdentity, paneTitle, renderPaneTitle,
    reconnectTerminal, requestReconnect, reconnectTabs,
    refocus, trimSelection,
    mountPane, connectPane, autoConnectVisible, setSuppressAutoConnect,
  };
})();

export {};
