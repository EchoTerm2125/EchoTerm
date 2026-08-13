/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Group Management
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';
  const state = App.state;

  function createGroup(name, isDefault = false) {
    const id = `g${App.nextGroupId++}`;
    const group: any = { id, name, terminalIds: new Set() };
    state.groups.set(id, group);
    state.groupOrder.push(id);

    const tab = document.createElement('div');
    tab.className = 'group-item';
    tab.dataset.groupId = id;
    tab.draggable = true;
    tab.innerHTML = `
      <span class="group-name"></span>
      <span class="group-count">0</span>
      <button class="group-close" data-i18n-title="closeGroupTitle" title="Close Group">×</button>
    `;
    tab.querySelector('.group-name').textContent = name;

    tab.addEventListener('click', (e) => {
      if (e.target.closest('.group-close')) return;
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      if (ctrl) { e.preventDefault(); toggleGroupSelection(id); return; }
      if (shift && state.lastClickedGroupId) {
        e.preventDefault();
        selectGroupRange(state.lastClickedGroupId, id);
        return;
      }

      clearGroupSelection();
      toggleGroupSelection(id);
      state.lastClickedGroupId = id;
      switchGroup(id);
    });
    tab.querySelector('.group-close').addEventListener('click', (e) => {
      e.stopPropagation();
      const group = state.groups.get(id);
      const count = group ? group.terminalIds.size : 0;
      const msg = count > 0
        ? App.__('confirmCloseGroupWithTerminals', { name: group?.name, count }).replace('{plural}', count !== 1 ? App.__('statusTerminalPlural') : '')
        : App.__('confirmCloseGroup', { name: group?.name });
      App.Menus.showConfirm(msg, () => deleteGroup(id), 'skipGroupCloseConfirm');
    });

    // ── Middle-click to close ──
    tab.addEventListener('auxclick', (e) => {
      if (e.button !== 1) return;
      e.preventDefault();
      e.stopPropagation();
      const group = state.groups.get(id);
      const count = group ? group.terminalIds.size : 0;
      const msg = count > 0
        ? App.__('confirmCloseGroupWithTerminals', { name: group?.name, count }).replace('{plural}', count !== 1 ? App.__('statusTerminalPlural') : '')
        : App.__('confirmCloseGroup', { name: group?.name });
      App.Menus.showConfirm(msg, () => deleteGroup(id), 'skipGroupCloseConfirm');
    });

    // ── Right-click context menu ──
    tab.addEventListener('contextmenu', (e) => {
      App.Menus.showGroupContextMenu(e, id);
    });

    // ── Double-click to rename ──
    const nameEl = tab.querySelector('.group-name');
    nameEl.addEventListener('dblclick', (e) => {
      e.preventDefault(); e.stopPropagation();
      startGroupRename(id);
    });

    // ── Drag-and-drop reorder ──
    tab.addEventListener('dragstart', (e) => {
      e.dataTransfer.effectAllowed = 'move';
      if (state.selectedGroups.has(id) && state.selectedGroups.size > 1) {
        const ids = [...state.selectedGroups];
        e.dataTransfer.setData('text/plain', ids.join(','));
        for (const gid of ids) {
          const el = state.groups.get(gid)?._tabEl;
          if (el) el.classList.add('dragging');
        }
      } else {
        e.dataTransfer.setData('text/plain', id);
        tab.classList.add('dragging');
      }
    });
    tab.addEventListener('dragend', () => {
      for (const el of App.groupList.querySelectorAll('.group-item')) {
        el.classList.remove('dragging');
        el.classList.remove('drag-over');
      }
    });
    tab.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      for (const el of App.groupList.querySelectorAll('.group-item')) {
        el.classList.remove('drag-over');
      }
      tab.classList.add('drag-over');
    });
    tab.addEventListener('drop', (e) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData('text/plain');
      if (!raw) return;
      // Check if this is a tab drag (numeric IDs) or group drag (g-prefixed IDs)
      const isTabDrag = raw.split(',')[0] !== '' && /^\d+$/.test(raw.split(',')[0].trim());
      if (isTabDrag) {
        // Move tabs to this group
        const parts = raw.split(',');
        const tabIds = parts.map(p => isNaN(Number(p)) ? p : Number(p))
          .filter(tid => state.terminals.has(tid));
        if (tabIds.length === 0) return;
        for (const tid of tabIds) {
          App.Groups.moveTerminalToGroup(tid, id);
        }
        App.Tabs.clearTabSelection();
      } else {
        // Group reorder
        const parts = raw.split(',');
        if (parts.length > 1) {
          const draggedIds = parts.filter(gid => gid !== id && state.groups.has(gid));
          if (draggedIds.length === 0) return;
          reorderGroupsMulti(draggedIds, id);
        } else {
          const draggedId = raw;
          if (!draggedId || draggedId === id) return;
          reorderGroups(draggedId, id);
        }
      }
    });

    App.groupList.appendChild(tab);
    group._tabEl = tab;

    if (isDefault) {
      state.activeGroupId = id;
      tab.classList.add('active');
    }
    return group;
  }

  function switchGroup(groupId) {
    if (state.activeGroupId === groupId) return;
    if (!state.groups.has(groupId)) return;

    const oldGroupId = state.activeGroupId;
    const wasEcho = state.echoModeActive;
    if (oldGroupId) {
      state.groupEchoActive.set(oldGroupId, wasEcho);
      if (wasEcho) {
        state.groupEchoSelection.set(oldGroupId, new Set(state.echoSelection));
        state.groupEchoTerminals.set(oldGroupId, new Set(getGroupTerminalIds(oldGroupId)));
      }
    }

    if (wasEcho) {
      App.Echo.destroyGrid();
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
      App.Echo.setEchoButtonLabel(false);
    }

    state.activeGroupId = groupId;
    state.echoModeActive = false;

    for (const [gid, g] of state.groups) {
      if (g._tabEl) g._tabEl.classList.toggle('active', gid === groupId);
    }

    App.Tabs.clearTabSelection();
    state.lastClickedTabId = null;
    refreshGroupVisibility();

    const groupTerminals = getGroupTerminalIds(groupId);
    if (groupTerminals.length > 0) {
      const focusId = groupTerminals.includes(state.activeTerminalId)
        ? state.activeTerminalId : groupTerminals[0];
      App.Terminal.focusTerminal(focusId);
    } else {
      state.activeTerminalId = null;
    }

    const restoreEcho = state.groupEchoActive.get(groupId) || false;
    if (restoreEcho && groupTerminals.length >= 2) {
      state.echoModeActive = true;
      App.Echo.enterEchoMode();
    } else {
      App.Echo.setEchoButtonLabel(false);
    }
    App.UI.updateStatusBar();
  }

  function deleteGroup(groupId) {
    const group = state.groups.get(groupId);
    if (!group) return;
    if (state.groups.size <= 1) {
      App.UI.showToast(App.__('toastCannotDeleteLastGroup'));
      return;
    }

    const wasActive = state.activeGroupId === groupId;
    const targetGroupId = state.groupOrder.find(gid => gid !== groupId);

    // Close all terminals in this group first
    const termIds = [...group.terminalIds];
    for (const tid of termIds) {
      App.Terminal.closeTerminal(tid);
    }

    // Remove the group from state
    if (group._tabEl) group._tabEl.remove();
    state.groups.delete(groupId);
    state.groupEchoActive.delete(groupId);
    state.groupEchoSelection.delete(groupId);
    state.groupEchoTerminals.delete(groupId);
    const idx = state.groupOrder.indexOf(groupId);
    if (idx !== -1) state.groupOrder.splice(idx, 1);

    if (wasActive) {
      // Clean up echo grid/state from the old group if it was active
      if (state.echoModeActive) {
        App.Echo.destroyGrid();
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
        App.Echo.setEchoButtonLabel(false);
        state.echoModeActive = false;
      }

      // Switch to the target group
      state.activeGroupId = targetGroupId;
      for (const [gid, g] of state.groups) {
        if (g._tabEl) g._tabEl.classList.toggle('active', gid === targetGroupId);
      }

      App.Tabs.clearTabSelection();
      state.lastClickedTabId = null;
      refreshGroupVisibility();

      // Focus a terminal so only one pane is shown (not all in a grid)
      const groupTerminals = getGroupTerminalIds(targetGroupId);
      if (groupTerminals.length > 0) {
        const focusId = groupTerminals.includes(state.activeTerminalId)
          ? state.activeTerminalId : groupTerminals[0];
        App.Terminal.focusTerminal(focusId);
      } else {
        state.activeTerminalId = null;
      }

      // Restore echo mode if the target group had it active
      const restoreEcho = state.groupEchoActive.get(targetGroupId) || false;
      if (restoreEcho && groupTerminals.length >= 2) {
        state.echoModeActive = true;
        App.Echo.enterEchoMode();
      } else {
        App.Echo.setEchoButtonLabel(false);
      }
    } else {
      refreshGroupVisibility();
    }

    // Ensure active group terminals are visible and not in grid if only one
    const activeTerms = getGroupTerminalIds(state.activeGroupId);
    if (activeTerms.length === 1 && (state.splitInstance || state.gridSplits.length > 0)) {
      App.Echo.destroyGrid();
    }
    if (activeTerms.length === 1) {
      App.Terminal.setSinglePane(activeTerms[0]);
      const t = state.terminals.get(activeTerms[0]);
      if (t) setTimeout(() => t.fitAddon.fit(), 100);
    } else if (activeTerms.length > 1 && !state.echoModeActive) {
      // Ensure all active group panes are visible without grid
      for (const tid of activeTerms) {
        const t = state.terminals.get(tid);
        if (t) { t.paneEl.style.display = ''; t.paneEl.style.flex = ''; }
      }
      App.Terminal.showOnlyPane(activeTerms[0]);
      App.Terminal.focusTerminal(activeTerms[0]);
    }

    updateGroupTabs();
    App.UI.updateStatusBar();
  }

  function getGroupTerminalIds(groupId) {
    return state.paneOrder.filter(id => state.terminalGroups.get(id) === groupId);
  }

  function refreshGroupVisibility() {
    const activeGroup = state.activeGroupId;
    for (const [tid, t] of state.terminals) {
      const inGroup = state.terminalGroups.get(tid) === activeGroup;
      t.paneEl.style.display = inGroup ? '' : 'none';
    }
    for (const [tid, tab] of App.Tabs.getTabCache()) {
      const inGroup = state.terminalGroups.get(tid) === activeGroup;
      tab.style.display = inGroup ? '' : 'none';
    }
    for (const tid of state.echoSelection) {
      if (state.terminalGroups.get(tid) !== activeGroup) {
        state.echoSelection.delete(tid);
      }
    }
  }

  function updateGroupTabs() {
    for (const [, g] of state.groups) {
      if (g._tabEl) {
        const countEl = g._tabEl.querySelector('.group-count');
        if (countEl) countEl.textContent = g.terminalIds.size;
      }
    }
  }

  function bindGroupBar() {
    App.btnNewGroup.addEventListener('click', () => {
      const count = state.groups.size + 1;
      const group = createGroup(App.__('groupDefaultName', { n: count }));
      switchGroup(group.id);
      App.Terminal.spawnTerminal(state.selectedShell);
    });
  }

  function moveTerminalToGroup(terminalId, targetGroupId) {
    const sourceGroupId = state.terminalGroups.get(terminalId);
    if (!sourceGroupId || sourceGroupId === targetGroupId) return;
    if (!state.groups.has(targetGroupId)) return;

    // Remove from old group
    const oldGroup = state.groups.get(sourceGroupId);
    if (oldGroup) oldGroup.terminalIds.delete(terminalId);

    // Add to new group
    const newGroup = state.groups.get(targetGroupId);
    newGroup.terminalIds.add(terminalId);
    state.terminalGroups.set(terminalId, targetGroupId);

    // If moving the active terminal, switch to the target group
    const wasActive = (terminalId === state.activeTerminalId);
    if (wasActive && state.activeGroupId !== targetGroupId) {
      switchGroup(targetGroupId);
    }

    updateGroupTabs();
    refreshGroupVisibility();
    App.UI.updateStatusBar();
  }

  function reorderGroups(draggedId, targetId) {
    const fromIdx = state.groupOrder.indexOf(draggedId);
    const toIdx = state.groupOrder.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;

    state.groupOrder.splice(fromIdx, 1);

    if (fromIdx < toIdx) {
      state.groupOrder.splice(toIdx, 0, draggedId);
    } else {
      state.groupOrder.splice(toIdx, 0, draggedId);
    }

    const draggedEl = state.groups.get(draggedId)?._tabEl;
    const targetEl = state.groups.get(targetId)?._tabEl;
    if (draggedEl && targetEl && draggedEl !== targetEl) {
      if (fromIdx < toIdx) {
        App.groupList.insertBefore(draggedEl, targetEl.nextSibling);
      } else {
        App.groupList.insertBefore(draggedEl, targetEl);
      }
    }
  }

  function toggleGroupSelection(gid) {
    if (state.selectedGroups.has(gid)) {
      state.selectedGroups.delete(gid);
      const el = state.groups.get(gid)?._tabEl;
      if (el) el.classList.remove('selected');
    } else {
      state.selectedGroups.add(gid);
      const el = state.groups.get(gid)?._tabEl;
      if (el) el.classList.add('selected');
    }
  }

  function clearGroupSelection() {
    for (const gid of state.selectedGroups) {
      const el = state.groups.get(gid)?._tabEl;
      if (el) el.classList.remove('selected');
    }
    state.selectedGroups.clear();
  }

  function selectGroupRange(fromId, toId) {
    const fromIdx = state.groupOrder.indexOf(fromId);
    const toIdx = state.groupOrder.indexOf(toId);
    if (fromIdx === -1 || toIdx === -1) return;
    clearGroupSelection();
    const start = Math.min(fromIdx, toIdx);
    const end = Math.max(fromIdx, toIdx);
    for (let i = start; i <= end; i++) {
      const gid = state.groupOrder[i];
      state.selectedGroups.add(gid);
      const el = state.groups.get(gid)?._tabEl;
      if (el) el.classList.add('selected');
    }
  }

  function reorderGroupsMulti(draggedIds, targetId) {
    const ordered = state.groupOrder.filter(gid => draggedIds.includes(gid));
    if (ordered.length === 0) return;

    for (const did of ordered) {
      const idx = state.groupOrder.indexOf(did);
      if (idx !== -1) state.groupOrder.splice(idx, 1);
    }

    let insertIdx = state.groupOrder.indexOf(targetId);
    if (insertIdx === -1) insertIdx = state.groupOrder.length;
    else insertIdx = insertIdx + 1;
    state.groupOrder.splice(insertIdx, 0, ...ordered);

    const targetEl = state.groups.get(targetId)?._tabEl;
    if (!targetEl) return;
    const ref = targetEl.nextSibling;
    for (const did of ordered) {
      const de = state.groups.get(did)?._tabEl;
      if (de) App.groupList.insertBefore(de, ref);
    }
  }

  function startGroupRename(groupId) {
    const group = state.groups.get(groupId);
    if (!group || !group._tabEl) return;

    const nameEl = group._tabEl.querySelector('.group-name');
    if (!nameEl) return;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'inline-rename-input';
    input.value = group.name;

    state.isRenaming = true;
    group._tabEl.draggable = false;
    nameEl.style.display = 'none';
    nameEl.parentNode.insertBefore(input, nameEl);
    input.focus();
    input.select();

    const finish = (save) => {
      if (save && input.value.trim()) {
        renameGroup(groupId, input.value.trim());
      }
      input.remove();
      nameEl.style.display = '';
      state.isRenaming = false;
      group._tabEl.draggable = true;
    };

    input.addEventListener('blur', () => finish(true));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    });
  }

  function renameGroup(groupId, newName) {
    const group = state.groups.get(groupId);
    if (!group) return;
    group.name = newName;
    if (group._tabEl) {
      const nameEl = group._tabEl.querySelector('.group-name');
      if (nameEl) nameEl.textContent = newName;
    }
  }

  App.Groups = {
    createGroup, switchGroup, deleteGroup,
    getGroupTerminalIds, refreshGroupVisibility, updateGroupTabs,
    bindGroupBar, moveTerminalToGroup, reorderGroups,
    toggleGroupSelection, clearGroupSelection, selectGroupRange,
    reorderGroupsMulti,
    startGroupRename, renameGroup,
  };
})();

export {};
