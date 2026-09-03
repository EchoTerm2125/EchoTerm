/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Echo Mode & Layout
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';
  const state = App.state;

  function destroyGrid() {
    for (const split of state.gridSplits) {
      try { split.destroy(); } catch {}
    }
    state.gridSplits = [];
    if (state.splitInstance) {
      try { state.splitInstance.destroy(); } catch {}
      state.splitInstance = null;
    }

    const allPanes = [];
    for (const [, t] of state.terminals) {
      if (t.paneEl) allPanes.push(t.paneEl);
    }
    for (const pane of allPanes) {
      if (pane.parentNode) pane.parentNode.removeChild(pane);
      App.container.appendChild(pane);
      pane.style.width = ''; pane.style.height = '';
      pane.style.flexBasis = ''; pane.style.flexGrow = ''; pane.style.flexShrink = '';
      pane.style.position = '';
      pane.style.left = ''; pane.style.top = ''; pane.style.right = ''; pane.style.bottom = '';
    }

    for (const row of App.container.querySelectorAll('.grid-row')) row.remove();
    for (const ph of App.container.querySelectorAll('.grid-placeholder')) ph.remove();
  }

  function fitAllTerminals() {
    for (const [, t] of state.terminals) {
      setTimeout(() => t.fitAddon.fit(), 30);
    }
  }

  // Creates a Split instance whose gutters are shown but not draggable.
  // The echo-mode grid is a fixed layout, so resizing is disabled:
  // destroy(true, true) keeps the gutters and applied sizes while removing
  // the drag listeners.
  function createFixedSplit(elements, options) {
    const split = Split(elements, options);
    split.destroy(true, true);
    return split;
  }

  function applyGridLayout() {
    destroyGrid();
    const ids = App.Groups.getGroupTerminalIds(state.activeGroupId);
    const count = ids.length;
    if (count === 0) return;
    if (count === 1) {
      App.Terminal.showOnlyPane(ids[0]);
      const t = state.terminals.get(ids[0]);
      if (t) setTimeout(() => t.fitAddon.fit(), 50);
      return;
    }

    App.Terminal.showAllPanes();
    const n = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / n);
    App.container.style.display = 'flex';
    App.container.style.flexDirection = 'column';

    const panes = ids.map(id => state.terminals.get(id)?.paneEl).filter(Boolean);
    const rowContainers = [];
    let paneIdx = 0;

    for (let r = 0; r < rows; r++) {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'grid-row';
      rowDiv.style.display = 'flex';
      rowDiv.style.flexDirection = 'row';
      rowDiv.style.flex = '1';
      rowDiv.style.minHeight = '0';
      const rowPanes = [];

      for (let c = 0; c < n; c++) {
        if (paneIdx < count) {
          const pane = panes[paneIdx];
          pane.style.width = ''; pane.style.height = '';
          rowDiv.appendChild(pane);
          rowPanes.push(pane);
          paneIdx++;
        } else {
          const placeholder = document.createElement('div');
          placeholder.className = 'grid-placeholder';
          placeholder.style.flex = '1'; placeholder.style.minWidth = '0'; placeholder.style.minHeight = '0';
          rowDiv.appendChild(placeholder);
          rowPanes.push(placeholder);
        }
      }
      App.container.appendChild(rowDiv);
      rowContainers.push({ div: rowDiv, panes: rowPanes, cellCount: n });
    }

    if (rowContainers.length > 1) {
      const rowElements = rowContainers.map(r => r.div);
      const rowSizes = new Array(rowElements.length).fill(100 / rowElements.length);
      const rowSplit = createFixedSplit(rowElements, {
        direction: 'vertical', sizes: rowSizes, minSize: 80, gutterSize: 4,
      });
      state.gridSplits.push(rowSplit);
      state.splitInstance = rowSplit;
    }

    for (const row of rowContainers) {
      if (row.panes.length > 1) {
        const sizes = new Array(row.panes.length).fill(100 / row.panes.length);
        const colSplit = createFixedSplit(row.panes, {
          direction: 'horizontal', sizes, minSize: 100, gutterSize: 4,
        });
        state.gridSplits.push(colSplit);
      }
    }
    setTimeout(() => fitAllTerminals(), 100);
  }

  function toggleEchoMode() {
    state.echoModeActive = !state.echoModeActive;
    state.groupEchoActive.set(state.activeGroupId, state.echoModeActive);
    if (state.echoModeActive) enterEchoMode();
    else exitEchoMode();
  }

  function enterEchoMode() {
    const groupIds = App.Groups.getGroupTerminalIds(state.activeGroupId);
    if (groupIds.length < 2) {
      App.UI.showToast(App.__('toastNeedTwoTerminals'));
      state.echoModeActive = false;
      return;
    }
    setEchoButtonLabel(true);
    App.tabList.style.display = 'none';
    App.Terminal.setEchoCheckboxesVisible(true);

    // Restore saved per-terminal selection, or default to all selected.
    // Terminals added to the group after the selection was saved default to enabled.
    const savedSelection = state.groupEchoSelection.get(state.activeGroupId);
    const savedTerminals = state.groupEchoTerminals.get(state.activeGroupId);
    state.echoSelection.clear();
    for (const id of groupIds) {
      const t = state.terminals.get(id);
      if (!t) continue;
      // Enabled if: no saved selection (fresh start), or was in saved selection, or is a new terminal not in the saved snapshot
      const checked = savedSelection
        ? (savedSelection.has(id) || (savedTerminals && !savedTerminals.has(id)))
        : true;
      if (checked) {
        state.echoSelection.add(id);
        t.paneEl.classList.add('echo-selected');
        const cb = t.titlebar.querySelector('.pane-checkbox');
        if (cb) cb.classList.add('selected');
      } else {
        t.paneEl.classList.remove('echo-selected');
        const cb = t.titlebar.querySelector('.pane-checkbox');
        if (cb) cb.classList.remove('selected');
      }
      const chk = t.titlebar.querySelector('input[type="checkbox"]');
      if (chk) chk.checked = checked;
    }

    updateEchoAllButton();

    applyGridLayout();

    setTimeout(() => {
      const gIds = App.Groups.getGroupTerminalIds(state.activeGroupId);
      const focusId = state.activeTerminalId || gIds[0];
      const t = state.terminals.get(focusId);
      if (t) t.term.focus();
    }, 120);
    App.UI.updateStatusBar();
  }

  function exitEchoMode() {
    setEchoButtonLabel(false);
    App.tabList.style.display = '';
    App.Terminal.setEchoCheckboxesVisible(false);

    state.echoSelection.clear();
    for (const [, t] of state.terminals) {
      t.paneEl.classList.remove('echo-selected');
      const cb = t.titlebar.querySelector('.pane-checkbox');
      if (cb) cb.classList.remove('selected');
      const chk = t.titlebar.querySelector('input[type="checkbox"]');
      if (chk) chk.checked = false;
    }

    destroyGrid();
    const groupIds = App.Groups.getGroupTerminalIds(state.activeGroupId);
    const activeId = state.activeTerminalId || groupIds[0];
    if (activeId) App.Terminal.focusTerminal(activeId);
    App.UI.updateStatusBar();
  }

  function toggleEchoAll() {
    const groupIds = App.Groups.getGroupTerminalIds(state.activeGroupId);
    const allSelected = groupIds.length > 0 && groupIds.every(id => state.echoSelection.has(id));

    if (allSelected) {
      for (const id of groupIds) {
        state.echoSelection.delete(id);
        const t = state.terminals.get(id);
        if (t) {
          t.paneEl.classList.remove('echo-selected');
          const cb = t.titlebar.querySelector('.pane-checkbox');
          if (cb) cb.classList.remove('selected');
          const chk = t.titlebar.querySelector('input[type="checkbox"]');
          if (chk) chk.checked = false;
        }
      }
    } else {
      for (const id of groupIds) {
        state.echoSelection.add(id);
        const t = state.terminals.get(id);
        if (t) {
          t.paneEl.classList.add('echo-selected');
          const cb = t.titlebar.querySelector('.pane-checkbox');
          if (cb) cb.classList.add('selected');
          const chk = t.titlebar.querySelector('input[type="checkbox"]');
          if (chk) chk.checked = true;
        }
      }
    }
    updateEchoAllButton();
    refocusEchoTerminal();
  }

  function toggleEachEcho() {
    const groupIds = App.Groups.getGroupTerminalIds(state.activeGroupId);
    for (const id of groupIds) {
      const t = state.terminals.get(id);
      if (!t) continue;
      const wasChecked = state.echoSelection.has(id);
      if (wasChecked) {
        state.echoSelection.delete(id);
        t.paneEl.classList.remove('echo-selected');
        const cb = t.titlebar.querySelector('.pane-checkbox');
        if (cb) cb.classList.remove('selected');
        const chk = t.titlebar.querySelector('input[type="checkbox"]');
        if (chk) chk.checked = false;
      } else {
        state.echoSelection.add(id);
        t.paneEl.classList.add('echo-selected');
        const cb = t.titlebar.querySelector('.pane-checkbox');
        if (cb) cb.classList.add('selected');
        const chk = t.titlebar.querySelector('input[type="checkbox"]');
        if (chk) chk.checked = true;
      }
    }
    updateEchoAllButton();
    refocusEchoTerminal();
  }

  function refocusEchoTerminal() {
    if (!state.echoModeActive) return;
    if (state.echoSelection.has(state.activeTerminalId)) return;
    const groupIds = App.Groups.getGroupTerminalIds(state.activeGroupId);
    const nextId = groupIds.find(id => state.echoSelection.has(id));
    if (nextId) App.Terminal.focusTerminal(nextId);
  }

  // Title-bar clicks call this in echo mode (see docs/adr/0004). It is
  // enable-only: a deselected terminal is added to the echo selection and its
  // UI is synced, but clicking never removes one. Idempotent, so a double
  // click's repeated clicks are harmless — exclusivity is applied separately
  // by soloEchoOnTerminal. The checkbox and the Enable All / Toggle All
  // buttons remain the way to disable a terminal.
  function enableEchoOnTerminal(id) {
    if (state.echoSelection.has(id)) return;
    const t = state.terminals.get(id);
    if (!t) return;
    state.echoSelection.add(id);
    t.paneEl.classList.add('echo-selected');
    const cbLabel = t.titlebar.querySelector('.pane-checkbox');
    if (cbLabel) cbLabel.classList.add('selected');
    const chk = t.titlebar.querySelector('input[type="checkbox"]');
    if (chk) chk.checked = true;
    updateEchoAllButton();
    App.UI.updateStatusBar();
  }

  // Inverse of enableEchoOnTerminal: removes a terminal from the echo
  // selection and syncs its UI. Called only via soloEchoOnTerminal.
  function disableEchoOnTerminal(id) {
    if (!state.echoSelection.has(id)) return;
    const t = state.terminals.get(id);
    if (!t) return;
    state.echoSelection.delete(id);
    t.paneEl.classList.remove('echo-selected');
    const cbLabel = t.titlebar.querySelector('.pane-checkbox');
    if (cbLabel) cbLabel.classList.remove('selected');
    const chk = t.titlebar.querySelector('input[type="checkbox"]');
    if (chk) chk.checked = false;
  }

  // A double click on a title bar makes echo exclusive to that terminal:
  // it is enabled (additively, like a single click) and every other terminal
  // in the active group is disabled. See docs/adr/0004.
  function soloEchoOnTerminal(id) {
    const groupIds = App.Groups.getGroupTerminalIds(state.activeGroupId);
    for (const bid of groupIds) {
      if (bid === id) enableEchoOnTerminal(bid);
      else disableEchoOnTerminal(bid);
    }
    updateEchoAllButton();
    App.UI.updateStatusBar();
  }

  function updateEchoAllButton() {
    if (!App.btnEchoAll) return;
    const groupIds = App.Groups.getGroupTerminalIds(state.activeGroupId);
    const allSelected = groupIds.length > 0 && groupIds.every(id => state.echoSelection.has(id));
    App.btnEchoAll.textContent = allSelected ? App.__('echoDisableAll') : App.__('echoEnableAll');
    state.groupEchoSelection.set(state.activeGroupId, new Set(state.echoSelection));
    state.groupEchoTerminals.set(state.activeGroupId, new Set(groupIds));
  }

  function setEchoButtonLabel(on) {
    if (on) {
      App.btnEchoMode.classList.remove('echo-mode-off');
      App.btnEchoMode.classList.add('echo-mode-on');
    } else {
      App.btnEchoMode.classList.remove('echo-mode-on');
      App.btnEchoMode.classList.add('echo-mode-off');
    }
    const label = App.$('#echoLabel');
    if (label) label.textContent = on ? App.__('echoLabelOn') : App.__('echoLabel');

    // Echo control buttons in the tab bar follow echo mode state
    const echoBtns = [App.btnEchoAll, App.btnEchoToggle, App.btnEchoPaste];
    for (const btn of echoBtns) {
      if (btn) btn.classList.toggle('hidden', !on);
    }
  }

  function bindEchoControls() {
    if (App.btnEchoAll) App.btnEchoAll.addEventListener('click', () => toggleEchoAll());
    if (App.btnEchoToggle) App.btnEchoToggle.addEventListener('click', () => toggleEachEcho());
    if (App.btnEchoPaste) App.btnEchoPaste.addEventListener('click', () => pasteToAllEcho());
  }

  function pasteToAllEcho() {
    App.Terminal.pasteToTerminal(null);
  }

  App.Echo = {
    toggleEchoMode, enterEchoMode, exitEchoMode,
    applyGridLayout, destroyGrid,
    fitAllTerminals,
    toggleEchoAll, toggleEachEcho, refocusEchoTerminal,
    enableEchoOnTerminal, soloEchoOnTerminal,
    updateEchoAllButton, bindEchoControls,
    setEchoButtonLabel
  };
})();

export {};
