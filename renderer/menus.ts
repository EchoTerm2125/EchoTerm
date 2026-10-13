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

  // Keep a submenu flyout inside the window: open it to the left when it would
  // overflow the right edge, and shift it up when it would overflow the bottom.
  function positionSubmenu(submenu) {
    if (!submenu || submenu.classList.contains('hidden')) return;
    const trigger = submenu.parentElement;
    if (!trigger) return;
    const triggerRect = trigger.getBoundingClientRect();
    const rect = submenu.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // The default CSS opens the flyout to the right of the trigger (left: 100%)
    if (triggerRect.right + rect.width + 2 > vw - MENU_EDGE_MARGIN) {
      // Open to the left instead, clamped so the left edge stays in the viewport
      const left = Math.max(MENU_EDGE_MARGIN, triggerRect.left - rect.width - 2) - triggerRect.left;
      submenu.style.left = `${left}px`;
    } else {
      submenu.style.left = '';
    }

    // The default CSS places the flyout at top: -4px relative to the trigger
    const overflowBottom = triggerRect.top - 4 + rect.height - (vh - MENU_EDGE_MARGIN);
    submenu.style.top = overflowBottom > 0 ? `${-4 - overflowBottom}px` : '';
  }

  // Hide the given menu items: a multi-selection activates the batch actions,
  // so items that only make sense for one target disappear.
  function toggleMenuItems(menu, actions, hidden) {
    for (const action of actions) {
      const btn = menu.querySelector(`[data-action="${action}"]`);
      if (btn) btn.classList.toggle('hidden', hidden);
    }
  }

  // Hide any separator that no longer divides two visible items, so hiding a
  // menu item never leaves a dangling or leading/trailing divider.
  function syncSeparators(menu) {
    const children = [...menu.children];
    children.forEach((el, i) => {
      if (!el.classList.contains('context-separator')) return;
      const before = children.slice(0, i).some((c) => !c.classList.contains('hidden'));
      const after = children.slice(i + 1).some((c) => !c.classList.contains('hidden'));
      el.classList.toggle('hidden', !before || !after);
    });
  }

  // ── Shared submenu structure ──────────────────────────────────────────────
  // Every context submenu is a pinned Filter box over a height-capped scrolling
  // option list. buildSubmenu() rebuilds both from option entries; typing in the
  // Filter box narrows the list to matching options.
  const SUBMENU_FILTER = '.context-submenu-filter';
  const SUBMENU_OPTIONS = '.context-submenu-options';
  const SUBMENU_EMPTY = '.context-submenu-empty';

  function buildSubmenu(submenu, entries) {
    submenu.innerHTML = '';

    const filter = document.createElement('input');
    filter.type = 'text';
    filter.className = 'context-submenu-filter';
    filter.placeholder = App.__('submenuFilterPlaceholder');
    filter.setAttribute('aria-label', filter.placeholder);
    filter.autocomplete = 'off';
    filter.spellcheck = false;
    // A click here must not bubble to the document's close-all-menus listener.
    filter.addEventListener('click', (e) => e.stopPropagation());
    filter.addEventListener('input', () => applySubmenuFilter(submenu));
    filter.addEventListener('keydown', (e) => onSubmenuFilterKeydown(submenu, e));
    submenu.appendChild(filter);

    const list = document.createElement('div');
    list.className = 'context-submenu-options';
    for (const { label, onClick } of entries) {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.addEventListener('click', onClick);
      list.appendChild(btn);
    }
    submenu.appendChild(list);

    const empty = document.createElement('div');
    empty.className = 'context-submenu-empty hidden';
    empty.textContent = App.__('submenuFilterNoMatches');
    submenu.appendChild(empty);
  }

  // Case-insensitive substring match over the option labels; options that do
  // not match are hidden and the empty text stands in for an empty list.
  function applySubmenuFilter(submenu) {
    const filter = submenu.querySelector(SUBMENU_FILTER);
    const list = submenu.querySelector(SUBMENU_OPTIONS);
    const empty = submenu.querySelector(SUBMENU_EMPTY);
    if (!filter || !list || !empty) return;
    const q = (filter.value || '').trim().toLowerCase();
    let visible = 0;
    for (const btn of list.children) {
      const match = !q || (btn.textContent || '').toLowerCase().includes(q);
      btn.classList.toggle('hidden', !match);
      btn.classList.remove('highlighted');
      if (match) visible++;
    }
    empty.classList.toggle('hidden', visible > 0);
  }

  function visibleSubmenuOptions(submenu) {
    return [...submenu.querySelectorAll(`${SUBMENU_OPTIONS} button:not(.hidden)`)];
  }

  function highlightSubmenuOption(submenu, idx) {
    const opts = visibleSubmenuOptions(submenu);
    if (opts.length === 0) return;
    const clamped = Math.max(0, Math.min(idx, opts.length - 1));
    for (const o of opts) o.classList.remove('highlighted');
    opts[clamped].classList.add('highlighted');
    opts[clamped].scrollIntoView({ block: 'nearest' });
  }

  function onSubmenuFilterKeydown(submenu, e) {
    const opts = visibleSubmenuOptions(submenu);
    const idx = opts.findIndex((b) => b.classList.contains('highlighted'));
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        highlightSubmenuOption(submenu, idx + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        highlightSubmenuOption(submenu, idx - 1);
        break;
      case 'Enter': {
        // The highlighted option, else the only/first visible one.
        e.preventDefault();
        const target = idx >= 0 ? opts[idx] : opts[0];
        if (target) target.click();
        break;
      }
      case 'Escape':
        e.preventDefault();
        if (e.currentTarget.value) {
          e.currentTarget.value = '';
          applySubmenuFilter(submenu);
          highlightSubmenuOption(submenu, 0);
        } else {
          closeAllMenus();
        }
        break;
    }
  }

  // The Filter box takes focus as the submenu opens so typing filters right
  // away. Focus also pins the flyout open (see bindSubmenuHover).
  function openSubmenu(submenu) {
    submenu.classList.remove('hidden');
    const filter = submenu.querySelector(SUBMENU_FILTER);
    if (filter) filter.focus();
    applySubmenuFilter(submenu);
    positionSubmenu(submenu);
  }

  // A closed submenu never keeps stale filter text: reopening always shows the
  // full list.
  function closeSubmenu(submenu) {
    if (!submenu) return;
    submenu.classList.add('hidden');
    const filter = submenu.querySelector(SUBMENU_FILTER);
    if (filter && filter.value) {
      filter.value = '';
      applySubmenuFilter(submenu);
    }
  }

  function bindContextMenu(paneEl, id) {
    const echoBtn = $('#ctxEcho');
    const echoSep = $('#ctxEchoSep');
    const pasteAllBtn = $('#ctxPasteAll');
    const reconnectBtn = $('#ctxReconnect');
    const reconnectSep = $('#ctxReconnectSep');
    const showMenu = (e) => {
      e.preventDefault(); e.stopPropagation();
      contextTargetId = id;
      // Show echo toggle only when echo mode is active
      const show = state.echoModeActive;
      if (echoBtn) echoBtn.classList.toggle('hidden', !show);
      if (echoSep) echoSep.classList.toggle('hidden', !show);
      if (pasteAllBtn) pasteAllBtn.classList.toggle('hidden', !show);
      // Reconnect is an SSH-pane action; its separator goes with it.
      const ts = state.terminals.get(id);
      const showReconnect = !!ts && ts.shell === 'ssh';
      if (reconnectBtn) reconnectBtn.classList.toggle('hidden', !showReconnect);
      if (reconnectSep) reconnectSep.classList.toggle('hidden', !showReconnect);
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
    const multi = selCount > 1;
    const btnCloseSelected = $('#btnCloseSelected');
    if (btnCloseSelected) {
      if (multi) {
        btnCloseSelected.textContent = App.__('tabCtxCloseSelected') + ` (${selCount})`;
        btnCloseSelected.classList.remove('hidden');
      } else {
        btnCloseSelected.classList.add('hidden');
      }
    }
    // Single-target items disappear under a multi-selection.
    toggleMenuItems(tabContextMenu, ['tab-rename', 'tab-close'], multi);

    // Reconnect targets SSH panes only; across a multi-selection it becomes a
    // batch action over the SSH tabs in it.
    const reconnectBtn = tabContextMenu.querySelector('[data-action="tab-reconnect"]');
    if (reconnectBtn) {
      const sshCount = [...state.selectedTabs]
        .filter((tid) => state.terminals.get(tid)?.shell === 'ssh').length;
      reconnectBtn.classList.toggle('hidden', sshCount === 0);
      reconnectBtn.textContent = sshCount > 1
        ? App.__('tabCtxReconnectSelected') + ` (${sshCount})`
        : App.__('tabCtxReconnect');
    }

    // "Close Others" is selection-relative and shows how many tabs it closes.
    const btnCloseOthers = tabContextMenu.querySelector('[data-action="tab-close-others"]');
    if (btnCloseOthers) {
      const others = App.Groups.getGroupTerminalIds(state.activeGroupId)
        .filter((tid) => !state.selectedTabs.has(tid));
      if (others.length > 0) {
        btnCloseOthers.textContent = App.__('tabCtxCloseOthers') + ` (${others.length})`;
        btnCloseOthers.classList.remove('hidden');
      } else {
        btnCloseOthers.classList.add('hidden');
      }
    }

    // Populate "Move to Group" submenu
    const currentGroupId = state.terminalGroups.get(id);
    const submenu = App.tabCtxGroupSubmenu;
    const entries = [];
    for (const gid of state.groupOrder) {
      if (gid === currentGroupId) continue;
      const g = state.groups.get(gid);
      if (!g) continue;
      entries.push({
        label: g.name,
        onClick: () => {
          closeAllMenus();
          App.Tabs.setTabContextTargetId(null);
          const toMove = state.selectedTabs.size > 0
            ? [...state.selectedTabs]
            : [id];
          for (const tid of toMove) {
            App.Groups.moveTerminalToGroup(tid, gid);
          }
          App.Tabs.clearTabSelection();
        },
      });
    }
    buildSubmenu(submenu, entries);

    const showMove = entries.length > 0;
    if (App.tabCtxMoveSep) App.tabCtxMoveSep.classList.toggle('hidden', !showMove);
    if (App.tabCtxMoveItem) App.tabCtxMoveItem.classList.toggle('hidden', !showMove);
    // Ensure submenu starts hidden
    submenu.classList.add('hidden');

    syncSeparators(tabContextMenu);
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
    const multi = state.selectedGroups.size > 1;

    // Single-target items disappear under a multi-selection.
    toggleMenuItems(groupContextMenu, ['group-rename', 'group-delete'], multi);

    // Show/hide "Close All Terminals" based on whether group has terminals
    const btnCloseTerminals = groupContextMenu.querySelector('[data-action="group-close-terminals"]');
    if (btnCloseTerminals) {
      if (!multi && termCount > 0) {
        btnCloseTerminals.textContent = App.__('groupCtxCloseTerminals') + ` (${termCount})`;
        btnCloseTerminals.classList.remove('hidden');
      } else {
        btnCloseTerminals.classList.add('hidden');
      }
    }

    // "Close Selected" needs a multi-selection; "Close Others" needs at least
    // one group left out of it.
    const selCount = state.selectedGroups.size;
    const btnCloseSelected = groupContextMenu.querySelector('[data-action="group-close-selected"]');
    if (btnCloseSelected) {
      if (selCount > 1) {
        btnCloseSelected.textContent = App.__('groupCtxCloseSelected') + ` (${selCount})`;
        btnCloseSelected.classList.remove('hidden');
      } else {
        btnCloseSelected.classList.add('hidden');
      }
    }
    const btnCloseOthers = groupContextMenu.querySelector('[data-action="group-close-others"]');
    if (btnCloseOthers) {
      const otherCount = state.groups.size - selCount;
      if (otherCount > 0) {
        btnCloseOthers.textContent = App.__('groupCtxCloseOthers') + ` (${otherCount})`;
        btnCloseOthers.classList.remove('hidden');
      } else {
        btnCloseOthers.classList.add('hidden');
      }
    }

    syncSeparators(groupContextMenu);
    positionContextMenu(groupContextMenu, e.clientX, e.clientY);
  }

  function closeAllMenus() {
    contextMenu.classList.add('hidden');
    tabContextMenu.classList.add('hidden');
    groupContextMenu.classList.add('hidden');
    // Every open flyout, whoever built it (tab groups, SSH folders, …).
    for (const sub of document.querySelectorAll('.context-submenu')) {
      closeSubmenu(sub);
    }
  }

  function bindSubmenuHover() {
    const trigger = App.tabCtxMoveItem;
    const submenu = App.tabCtxGroupSubmenu;
    if (!trigger || !submenu) return;

    let hideTimer = null;

    // While the Filter box has focus the user is typing into the flyout, so the
    // hover-based hide must not pull it away mid-word.
    const focusIsInside = () => submenu.contains(document.activeElement);
    const hide = () => {
      if (focusIsInside()) return;
      closeSubmenu(submenu);
    };

    trigger.addEventListener('mouseenter', () => {
      clearTimeout(hideTimer);
      openSubmenu(submenu);
    });

    trigger.addEventListener('mouseleave', () => {
      hideTimer = setTimeout(hide, 150);
    });

    submenu.addEventListener('mouseenter', () => {
      clearTimeout(hideTimer);
    });

    submenu.addEventListener('mouseleave', () => {
      hideTimer = setTimeout(hide, 150);
    });

    // The flyout is pinned open while it holds focus; once focus leaves, the
    // next hover-out closes it normally.
    submenu.addEventListener('focusout', () => {
      setTimeout(() => {
        if (!trigger.matches(':hover') && !submenu.matches(':hover') && !focusIsInside()) {
          closeSubmenu(submenu);
        }
      }, 0);
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
          case 'reconnect': {
            App.Terminal.requestReconnect(id);
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
          case 'tab-reconnect': {
            // Every selected SSH tab, or the single target.
            if (state.selectedTabs.size > 1) App.Terminal.reconnectTabs([...state.selectedTabs]);
            else App.Terminal.requestReconnect(id);
            break;
          }
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
            // "Others" is relative to the whole selection, not the right-clicked
            // tab, so the other selected tabs survive.
            const ids = App.Groups.getGroupTerminalIds(state.activeGroupId);
            const others = ids.filter(tid => !state.selectedTabs.has(tid));
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
          case 'group-close-selected': {
            const ids = [...state.selectedGroups];
            const count = ids.length;
            if (count === 0) return;
            showConfirm(
              App._p('confirmCloseSelectedGroups', count),
              () => App.Groups.closeGroups(ids),
              'skipGroupCloseConfirm'
            );
            break;
          }
          case 'group-close-others': {
            const others = state.groupOrder.filter(gid => !state.selectedGroups.has(gid));
            const count = others.length;
            if (count === 0) return;
            showConfirm(
              App._p('confirmCloseOtherGroups', count),
              () => App.Groups.closeGroups(others),
              'skipGroupCloseConfirm'
            );
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
    if (_confirmDontShow) {
      _confirmDontShow.checked = false;
      // Without a storage key the dialog always warns — hide the now-pointless
      // "Don't show this again" checkbox (e.g. the update-install warning).
      const rememberLabel = _confirmDontShow.closest('.confirm-remember') as HTMLElement | null;
      if (rememberLabel) rememberLabel.classList.toggle('hidden', !storageKey);
    }
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
    bindCloseConfirmDialog, showConfirm, bindSubmenuHover, positionContextMenu, positionSubmenu,
    buildSubmenu, openSubmenu, closeSubmenu, applySubmenuFilter,
  };
})();

export {};
