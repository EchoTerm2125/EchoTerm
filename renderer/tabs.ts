/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Tab Management
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';
  const state = App.state;

  const tabCache = new Map(); // id -> tab element
  let tabContextTargetId = null; // shared with menus

  function addTab(id, shell, customLabel) {
    const tab = document.createElement('div');
    tab.className = 'tab-item';
    tab.dataset.termId = id;
    tab.draggable = true;
    const label = customLabel || App.getShellName(shell);
    tab.innerHTML = `
      <span class="tab-icon">${App.TAB_ICONS[shell] || '⬚'}</span>
      <span class="tab-label"></span>
      <button class="tab-close" data-i18n-title="tabCloseTitle" title="Close">×</button>
    `;
    tab.querySelector('.tab-label').textContent = label;

    tab.addEventListener('click', (e) => {
      if (e.target.closest('.tab-close')) return;
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      if (ctrl) { e.preventDefault(); toggleTabSelection(id); state.lastClickedTabId = id; return; }
      if (shift && state.lastClickedTabId) { e.preventDefault(); selectTabRange(state.lastClickedTabId, id); return; }

      clearTabSelection();
      toggleTabSelection(id);
      state.lastClickedTabId = id;

      if (state.echoModeActive) {
        App.Echo.exitEchoMode();
        return;
      }
      App.Terminal.focusTerminal(id);
    });

    tab.addEventListener('contextmenu', (e) => {
      e.preventDefault(); e.stopPropagation();
      App.Menus.showTabContextMenu(e, id);
    });

    tab.querySelector('.tab-close').addEventListener('click', (e) => {
      e.stopPropagation();
      App.Menus.showConfirm(
        App.__('confirmCloseTerminal'),
        () => App.Terminal.closeTerminal(id),
        'skipTabCloseConfirm'
      );
    });

    // ── Middle-click to close ──
    tab.addEventListener('auxclick', (e) => {
      if (e.button !== 1) return;
      e.preventDefault();
      e.stopPropagation();
      App.Menus.showConfirm(
        App.__('confirmCloseTerminal'),
        () => App.Terminal.closeTerminal(id),
        'skipTabCloseConfirm'
      );
    });

    // ── Double-click to rename ──
    const labelEl = tab.querySelector('.tab-label');
    labelEl.addEventListener('dblclick', (e) => {
      e.preventDefault(); e.stopPropagation();
      startTabRename(id);
    });

    // ── Drag-and-drop reorder ──
    tab.addEventListener('dragstart', (e) => {
      e.dataTransfer.effectAllowed = 'move';
      if (state.selectedTabs.has(id) && state.selectedTabs.size > 1) {
        const ids = [...state.selectedTabs];
        e.dataTransfer.setData('text/plain', ids.join(','));
        for (const tid of ids) {
          const t = tabCache.get(tid);
          if (t) t.classList.add('dragging');
        }
      } else {
        e.dataTransfer.setData('text/plain', String(id));
        tab.classList.add('dragging');
      }
    });
    tab.addEventListener('dragend', () => {
      for (const el of tabCache.values()) {
        el.classList.remove('dragging');
        el.classList.remove('drag-over');
      }
    });
    tab.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      for (const el of tabCache.values()) el.classList.remove('drag-over');
      tab.classList.add('drag-over');
    });
    tab.addEventListener('drop', (e) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData('text/plain');
      if (!raw) return;
      const parts = raw.split(',');
      if (parts.length > 1) {
        const draggedIds = parts.map(p => isNaN(Number(p)) ? p : Number(p))
          .filter(did => did !== id && state.terminalGroups.get(did) === state.terminalGroups.get(id));
        if (draggedIds.length === 0) return;
        reorderTabsMulti(draggedIds, id);
      } else {
        const draggedId = isNaN(Number(raw)) ? raw : Number(raw);
        if (draggedId === id) return;
        const dg = state.terminalGroups.get(draggedId);
        const tg = state.terminalGroups.get(id);
        if (!dg || dg !== tg) return;
        reorderTabs(draggedId, id);
      }
    });

    App.tabList.appendChild(tab);
    tabCache.set(id, tab);

    if (state.terminalGroups.get(id) !== state.activeGroupId) {
      tab.style.display = 'none';
    }

    setTimeout(() => {
      tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'end' });
    }, 50);
  }

  function removeTab(id) {
    const tab = tabCache.get(id);
    if (tab) { tab.remove(); tabCache.delete(id); }
  }

  function updateTabSelection(id) {
    for (const [tid, tab] of tabCache) {
      tab.classList.toggle('active', tid === id);
    }
  }

  function toggleTabSelection(id) {
    const tab = tabCache.get(id);
    if (!tab) return;
    if (state.selectedTabs.has(id)) {
      state.selectedTabs.delete(id);
      tab.classList.remove('selected');
    } else {
      state.selectedTabs.add(id);
      tab.classList.add('selected');
    }
  }

  function clearTabSelection() {
    for (const id of state.selectedTabs) {
      const tab = tabCache.get(id);
      if (tab) tab.classList.remove('selected');
    }
    state.selectedTabs.clear();
  }

  function selectTabRange(fromId, toId) {
    const groupIds = App.Groups.getGroupTerminalIds(state.activeGroupId);
    const fromIdx = groupIds.indexOf(fromId);
    const toIdx = groupIds.indexOf(toId);
    if (fromIdx === -1 || toIdx === -1) return;
    clearTabSelection();
    const start = Math.min(fromIdx, toIdx);
    const end = Math.max(fromIdx, toIdx);
    for (let i = start; i <= end; i++) {
      const tid = groupIds[i];
      state.selectedTabs.add(tid);
      const tb = tabCache.get(tid);
      if (tb) tb.classList.add('selected');
    }
  }

  function getTabCache() { return tabCache; }
  function getTabContextTargetId() { return tabContextTargetId; }
  function setTabContextTargetId(v) { tabContextTargetId = v; }

  function reorderTabs(draggedId, targetId) {
    const fromIdx = state.paneOrder.indexOf(draggedId);
    const toIdx = state.paneOrder.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;

    state.paneOrder.splice(fromIdx, 1);

    if (fromIdx < toIdx) {
      state.paneOrder.splice(toIdx, 0, draggedId);
    } else {
      state.paneOrder.splice(toIdx, 0, draggedId);
    }

    const draggedTab = tabCache.get(draggedId);
    const targetTab = tabCache.get(targetId);
    if (draggedTab && targetTab && draggedTab !== targetTab) {
      if (fromIdx < toIdx) {
        App.tabList.insertBefore(draggedTab, targetTab.nextSibling);
      } else {
        App.tabList.insertBefore(draggedTab, targetTab);
      }
    }
  }

  function reorderTabsMulti(draggedIds, targetId) {
    const ordered = state.paneOrder.filter(id => draggedIds.includes(id));
    if (ordered.length === 0) return;

    // Remove all dragged items from paneOrder
    for (const did of ordered) {
      const idx = state.paneOrder.indexOf(did);
      if (idx !== -1) state.paneOrder.splice(idx, 1);
    }

    // Insert block after target
    let insertIdx = state.paneOrder.indexOf(targetId);
    if (insertIdx === -1) insertIdx = state.paneOrder.length;
    else insertIdx = insertIdx + 1;
    state.paneOrder.splice(insertIdx, 0, ...ordered);

    // Reorder DOM: insert all dragged tabs after target
    const targetTab = tabCache.get(targetId);
    if (!targetTab) return;
    const ref = targetTab.nextSibling;
    for (const did of ordered) {
      const dt = tabCache.get(did);
      if (dt) {
        App.tabList.insertBefore(dt, ref);
      }
    }
  }

  function startTabRename(id) {
    const tab = tabCache.get(id);
    if (!tab) return;
    const termState = state.terminals.get(id);
    if (!termState) return;

    const labelEl = tab.querySelector('.tab-label');
    if (!labelEl) return;

    const currentName = termState.customName || App.getShellName(termState.shell);
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'inline-rename-input';
    input.value = currentName;

    state.isRenaming = true;
    tab.draggable = false;
    labelEl.style.display = 'none';
    labelEl.parentNode.insertBefore(input, labelEl);
    input.focus();
    input.select();

    const finish = (save) => {
      if (save && input.value.trim()) {
        renameTab(id, input.value.trim());
      }
      input.remove();
      labelEl.style.display = '';
      state.isRenaming = false;
      tab.draggable = true;
    };

    input.addEventListener('blur', () => finish(true));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    });
  }

  function renameTab(id, newName) {
    const termState = state.terminals.get(id);
    if (!termState) return;
    termState.customName = newName;

    const tab = tabCache.get(id);
    if (tab) {
      const labelEl = tab.querySelector('.tab-label');
      if (labelEl) labelEl.textContent = newName;
    }

    // Update pane titlebar label
    if (termState.titlebar) {
      const paneLabel = termState.titlebar.querySelector('.pane-label');
      if (paneLabel) paneLabel.textContent = newName;
    }
  }

  App.Tabs = {
    addTab, removeTab, updateTabSelection,
    toggleTabSelection, clearTabSelection, selectTabRange,
    getTabCache, getTabContextTargetId, setTabContextTargetId,
    reorderTabs, reorderTabsMulti,
    startTabRename, renameTab,
  };
})();

export {};
