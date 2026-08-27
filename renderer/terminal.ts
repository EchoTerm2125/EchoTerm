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
      const msg = result.errorCode === 'UNKNOWN_SHELL'
        ? App.__('errorUnknownShell', { shell: shellKey })
        : result.errorCode === 'GIT_BASH_NOT_FOUND'
        ? App.__('toastGitBashNotFound')
        : result.error;
      App.UI.showToast(App.__('toastError', { message: msg }));
      return null;
    }

    const { id } = result;

    // Create pane element
    const paneEl = document.createElement('div');
    paneEl.className = 'pane';
    paneEl.dataset.termId = String(id);

    // Title bar
    const titlebar = document.createElement('div');
    titlebar.className = 'pane-titlebar';
    titlebar.innerHTML = `
      <span class="pane-label">${App.getShellName(shellKey)}</span>
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

    // Initialize xterm
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontSize: App.Theme.getTermFontSize(),
      fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', 'Courier New', 'Microsoft YaHei', 'Noto Sans Mono CJK SC', 'Noto Sans CJK SC', 'PingFang SC', 'WenQuanYi Micro Hei', monospace",
      bracketedPasteMode: true,
      theme: App.Theme.getXtermTheme(),
    } as any);

    const FitAddonClass: any = FitAddon.FitAddon || FitAddon;
    const fitAddon = new FitAddonClass();
    term.loadAddon(fitAddon);
    term.open(xtermDiv);

    // Intercept paste event for multi-line preview / echo paste-all
    xtermDiv.addEventListener('paste', (e) => {
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
      if (localStorage.getItem('skipRightClickPaste') !== 'false') return; // show normal menu
      e.preventDefault();
      e.stopImmediatePropagation();
      const sel = term.getSelection();
      if (sel) {
        navigator.clipboard.writeText(sel).catch(() => {});
        term.clearSelection();
        term.focus();
      } else {
        pasteToTerminal(state.echoModeActive ? null : id);
      }
    }, true);

    term.onResize(({ cols, rows }) => { api.resize(id, cols, rows); });

    const termState = { id, shell: shellKey, term, fitAddon, paneEl, titlebar, customName: null, outBuf: '', pwPrompt: false };
    state.terminals.set(id, termState);
    state.paneOrder.push(id);
    state.activeTerminalId = id;

    const groupId = state.activeGroupId;
    state.terminalGroups.set(id, groupId);
    if (state.groups.has(groupId)) {
      state.groups.get(groupId).terminalIds.add(id);
    }
    App.Groups.updateGroupTabs();

    App.container.appendChild(paneEl);

    term.onData((data) => {
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

    titlebar.querySelector('.pane-paste').addEventListener('click', (e) => {
      e.stopPropagation();
      pasteToTerminal(id);
    });

    paneEl.addEventListener('click', (e) => {
      if (e.target.closest('.pane-checkbox') || e.target.closest('.pane-close') || e.target.closest('.pane-paste')) return;
      if (state.echoModeActive && !state.echoSelection.has(id)) return;
      focusTerminal(id);
    });

    App.Menus.bindContextMenu(paneEl, id);
    App.Tabs.addTab(id, shellKey);

    if (state.echoModeActive) {
      state.echoSelection.add(id);
      paneEl.classList.add('echo-selected');
      const chk = titlebar.querySelector('input[type="checkbox"]');
      if (chk) chk.checked = true;
      const cbLabel = titlebar.querySelector('.pane-checkbox');
      if (cbLabel) { cbLabel.style.display = ''; cbLabel.classList.add('selected'); }
      showAllPanes();
      App.Echo.applyGridLayout();
    } else if (!state.splitInstance && state.gridSplits.length === 0) {
      setSinglePane(id);
    }

    focusTerminal(id);
    setTimeout(() => fitAddon.fit(), 300);
    App.UI.updateStatusBar();
    return id;
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
  }

  function handleTerminalExit(id) {
    const termState = state.terminals.get(id);
    if (!termState) return;

    // SSH terminals: keep pane visible so user can see error output
    if (termState.shell === 'ssh') {
      const label = termState.titlebar.querySelector('.pane-label');
      if (label) {
        label.textContent = '⏹ ' + (label.textContent.replace(/^⏹ /, ''));
        label.style.color = 'var(--text-muted)';
      }
      const closeBtn = termState.titlebar.querySelector('.pane-close');
      if (closeBtn) {
        closeBtn.setAttribute('data-i18n-title', 'paneDismissTitle');
        closeBtn.title = App.__('paneDismissTitle');
        closeBtn.style.color = 'var(--warning)';
      }
      state.terminals.set(id, { ...termState, _exited: true });
      App.UI.updateStatusBar();
      return;
    }

    if (state.terminals.size <= 1) {
      App.UI.showToast(App.__('toastTerminalExited'));
      termState.term.dispose();
      termState.paneEl.remove();
      state.terminals.delete(id);
      state.paneOrder = [];
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

  // ─── SSH Terminal Spawning ─────────────────────────────────────────────────
  async function spawnSshTerminal(spawnResult) {
    const { id, label, host } = spawnResult;
    const shellKey = 'ssh';

    // Create pane element
    const paneEl = document.createElement('div');
    paneEl.className = 'pane';
    paneEl.dataset.termId = String(id);

    // Title bar
    const titlebar = document.createElement('div');
    titlebar.className = 'pane-titlebar';
    const displayName = label || `${host || App.__('shellSsh')}`;
    titlebar.innerHTML = `
      <span class="pane-label">🖥️ ${escHtml(displayName)}</span>
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

    // Initialize xterm
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontSize: App.Theme.getTermFontSize(),
      fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', 'Courier New', 'Microsoft YaHei', 'Noto Sans Mono CJK SC', 'Noto Sans CJK SC', 'PingFang SC', 'WenQuanYi Micro Hei', monospace",
      bracketedPasteMode: true,
      theme: App.Theme.getXtermTheme(),
    } as any);

    const FitAddonClass: any = FitAddon.FitAddon || FitAddon;
    const fitAddon = new FitAddonClass();
    term.loadAddon(fitAddon);
    term.open(xtermDiv);

    // Intercept paste event for multi-line preview / echo paste-all
    xtermDiv.addEventListener('paste', (e) => {
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
      if (localStorage.getItem('skipRightClickPaste') !== 'false') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const sel = term.getSelection();
      if (sel) {
        navigator.clipboard.writeText(sel).catch(() => {});
        term.clearSelection();
        term.focus();
      } else {
        pasteToTerminal(state.echoModeActive ? null : id);
      }
    }, true);

    term.onResize(({ cols, rows }) => { api.resize(id, cols, rows); });

    const termState = { id, shell: shellKey, term, fitAddon, paneEl, titlebar, customName: displayName, outBuf: '', pwPrompt: false };
    state.terminals.set(id, termState);
    state.paneOrder.push(id);
    state.activeTerminalId = id;

    const groupId = state.activeGroupId;
    state.terminalGroups.set(id, groupId);
    if (state.groups.has(groupId)) {
      state.groups.get(groupId).terminalIds.add(id);
    }
    App.Groups.updateGroupTabs();

    App.container.appendChild(paneEl);

    term.onData((data) => {
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

    titlebar.querySelector('.pane-paste').addEventListener('click', (e) => {
      e.stopPropagation();
      pasteToTerminal(id);
    });

    paneEl.addEventListener('click', (e) => {
      if (e.target.closest('.pane-checkbox') || e.target.closest('.pane-close') || e.target.closest('.pane-paste')) return;
      if (state.echoModeActive && !state.echoSelection.has(id)) return;
      focusTerminal(id);
    });

    App.Menus.bindContextMenu(paneEl, id);
    App.Tabs.addTab(id, shellKey, displayName);

    if (state.echoModeActive) {
      state.echoSelection.add(id);
      paneEl.classList.add('echo-selected');
      const chk = titlebar.querySelector('input[type="checkbox"]');
      if (chk) chk.checked = true;
      const cbLabel = titlebar.querySelector('.pane-checkbox');
      if (cbLabel) { cbLabel.style.display = ''; cbLabel.classList.add('selected'); }
      showAllPanes();
      App.Echo.applyGridLayout();
    } else if (!state.splitInstance && state.gridSplits.length === 0) {
      setSinglePane(id);
    }

    focusTerminal(id);
    setTimeout(() => fitAddon.fit(), 300);
    App.UI.updateStatusBar();
    return id;
  }

  function escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
  function refocus(targetId) {
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

  // ─── Expose ─────────────────────────────────────────────────────────────────
  App.Terminal = {
    spawnTerminal, spawnSshTerminal, focusTerminal, closeTerminal, handleTerminalExit,
    setSinglePane, showOnlyPane, showAllPanes,
    setEchoCheckboxesVisible, cycleTerminal, pasteToTerminal, showPastePreview, noteOutput,
    refocus,
  };
})();

export {};
