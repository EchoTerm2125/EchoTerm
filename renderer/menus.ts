/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Context Menus & Dialogs
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';
  const state = App.state;
  const $ = App.$;

  const contextMenu = $('#contextMenu');
  const tabContextMenu = $('#tabContextMenu');
  const groupContextMenu = $('#groupContextMenu');
  let contextTargetId = null;
  let groupContextTargetId = null;
  const MENU_EDGE_MARGIN = 8;

  function positionContextMenu(menu, x, y) {
    menu.classList.remove('hidden');
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    const rect = menu.getBoundingClientRect();
    const maxLeft = window.innerWidth - rect.width - MENU_EDGE_MARGIN;
    const maxTop = window.innerHeight - rect.height - MENU_EDGE_MARGIN;
    if (rect.left > maxLeft) menu.style.left = `${Math.max(MENU_EDGE_MARGIN, maxLeft)}px`;
    if (rect.top > maxTop) menu.style.top = `${Math.max(MENU_EDGE_MARGIN, maxTop)}px`;
  }

  function bindContextMenu(paneEl, id) {
    const echoBtn = $('#ctxEcho');
    const echoSep = $('#ctxEchoSep');
    const pasteAllBtn = $('#ctxPasteAll');
    const showMenu = (e) => {
      e.preventDefault(); e.stopPropagation();
      contextTargetId = id;
      // Show echo toggle only when echo mode is active
      const show = state.echoModeActive;
      if (echoBtn) echoBtn.classList.toggle('hidden', !show);
      if (echoSep) echoSep.classList.toggle('hidden', !show);
      if (pasteAllBtn) pasteAllBtn.classList.toggle('hidden', !show);
      positionContextMenu(contextMenu, e.clientX, e.clientY);
    };
    paneEl.querySelector('.pane-titlebar').addEventListener('contextmenu', showMenu);
    const xtermCtr = paneEl.querySelector('.xterm-container');
    if (xtermCtr) xtermCtr.addEventListener('contextmenu', showMenu);
  }

  function showTabContextMenu(e, id) {
    App.Tabs.setTabContextTargetId(id);
    if (!state.selectedTabs.has(id)) {
      App.Tabs.clearTabSelection();
      App.Tabs.toggleTabSelection(id);
      state.lastClickedTabId = id;
    }
    const selCount = state.selectedTabs.size;
    const btnCloseSelected = $('#btnCloseSelected');
    if (btnCloseSelected) {
      if (selCount > 1) {
        btnCloseSelected.textContent = App.__('tabCtxCloseSelected') + ` (${selCount})`;
        btnCloseSelected.classList.remove('hidden');
      } else {
        btnCloseSelected.classList.add('hidden');
      }
    }

    // Populate "Move to Group" submenu
    const currentGroupId = state.terminalGroups.get(id);
    const submenu = App.tabCtxGroupSubmenu;
    submenu.innerHTML = '';
    let hasOtherGroups = false;
    for (const gid of state.groupOrder) {
      if (gid === currentGroupId) continue;
      const g = state.groups.get(gid);
      if (!g) continue;
      hasOtherGroups = true;
      const btn = document.createElement('button');
      btn.textContent = g.name;
      btn.addEventListener('click', () => {
        closeAllMenus();
        App.Tabs.setTabContextTargetId(null);
        const toMove = state.selectedTabs.size > 0
          ? [...state.selectedTabs]
          : [id];
        for (const tid of toMove) {
          App.Groups.moveTerminalToGroup(tid, gid);
        }
        App.Tabs.clearTabSelection();
      });
      submenu.appendChild(btn);
    }

    const showMove = hasOtherGroups;
    if (App.tabCtxMoveSep) App.tabCtxMoveSep.classList.toggle('hidden', !showMove);
    if (App.tabCtxMoveItem) App.tabCtxMoveItem.classList.toggle('hidden', !showMove);
    // Ensure submenu starts hidden
    submenu.classList.add('hidden');

    positionContextMenu(tabContextMenu, e.clientX, e.clientY);
  }

  function showGroupContextMenu(e, groupId) {
    e.preventDefault(); e.stopPropagation();
    groupContextTargetId = groupId;

    // Select the right-clicked group if not already selected
    if (!state.selectedGroups.has(groupId)) {
      App.Groups.clearGroupSelection();
      App.Groups.toggleGroupSelection(groupId);
      state.lastClickedGroupId = groupId;
    }

    const group = state.groups.get(groupId);
    const termCount = group ? group.terminalIds.size : 0;

    // Show/hide "Close All Terminals" based on whether group has terminals
    const btnCloseTerminals = groupContextMenu.querySelector('[data-action="group-close-terminals"]');
    if (btnCloseTerminals) {
      if (termCount > 0) {
        btnCloseTerminals.textContent = App.__('groupCtxCloseTerminals') + ` (${termCount})`;
        btnCloseTerminals.classList.remove('hidden');
      } else {
        btnCloseTerminals.classList.add('hidden');
      }
    }

    // Show/hide "Close Group" based on whether it's the last group
    const btnDelete = groupContextMenu.querySelector('[data-action="group-delete"]');
    if (btnDelete) {
      btnDelete.classList.toggle('hidden', state.groups.size <= 1);
    }

    positionContextMenu(groupContextMenu, e.clientX, e.clientY);
  }

  function closeAllMenus() {
    contextMenu.classList.add('hidden');
    tabContextMenu.classList.add('hidden');
    groupContextMenu.classList.add('hidden');
    if (App.tabCtxGroupSubmenu) App.tabCtxGroupSubmenu.classList.add('hidden');
  }

  function bindSubmenuHover() {
    const trigger = App.tabCtxMoveItem;
    const submenu = App.tabCtxGroupSubmenu;
    if (!trigger || !submenu) return;

    let hideTimer = null;

    trigger.addEventListener('mouseenter', () => {
      clearTimeout(hideTimer);
      submenu.classList.remove('hidden');
    });

    trigger.addEventListener('mouseleave', () => {
      hideTimer = setTimeout(() => submenu.classList.add('hidden'), 150);
    });

    submenu.addEventListener('mouseenter', () => {
      clearTimeout(hideTimer);
    });

    submenu.addEventListener('mouseleave', () => {
      hideTimer = setTimeout(() => submenu.classList.add('hidden'), 150);
    });
  }

  function setupContextMenu() {
    contextMenu.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const id = contextTargetId;
        contextMenu.classList.add('hidden');
        contextTargetId = null;
        if (!id) return;

        switch (action) {
          case 'copy': {
            const ts = state.terminals.get(id);
            if (ts?.term) {
              const sel = ts.term.getSelection();
              if (sel) navigator.clipboard.writeText(sel).catch(() => {});
            }
            break;
          }
          case 'paste': {
            App.Terminal.pasteToTerminal(id);
            break;
          }
          case 'paste-all': {
            App.Terminal.pasteToTerminal(null);
            break;
          }
          case 'echo': {
            const t = state.terminals.get(id);
            if (t) {
              const cb = t.titlebar.querySelector('input[type="checkbox"]');
              if (cb) {
                cb.checked = !cb.checked;
                if (cb.checked) {
                  state.echoSelection.add(id);
                  t.paneEl.classList.add('echo-selected');
                  t.titlebar.querySelector('.pane-checkbox').classList.add('selected');
                } else {
                  state.echoSelection.delete(id);
                  t.paneEl.classList.remove('echo-selected');
                  t.titlebar.querySelector('.pane-checkbox').classList.remove('selected');
                }
                App.UI.updateStatusBar();
              }
            }
            break;
          }
          case 'close':
            showConfirm(
              App.__('confirmCloseTerminal'),
              () => App.Terminal.closeTerminal(id),
              'skipTabCloseConfirm'
            );
            break;
        }
      });
    });

    tabContextMenu.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const id = App.Tabs.getTabContextTargetId();
        tabContextMenu.classList.add('hidden');
        App.Tabs.setTabContextTargetId(null);
        if (!id) return;

        switch (action) {
          case 'tab-rename':
            App.Tabs.startTabRename(id);
            break;
          case 'tab-close':
            showConfirm(
              App.__('confirmCloseTerminal'),
              () => App.Terminal.closeTerminal(id),
              'skipTabCloseConfirm'
            );
            break;
          case 'tab-close-selected': {
            const selCopy = [...state.selectedTabs];
            const count = selCopy.length;
            showConfirm(
              App._p('confirmCloseSelectedTerminals', count),
              () => {
                for (const tid of selCopy) App.Terminal.closeTerminal(tid);
                App.Tabs.clearTabSelection();
              },
              'skipTabCloseConfirm'
            );
            break;
          }
          case 'tab-close-others': {
            const ids = App.Groups.getGroupTerminalIds(state.activeGroupId);
            const others = ids.filter(tid => tid !== id);
            const count = others.length;
            showConfirm(
              App._p('confirmCloseOtherTerminals', count),
              () => { for (const tid of others) App.Terminal.closeTerminal(tid); },
              'skipTabCloseConfirm'
            );
            break;
          }
        }
      });
    });

    // ── Group context menu handlers ──
    groupContextMenu.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const id = groupContextTargetId;
        groupContextMenu.classList.add('hidden');
        groupContextTargetId = null;
        if (!id) return;

        switch (action) {
          case 'group-rename':
            App.Groups.startGroupRename(id);
            break;
          case 'group-delete': {
            const group = state.groups.get(id);
            const count = group ? group.terminalIds.size : 0;
            const msg = count > 0
              ? App.__('confirmCloseGroupWithTerminals', { name: group?.name, count }).replace('{plural}', count !== 1 ? App.__('statusTerminalPlural') : '')
              : App.__('confirmCloseGroup', { name: group?.name });
            showConfirm(msg, () => App.Groups.deleteGroup(id), 'skipGroupCloseConfirm');
            break;
          }
          case 'group-close-terminals': {
            const group = state.groups.get(id);
            if (!group) return;
            const termIds = [...group.terminalIds];
            const count = termIds.length;
            if (count === 0) return;
            showConfirm(
              App.__('confirmCloseAllGroupTerminals', { count, name: group.name }).replace('{plural}', count !== 1 ? App.__('statusTerminalPlural') : ''),
              () => {
                for (const tid of termIds) App.Terminal.closeTerminal(tid);
              },
              'skipTabCloseConfirm'
            );
            break;
          }
        }
      });
    });

    document.addEventListener('click', () => {
      closeAllMenus();
    });
    document.addEventListener('contextmenu', () => {
      closeAllMenus();
    });
  }

  // ─── Reusable confirm dialog ───────────────────────────────────────────────
  let _confirmDialog, _confirmMessage, _confirmOk, _confirmCancel, _confirmDontShow;
  let _confirmCallback = null;
  let _confirmStorageKey = null;

  function initConfirmDialog() {
    if (_confirmDialog) return;
    _confirmDialog = $('#confirmDialog');
    _confirmMessage = $('#confirmMessage');
    _confirmOk = $('#confirmOk');
    _confirmCancel = $('#confirmCancel');
    _confirmDontShow = $('#confirmDontShowAgain');

    _confirmOk.addEventListener('click', () => {
      _confirmDialog.classList.add('hidden');
      if (_confirmDontShow?.checked && _confirmStorageKey) {
        localStorage.setItem(_confirmStorageKey, 'true');
      }
      if (_confirmCallback) _confirmCallback();
      _confirmCallback = null;
      _confirmStorageKey = null;
    });
    _confirmCancel.addEventListener('click', () => {
      _confirmDialog.classList.add('hidden');
      _confirmCallback = null;
      _confirmStorageKey = null;
    });
    _confirmDialog.addEventListener('click', (e) => {
      if (e.target === _confirmDialog) {
        _confirmDialog.classList.add('hidden');
        _confirmCallback = null;
        _confirmStorageKey = null;
      }
    });
  }

  function showConfirm(message, callback, storageKey, okLabelKey?) {
    initConfirmDialog();
    if (storageKey && localStorage.getItem(storageKey) === 'true') {
      callback();
      return;
    }
    _confirmMessage.textContent = message;
    _confirmOk.textContent = App.__(okLabelKey || 'confirmClose');
    _confirmCallback = callback;
    _confirmStorageKey = storageKey || null;
    if (_confirmDontShow) _confirmDontShow.checked = false;
    _confirmDialog.classList.remove('hidden');
  }

  // ─── Close confirm dialog (app window) ────────────────────────────────────
  function bindCloseConfirmDialog() {
    initConfirmDialog();
    const unsubClose = App.api.onConfirmClose(() => {
      showConfirm(
        App.__('confirmCloseApp'),
        () => App.api.confirmClose(),
        'skipCloseConfirm'
      );
    });
    state.dataUnsubscribers.push(unsubClose);
  }

  App.Menus = {
    bindContextMenu, showTabContextMenu, showGroupContextMenu, setupContextMenu,
    bindCloseConfirmDialog, showConfirm, bindSubmenuHover, positionContextMenu,
  };
})();

export {};
