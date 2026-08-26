/* EchoTerm — SSH Connection Panel (Sidebar + Dialogs) */

import type { SshUser, SshConnection, SshFolder } from '../shared/ipc';

(function () {
  'use strict';
  const $ = App.$;
  const api = App.api;

  // --- DOM refs
  const sshSidebar = $('#sshSidebar');
  const sidebarToggleBtn = $('#btnSidebarToggle');
  const sshConnList = $('#sshConnectionList');
  const sshUserList = $('#sshUserList');
  const sshPasswordDialog = $('#sshPasswordDialog');
  const sshPasswordTitle = $('#sshPasswordTitle');
  const sshPasswordInput = $('#sshPasswordInput');
  const sshPasswordConfirm = $('#sshPasswordConfirm');
  const sshPasswordConfirmGroup = $('#sshPasswordConfirmGroup');
  const sshPasswordError = $('#sshPasswordError');
  const sshPasswordBtn = $('#sshPasswordBtn');
  const sshPasswordSkip = $('#sshPasswordSkip');
  const sshPasswordCancel = $('#sshPasswordCancel');
  const sshImportDialog = $('#sshImportDialog');
  const sshImportBody = $('#sshImportBody');
  const sshImportCancel = $('#sshImportCancel');
  const sshImportConfirm = $('#sshImportConfirm');
  const sshContextMenu = $('#sshContextMenu');
  const sshCtxMoveItem = $('#sshCtxMoveItem');
  const sshCtxFolderSubmenu = $('#sshCtxFolderSubmenu');
  const sshDialog = $('#sshDialog');
  const sshDialogTitle = $('#sshDialogTitle');
  const sshDialogBody = $('#sshDialogBody');
  const sshDialogSave = $('#sshDialogSave');
  const sshDialogCancel = $('#sshDialogCancel');

  let passwordMode = 'unlock'; // 'setup' | 'unlock'
  let sshContextTarget = null; // { type: 'group'|'connection'|'user', id }
  let pendingAdoptTarget = null; // { type: 'group'|'connection', ids: string[] } — set by "Add Parent Folder"
  let editingConnectionId = null;
  let editingFolderId = null;
  let editingUserId = null;

  // --- Multi-select state
  const sshSelected = new Set<string>();    // Set of "type:id" strings, e.g. "connection:c1"
  let sshLastClicked = null;      // "type:id" string
  let sshSelectType = null;       // 'group' | 'connection' | 'user'

  // --- Initialization
  async function init() {
    if (!sshSidebar) return;

    // Toggle sidebar
    if (sidebarToggleBtn) {
      sidebarToggleBtn.addEventListener('click', () => {
        if (sshSidebar.classList.contains('collapsed')) {
          // Expanding: restore inline width or fall back to saved/default
          sshSidebar.classList.remove('collapsed');
          const savedWidth = localStorage.getItem('sshSidebarWidth');
          sshSidebar.style.width = savedWidth ? savedWidth + 'px' : '';
        } else {
          // Collapsing: clear inline width so CSS class wins
          sshSidebar.style.width = '';
          sshSidebar.classList.add('collapsed');
        }
      });
    }

    // --- Check password status
    const status = await api.sshPasswordStatus();
    if (status.masterPasswordSet && !status.unlocked) {
      await showPasswordUnlock();
    } else if (!status.unlocked) {
      // Try auto-unlock with safeStorage
      const result = await api.sshTryUnlock();
      if (!result.success) {
        // Prompt user to set up or try password
        await showPasswordSetup();
      }
    }

    // --- Load data
    await refreshAll();

    // --- Bind panel buttons
    bindPanelButtons();
    bindPasswordDialog();
    bindDialog();
    bindKeyboardShortcut();

    // --- Search filter
    bindSearchFilter();

    // --- Password lock button
    const btnPassword = $('#btnSshPassword');
    if (btnPassword) {
      btnPassword.addEventListener('click', async () => {
        const status = await api.sshPasswordStatus();
        if (status.masterPasswordSet && !status.unlocked) {
          await showPasswordUnlock();
        } else {
          await showPasswordSetup(status.masterPasswordSet);
        }
      });
      // Update lock icon based on status
      updatePasswordIcon();
    }

    // --- Import / Update / Export buttons
    const btnImport = $('#btnSshImport');
    if (btnImport) btnImport.addEventListener('click', () => { closeSshHeaderDropdown(); showImportDialog('import'); });
    const btnUpdate = $('#btnSshUpdate');
    if (btnUpdate) btnUpdate.addEventListener('click', () => { closeSshHeaderDropdown(); showImportDialog('update'); });
    const btnExport = $('#btnSshExport');
    if (btnExport) btnExport.addEventListener('click', async () => {
      closeSshHeaderDropdown();
      const result = await api.sshExportConfig();
      if (result.canceled) return;
      if (result.error) {
        App.UI.showToast(App.__('toastError', { message: result.error }));
      } else if (result.success) {
        App.UI.showToast(App.__('toastSshExported', { path: result.path }));
      }
    });

    // --- SSH header dropdown toggle
    const btnMenuToggle = $('#btnSshMenuToggle');
    const sshHeaderDropdown = $('#sshHeaderDropdown');
    if (btnMenuToggle && sshHeaderDropdown) {
      btnMenuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        sshHeaderDropdown.classList.toggle('hidden');
      });
      document.addEventListener('click', (e) => {
        if (!sshHeaderDropdown.classList.contains('hidden') &&
            !e.target.closest('#btnSshMenuToggle') &&
            !e.target.closest('#sshHeaderDropdown')) {
          sshHeaderDropdown.classList.add('hidden');
        }
      });
    }

    // --- Import dialog bindings
    bindImportDialog();

    // --- Sidebar resize handle
    bindSidebarResize();
  }

  let importMode: 'import' | 'update' = 'import';

  async function updatePasswordIcon() {
    const btn = $('#btnSshPassword');
    if (!btn) return;
    const status = await api.sshPasswordStatus();
    btn.textContent = status.masterPasswordSet ? App.__('sshPasswordLockedIcon') : App.__('sshPasswordUnlockedIcon');
    btn.title = status.masterPasswordSet ? App.__('sshPasswordBtnChangeTitle') : App.__('sshPasswordBtnSetTitle');
  }

  function closeSshHeaderDropdown() {
    const dd = $('#sshHeaderDropdown');
    if (dd) dd.classList.add('hidden');
  }

  // --- Search Filter
  function bindSearchFilter() {
    const input = $('#sshSearchInput');
    if (!input) return;

    input.addEventListener('input', () => {
      const query = input.value.toLowerCase().trim();
      filterSshList(sshConnList, query);
      filterSshUserList(sshUserList, query);
      // Hide section headers when no visible items remain
      updateSectionVisibility(sshConnList, query);
      updateSectionVisibility(sshUserList, query);
    });
  }

  function filterSshList(container, query) {
    if (!container) return;
    if (!query) {
      // No query: show everything
      for (const el of container.querySelectorAll('.ssh-conn-item, .ssh-folder, .ssh-folder-children')) {
        el.style.display = '';
      }
      return;
    }

    // First pass: hide all connection items, then show matching ones
    const allItems = container.querySelectorAll('.ssh-conn-item');
    for (const item of allItems) {
      const name = (item.querySelector('.ssh-item-name')?.textContent || '').toLowerCase();
      const host = (item.querySelector('.ssh-item-host')?.textContent || '').toLowerCase();
      item.style.display = (name.includes(query) || host.includes(query)) ? '' : 'none';
    }

    // Second pass: process folders bottom-up via recursive helper
    // Returns true if the folder (or any descendant) should be visible
    function processFolder(folderEl) {
      const folderName = (folderEl.querySelector('.ssh-folder-name')?.textContent || '').toLowerCase();
      const folderMatches = folderName.includes(query);
      const childrenContainer = folderEl.nextElementSibling;
      const isChildren = childrenContainer?.classList.contains('ssh-folder-children');

      let anyVisible = false;

      if (isChildren) {
        // Process sub-folders first (bottom-up)
        const subFolders = childrenContainer.querySelectorAll(':scope > .ssh-folder');
        for (const sf of subFolders) {
          if (processFolder(sf)) anyVisible = true;
        }
        // Check connections
        const childItems = childrenContainer.querySelectorAll(':scope > .ssh-conn-item');
        for (const ci of childItems) {
          if (ci.style.display !== 'none') anyVisible = true;
        }
        // Show children container if needed
        childrenContainer.style.display = (folderMatches || anyVisible) ? '' : 'none';
      }

      // If folder name matches, force-show all descendants
      if (folderMatches && isChildren) {
        for (const el of childrenContainer.querySelectorAll('.ssh-conn-item, .ssh-folder, .ssh-folder-children')) {
          el.style.display = '';
        }
        childrenContainer.style.display = '';
        anyVisible = true;
      }

      folderEl.style.display = (folderMatches || anyVisible) ? '' : 'none';
      return folderMatches || anyVisible;
    }

    // Process root-level folders (direct children of container)
    const rootFolders = container.querySelectorAll(':scope > .ssh-folder');
    for (const rf of rootFolders) {
      processFolder(rf);
    }
  }

  function filterSshUserList(container, query) {
    if (!container) return;
    const items = container.querySelectorAll('.ssh-user-item');
    for (const item of items) {
      if (!query) { item.style.display = ''; continue; }
      const name = (item.querySelector('.ssh-item-name')?.textContent || '').toLowerCase();
      const host = (item.querySelector('.ssh-item-host')?.textContent || '').toLowerCase();
      item.style.display = (name.includes(query) || host.includes(query)) ? '' : 'none';
    }
  }

  function updateSectionVisibility(container, query) {
    if (!container) return;
    const section = container.closest('.ssh-section');
    if (!section) return;
    const items = container.querySelectorAll('.ssh-item, .ssh-folder');
    const anyVisible = [...items].some(el => el.style.display !== 'none');
    section.style.display = (!query || anyVisible) ? '' : 'none';
  }

  // --- Password Dialogs
  async function showPasswordUnlock() {
    passwordMode = 'unlock';
    sshPasswordTitle.textContent = App.__('sshPasswordUnlockTitle');
    sshPasswordConfirmGroup.classList.add('hidden');
    sshPasswordError.classList.add('hidden');
    sshPasswordInput.value = '';
    sshPasswordInput.placeholder = App.__('sshPasswordPlaceholderUnlock');
    sshPasswordBtn.textContent = App.__('sshPasswordBtnUnlock');
    sshPasswordSkip.classList.add('hidden');
    if (sshPasswordCancel) sshPasswordCancel.classList.remove('hidden');
    sshPasswordDialog.classList.remove('hidden');
    sshPasswordInput.focus();
  }

  async function showPasswordSetup(isChange?) {
    passwordMode = 'setup';
    sshPasswordTitle.textContent = isChange ? App.__('sshPasswordChangeTitle') : App.__('sshPasswordSetupTitle');
    sshPasswordConfirmGroup.classList.remove('hidden');
    sshPasswordError.classList.add('hidden');
    sshPasswordInput.value = '';
    sshPasswordConfirm.value = '';
    sshPasswordInput.placeholder = App.__('sshPasswordPlaceholderNew');
    sshPasswordBtn.textContent = isChange ? App.__('sshPasswordBtnChange') : App.__('sshPasswordBtnSet');
    sshPasswordSkip.textContent = App.__('sshPasswordBtnUseOs');
    sshPasswordSkip.classList.remove('hidden');
    if (sshPasswordCancel) sshPasswordCancel.classList.remove('hidden');
    sshPasswordDialog.classList.remove('hidden');
    sshPasswordInput.focus();
  }

  function bindPasswordDialog() {
    sshPasswordBtn.addEventListener('click', async () => {
      sshPasswordError.classList.add('hidden');
      const pw = sshPasswordInput.value;

      const finish = async () => {
        sshPasswordDialog.classList.add('hidden');
        await updatePasswordIcon();
        await refreshAll();
      };

      if (passwordMode === 'setup') {
        if (!pw) {
          sshPasswordError.textContent = App.__('sshPasswordEmpty');
          sshPasswordError.classList.remove('hidden');
          return;
        }
        if (pw !== sshPasswordConfirm.value) {
          sshPasswordError.textContent = App.__('sshPasswordMismatch');
          sshPasswordError.classList.remove('hidden');
          return;
        }
        App.Menus.showConfirm(
          App.__('confirmSetMasterPassword'),
          async () => {
            const result = await api.sshSetPassword(pw);
            if (result.error) {
              sshPasswordError.textContent = result.error;
              sshPasswordError.classList.remove('hidden');
              return;
            }
            App.UI.showToast(App.__('toastPasswordSet'));
            await finish();
          },
          'skipSetMasterPasswordConfirm',
          'confirmSetMasterPasswordOk'
        );
        return;
      }

      // unlock
      const result = await api.sshUnlock(pw);
      if (result.error || !result.success) {
        const msg = result.errorCode === 'NO_MASTER_PASSWORD'
          ? App.__('errorNoMasterPassword')
          : result.errorCode === 'INCORRECT_PASSWORD'
          ? App.__('sshPasswordIncorrect')
          : result.errorCode === 'DECRYPT_FAILED'
          ? App.__('sshPasswordDecryptFailed')
          : result.errorCode === 'MASTER_PASSWORD_REQUIRED'
          ? App.__('sshMasterPasswordRequired')
          : result.error || App.__('sshPasswordIncorrect');
        sshPasswordError.textContent = msg;
        sshPasswordError.classList.remove('hidden');
        sshPasswordInput.value = '';
        sshPasswordInput.focus();
        return;
      }
      await finish();
    });

    sshPasswordSkip.addEventListener('click', () => {
      App.Menus.showConfirm(
        App.__('confirmUseDefaultEncryption'),
        async () => {
          sshPasswordDialog.classList.add('hidden');
          const result = await api.sshUseSafeStorage();
          if (result.error) {
            App.UI.showToast(App.__('toastError', { message: result.error }));
            return;
          }
          App.UI.showToast(App.__('toastUseDefaultEncryption'));
          await updatePasswordIcon();
          await refreshAll();
        },
        'skipDefaultEncryptionConfirm',
        'confirmUseDefaultEncryptionOk'
      );
    });

    if (sshPasswordCancel) {
      sshPasswordCancel.addEventListener('click', () => {
        sshPasswordDialog.classList.add('hidden');
      });
    }

    sshPasswordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sshPasswordBtn.click();
      if (e.key === 'Escape') sshPasswordCancel.click();
    });

    sshPasswordConfirm.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sshPasswordBtn.click();
      if (e.key === 'Escape') sshPasswordCancel.click();
    });
  }

  // --- Data Loading
  async function refreshAll() {
    await Promise.all([refreshUsers(), refreshConnectionTree()]);
  }

  async function refreshConnectionTree() {
    if (!sshConnList) return;
    const connections = await api.sshConnectionList();
    const groups = await api.sshFolderList();

    // Restore collapsed state from localStorage
    let collapsed;
    const savedCollapsed = localStorage.getItem('sshCollapsedFolders');
    if (savedCollapsed !== null) {
      collapsed = new Set(JSON.parse(savedCollapsed));
    } else {
      collapsed = new Set();
      for (const el of sshConnList.querySelectorAll('.ssh-folder:not(.expanded)')) {
        if (el.dataset.folderId) collapsed.add(el.dataset.folderId);
      }
    }

    // Sort connections alphabetically
    connections.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    // Index folders
    const folderMap = new Map();
    for (const g of groups) folderMap.set(g.id, g);

    // Group connections by folderId
    const folderConns = new Map();
    for (const g of groups) folderConns.set(g.id, []);
    const ungrouped = [];
    for (const conn of connections) {
      if (conn.folderId && folderConns.has(conn.folderId)) {
        folderConns.get(conn.folderId).push(conn);
      } else {
        ungrouped.push(conn);
      }
    }

    // Sort connections within each folder
    for (const [, conns] of folderConns) {
      conns.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    // Build children map for folders: parentId -> [child folders]
    const folderChildren = new Map();
    folderChildren.set('__root__', []);
    for (const g of groups) {
      const pid = g.parentId || '__root__';
      if (!folderChildren.has(pid)) folderChildren.set(pid, []);
      folderChildren.get(pid).push(g);
    }
    // Sort child folders by name
    for (const [, children] of folderChildren) {
      children.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    // Pre-compute total connection count per folder (recursive, includes sub-folders)
    const folderTotalConns = new Map();
    const computing = new Set(); // cycle detection
    function calcTotalConns(folderId) {
      if (folderTotalConns.has(folderId)) return folderTotalConns.get(folderId);
      if (computing.has(folderId)) return 0; // cycle detected, break
      computing.add(folderId);
      let count = (folderConns.get(folderId) || []).length;
      for (const sub of (folderChildren.get(folderId) || [])) {
        count += calcTotalConns(sub.id);
      }
      computing.delete(folderId);
      folderTotalConns.set(folderId, count);
      return count;
    }
    for (const g of groups) calcTotalConns(g.id);

    sshConnList.innerHTML = '';

    // Render root-level folders and their contents recursively
    for (const folder of (folderChildren.get('__root__') || [])) {
      renderFolderTree(folder, folderMap, folderConns, folderChildren, collapsed, folderTotalConns);
    }

    // Render ungrouped connections at root level
    for (const conn of ungrouped) {
      sshConnList.appendChild(createConnectionItem(conn));
    }

    if (connections.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'ssh-empty-hint';
      empty.textContent = App.__('sshNoConnections');
      sshConnList.appendChild(empty);
    }

    // Re-apply search filter if one is active
    const searchInput = $('#sshSearchInput');
    if (searchInput && searchInput.value.trim()) {
      const query = searchInput.value.toLowerCase().trim();
      filterSshList(sshConnList, query);
      updateSectionVisibility(sshConnList, query);
    }
  }

  // --- Recursive folder rendering
  function renderFolderTree(folder, folderMap, folderConns, folderChildren, collapsed, folderTotalConns) {
    const groupId = folder.id;

    const folderEl = document.createElement('div');
    folderEl.className = 'ssh-folder' + (collapsed.has(groupId) ? '' : ' expanded');
    folderEl.dataset.folderId = groupId;
    folderEl.draggable = true;
    const connCount = (folderConns.get(groupId) || []).length;
    const totalConnCount = folderTotalConns.get(groupId) || connCount;
    folderEl.innerHTML = `
      <span class="ssh-folder-arrow">▶</span>
      <span class="ssh-folder-icon">📁</span>
      <span class="ssh-folder-name">${escHtml(folder.name)}</span>
      <span class="ssh-folder-count">${totalConnCount || ''}</span>
      <span class="ssh-folder-actions">
        <button class="ssh-action-btn" data-action="open-folder" data-i18n-title="sshFolderOpenAllTitle" title="Open all">▶</button>
        <button class="ssh-action-btn" data-action="edit-folder" data-i18n-title="sshFolderEditTitle" title="Edit">✎</button>
        <button class="ssh-action-btn" data-action="delete-folder" data-i18n-title="sshFolderDeleteTitle" title="Delete">×</button>
      </span>
    `;

    // Drag start: allow dragging folder into another folder
    folderEl.addEventListener('dragstart', (e) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', 'folder:' + groupId);
      folderEl.classList.add('ssh-dragging');
      const selectedGroups = [...sshSelected].filter(k => k.startsWith('group:'));
      if (selectedGroups.length > 1 && sshSelected.has(sshKey('group', groupId))) {
        for (const key of selectedGroups) {
          const gid = key.split(':')[1];
          const el = document.querySelector(`.ssh-folder[data-folder-id="${gid}"]`);
          if (el) el.classList.add('ssh-dragging');
        }
      }
    });
    folderEl.addEventListener('dragend', () => {
      folderEl.classList.remove('ssh-dragging');
      for (const el of document.querySelectorAll('.ssh-folder.ssh-dragging')) {
        el.classList.remove('ssh-dragging');
      }
      for (const el of document.querySelectorAll('.ssh-folder.drag-over')) {
        el.classList.remove('drag-over');
      }
      if (sshConnList) sshConnList.classList.remove('ssh-root-drag-over');
    });

    // Click: select + toggle expand/collapse
    folderEl.addEventListener('click', (e) => {
      if (e.target.closest('.ssh-folder-actions')) return;
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      if (ctrl) {
        e.preventDefault();
        handleSshSelect('group', groupId, ctrl, shift);
      } else if (shift && sshLastClicked) {
        e.preventDefault();
        handleSshSelect('group', groupId, ctrl, shift);
      } else {
        clearSshSelection();
        handleSshSelect('group', groupId, false, false);
        // Toggle expand/collapse
        const children = folderEl.nextElementSibling;
        if (children && children.classList.contains('ssh-folder-children')) {
          folderEl.classList.toggle('expanded');
          persistCollapsedState();
        }
      }
    });

    // Drop target: accept dragged connections AND folders onto folder header
    folderEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      folderEl.classList.add('drag-over');
    });
    folderEl.addEventListener('dragleave', () => {
      folderEl.classList.remove('drag-over');
    });
    folderEl.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      folderEl.classList.remove('drag-over');
      const rawData = e.dataTransfer.getData('text/plain');
      if (!rawData) return;

      if (rawData.startsWith('folder:')) {
        // Re-parent dragged folder(s) into this folder
        const draggedFolderId = rawData.slice(7);
        const result = await api.sshFolderSave({ id: draggedFolderId, parentId: groupId });
        if (result.error) { App.UI.showToast(App.__('toastError', { message: result.error })); return; }
        const selectedGroups = [...sshSelected].filter(k => k.startsWith('group:'));
        if (selectedGroups.length > 1 && sshSelected.has(sshKey('group', draggedFolderId))) {
          for (const key of selectedGroups) {
            const gid = key.split(':')[1];
            if (gid !== draggedFolderId) {
              const r = await api.sshFolderSave({ id: gid, parentId: groupId });
              if (r.error) { App.UI.showToast(App.__('toastError', { message: r.error })); }
            }
          }
        }
      } else {
        // Move connection(s) into this folder
        const connId = rawData;
        await api.sshConnectionSave({ id: connId, folderId: groupId });
        const selectedConns = [...sshSelected].filter(k => k.startsWith('connection:'));
        if (selectedConns.length > 1 && sshSelected.has(sshKey('connection', connId))) {
          for (const key of selectedConns) {
            const cid = key.split(':')[1];
            if (cid !== connId) await api.sshConnectionSave({ id: cid, folderId: groupId });
          }
        }
      }
      clearSshSelection();
      await refreshConnectionTree();
    });

    sshConnList.appendChild(folderEl);

    // Children container
    const childrenContainer = document.createElement('div');
    childrenContainer.className = 'ssh-folder-children';
    childrenContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    // Render connections in this folder
    const conns = folderConns.get(groupId) || [];
    for (const conn of conns) {
      childrenContainer.appendChild(createConnectionItem(conn));
    }

    // Render sub-folders recursively
    const subFolders = folderChildren.get(groupId) || [];
    for (const subFolder of subFolders) {
      renderFolderTreeInto(subFolder, folderMap, folderConns, folderChildren, collapsed, childrenContainer, folderTotalConns);
    }

    sshConnList.appendChild(childrenContainer);
  }

  // Like renderFolderTree but appends into a specific container (for nesting)
  function renderFolderTreeInto(folder, folderMap, folderConns, folderChildren, collapsed, parentContainer, folderTotalConns) {
    const groupId = folder.id;

    const folderEl = document.createElement('div');
    folderEl.className = 'ssh-folder' + (collapsed.has(groupId) ? '' : ' expanded');
    folderEl.dataset.folderId = groupId;
    folderEl.draggable = true;
    const connCount = (folderConns.get(groupId) || []).length;
    const totalConnCount = folderTotalConns.get(groupId) || connCount;
    folderEl.innerHTML = `
      <span class="ssh-folder-arrow">▶</span>
      <span class="ssh-folder-icon">📁</span>
      <span class="ssh-folder-name">${escHtml(folder.name)}</span>
      <span class="ssh-folder-count">${totalConnCount || ''}</span>
      <span class="ssh-folder-actions">
        <button class="ssh-action-btn" data-action="open-folder" data-i18n-title="sshFolderOpenAllTitle" title="Open all">▶</button>
        <button class="ssh-action-btn" data-action="edit-folder" data-i18n-title="sshFolderEditTitle" title="Edit">✎</button>
        <button class="ssh-action-btn" data-action="delete-folder" data-i18n-title="sshFolderDeleteTitle" title="Delete">×</button>
      </span>
    `;

    // Drag start: allow dragging folder into another folder
    folderEl.addEventListener('dragstart', (e) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', 'folder:' + groupId);
      folderEl.classList.add('ssh-dragging');
      const selectedGroups = [...sshSelected].filter(k => k.startsWith('group:'));
      if (selectedGroups.length > 1 && sshSelected.has(sshKey('group', groupId))) {
        for (const key of selectedGroups) {
          const gid = key.split(':')[1];
          const el = document.querySelector(`.ssh-folder[data-folder-id="${gid}"]`);
          if (el) el.classList.add('ssh-dragging');
        }
      }
    });
    folderEl.addEventListener('dragend', () => {
      folderEl.classList.remove('ssh-dragging');
      for (const el of document.querySelectorAll('.ssh-folder.ssh-dragging')) {
        el.classList.remove('ssh-dragging');
      }
      for (const el of document.querySelectorAll('.ssh-folder.drag-over')) {
        el.classList.remove('drag-over');
      }
      if (sshConnList) sshConnList.classList.remove('ssh-root-drag-over');
    });

    folderEl.addEventListener('click', (e) => {
      if (e.target.closest('.ssh-folder-actions')) return;
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      if (ctrl) {
        e.preventDefault();
        handleSshSelect('group', groupId, ctrl, shift);
      } else if (shift && sshLastClicked) {
        e.preventDefault();
        handleSshSelect('group', groupId, ctrl, shift);
      } else {
        clearSshSelection();
        handleSshSelect('group', groupId, false, false);
        const children = folderEl.nextElementSibling;
        if (children && children.classList.contains('ssh-folder-children')) {
          folderEl.classList.toggle('expanded');
          persistCollapsedState();
        }
      }
    });

    // Drop target: accept dragged connections AND folders onto folder header
    folderEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      folderEl.classList.add('drag-over');
    });
    folderEl.addEventListener('dragleave', () => {
      folderEl.classList.remove('drag-over');
    });
    folderEl.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      folderEl.classList.remove('drag-over');
      const rawData = e.dataTransfer.getData('text/plain');
      if (!rawData) return;

      if (rawData.startsWith('folder:')) {
        const draggedFolderId = rawData.slice(7);
        const result = await api.sshFolderSave({ id: draggedFolderId, parentId: groupId });
        if (result.error) { App.UI.showToast(App.__('toastError', { message: result.error })); return; }
        const selectedGroups = [...sshSelected].filter(k => k.startsWith('group:'));
        if (selectedGroups.length > 1 && sshSelected.has(sshKey('group', draggedFolderId))) {
          for (const key of selectedGroups) {
            const gid = key.split(':')[1];
            if (gid !== draggedFolderId) {
              const r = await api.sshFolderSave({ id: gid, parentId: groupId });
              if (r.error) { App.UI.showToast(App.__('toastError', { message: r.error })); }
            }
          }
        }
      } else {
        const connId = rawData;
        await api.sshConnectionSave({ id: connId, folderId: groupId });
        const selectedConns = [...sshSelected].filter(k => k.startsWith('connection:'));
        if (selectedConns.length > 1 && sshSelected.has(sshKey('connection', connId))) {
          for (const key of selectedConns) {
            const cid = key.split(':')[1];
            if (cid !== connId) await api.sshConnectionSave({ id: cid, folderId: groupId });
          }
        }
      }
      clearSshSelection();
      await refreshConnectionTree();
    });

    parentContainer.appendChild(folderEl);

    const childrenContainer = document.createElement('div');
    childrenContainer.className = 'ssh-folder-children';
    childrenContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    const conns = folderConns.get(groupId) || [];
    for (const conn of conns) {
      childrenContainer.appendChild(createConnectionItem(conn));
    }

    const subFolders = folderChildren.get(groupId) || [];
    for (const subFolder of subFolders) {
      renderFolderTreeInto(subFolder, folderMap, folderConns, folderChildren, collapsed, childrenContainer, folderTotalConns);
    }

    parentContainer.appendChild(childrenContainer);
  }

  function persistCollapsedState() {
    const collapsed = new Set();
    for (const el of document.querySelectorAll('#sshConnectionList .ssh-folder:not(.expanded)')) {
      if (el.dataset.folderId) collapsed.add(el.dataset.folderId);
    }
    localStorage.setItem('sshCollapsedFolders', JSON.stringify([...collapsed]));
  }

  function createConnectionItem(conn) {
    const item = document.createElement('div');
    item.className = 'ssh-item ssh-conn-item';
    item.dataset.connId = conn.id;
    item.draggable = true;
    item.innerHTML = `
      <span class="ssh-item-icon">${App.__('sshItemConnIcon')}</span>
      <span class="ssh-item-name">${escHtml(conn.name)}</span>
      <span class="ssh-item-host">${escHtml(conn.username ? conn.username + '@' : '')}${escHtml(conn.host)}</span>
      <span class="ssh-item-actions">
        <button class="ssh-action-btn" data-action="connect" data-i18n-title="sshItemConnectTitle" title="Connect">▶</button>
        <button class="ssh-action-btn" data-action="edit-conn" data-i18n-title="sshItemEditTitle" title="Edit">✎</button>
        <button class="ssh-action-btn" data-action="delete-conn" data-i18n-title="sshItemDeleteTitle" title="Delete">×</button>
      </span>
    `;
    item.addEventListener('dblclick', () => connectSsh(conn.id));
    item.addEventListener('click', (e) => {
      if (e.target.closest('.ssh-item-actions')) return;
      handleSshSelect('connection', conn.id, e.ctrlKey || e.metaKey, e.shiftKey);
    });
    // Allow drops on connection items (for ungrouping via drag-out)
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });
    // Drag start
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', conn.id);
      item.classList.add('ssh-dragging');
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('ssh-dragging');
      for (const el of document.querySelectorAll('.ssh-folder.drag-over')) {
        el.classList.remove('drag-over');
      }
      // Clean up root drag indicator
      if (sshConnList) sshConnList.classList.remove('ssh-root-drag-over');
    });
    return item;
  }

  async function refreshUsers() {
    if (!sshUserList) return;
    const users = await api.sshUserList();
    // Sort alphabetically by name
    users.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    sshUserList.innerHTML = '';

    for (const user of users) {
      const item = document.createElement('div');
      item.className = 'ssh-item ssh-user-item';
      item.dataset.userId = user.id;
      const authIcon = user.authType === 'keyfile' ? '🔑' : '🔒';
      item.innerHTML = `
        <span class="ssh-item-icon">${authIcon}</span>
        <span class="ssh-item-name">${escHtml(user.name)}</span>
        <span class="ssh-item-host">${escHtml(user.username)}</span>
        <span class="ssh-item-actions">
          <button class="ssh-action-btn" data-action="edit-user" data-i18n-title="sshItemEditTitle" title="Edit">✎</button>
          <button class="ssh-action-btn" data-action="delete-user" data-i18n-title="sshItemDeleteTitle" title="Delete">×</button>
        </span>
      `;
      item.addEventListener('click', (e) => {
        if (e.target.closest('.ssh-item-actions')) return;
        handleSshSelect('user', user.id, e.ctrlKey || e.metaKey, e.shiftKey);
      });
      sshUserList.appendChild(item);
    }

    if (users.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'ssh-empty-hint';
      empty.textContent = App.__('sshNoUsers');
      sshUserList.appendChild(empty);
    }
  }

  // --- Multi-select helpers
  function sshKey(type, id) { return `${type}:${id}`; }

  function clearSshSelection() {
    for (const el of document.querySelectorAll('.ssh-folder.selected, .ssh-conn-item.selected, .ssh-user-item.selected')) {
      el.classList.remove('selected');
    }
    sshSelected.clear();
    sshSelectType = null;
    sshLastClicked = null;
  }

  function toggleSshSelection(type, id) {
    const key = sshKey(type, id);
    if (sshSelected.has(key)) {
      sshSelected.delete(key);
      const el = findSshElement(type, id);
      if (el) el.classList.remove('selected');
    } else {
      sshSelected.add(key);
      const el = findSshElement(type, id);
      if (el) el.classList.add('selected');
    }
    sshSelectType = sshSelected.size > 0 ? type : null;
  }

  function findSshElement(type, id) {
    if (type === 'group') return document.querySelector(`.ssh-folder[data-folder-id="${id}"]`);
    if (type === 'connection') return document.querySelector(`.ssh-conn-item[data-conn-id="${id}"]`);
    if (type === 'user') return document.querySelector(`.ssh-user-item[data-user-id="${id}"]`);
    return null;
  }

  function selectSshRange(type, fromId, toId) {
    const container = type === 'user' ? sshUserList : sshConnList;
    if (!container) return;
    const selector = type === 'group' ? '.ssh-folder' : type === 'connection' ? '.ssh-conn-item' : '.ssh-user-item';
    const attr = type === 'group' ? 'data-folder-id' : type === 'connection' ? 'data-conn-id' : 'data-user-id';
    // Only consider visible items so shift-select respects the active filter
    const items = [...container.querySelectorAll(selector)].filter(el => el.style.display !== 'none');
    const fromIdx = items.findIndex(el => el.getAttribute(attr) === fromId);
    const toIdx = items.findIndex(el => el.getAttribute(attr) === toId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [start, end] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
    for (let i = start; i <= end; i++) {
      const el = items[i];
      const itemId = el.getAttribute(attr);
      if (itemId) {
        sshSelected.add(sshKey(type, itemId));
        el.classList.add('selected');
      }
    }
  }

  function handleSshSelect(type, id, ctrl, shift) {
    // Block cross-type selection
    if (sshSelectType && sshSelectType !== type) clearSshSelection();

    if (ctrl) {
      toggleSshSelection(type, id);
      sshLastClicked = sshKey(type, id);
    } else if (shift && sshLastClicked) {
      const [lastType, lastId] = sshLastClicked.split(':');
      if (lastType === type) {
        clearSshSelection();
        selectSshRange(type, lastId, id);
        sshSelectType = type;
      } else {
        // Cross-type shift: clear and select only the clicked item
        clearSshSelection();
        toggleSshSelection(type, id);
      }
      sshLastClicked = sshKey(type, id);
    } else {
      clearSshSelection();
      toggleSshSelection(type, id);
      sshLastClicked = sshKey(type, id);
    }
  }

  // --- Panel Button Bindings
  function bindPanelButtons() {
    // --- Add Connection button
    const btnAddConn = $('#btnAddSshConn');
    if (btnAddConn) btnAddConn.addEventListener('click', () => { closeSshHeaderDropdown(); showConnectionDialog(); });

    // --- Add Group button
    const btnAddGroup = $('#btnAddSshFolder');
    if (btnAddGroup) btnAddGroup.addEventListener('click', () => { closeSshHeaderDropdown(); showFolderDialog(); });

    // --- Add User button
    const btnAddUser = $('#btnAddSshUser');
    if (btnAddUser) btnAddUser.addEventListener('click', () => { closeSshHeaderDropdown(); showUserDialog(); });

    // Delegate click events on the connection tree (folders + connections)
    if (sshConnList) {
      sshConnList.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;

        const folder = e.target.closest('.ssh-folder');
        if (folder) {
          const groupId = folder.dataset.folderId;
          switch (btn.dataset.action) {
            case 'open-folder': openSshFolder(groupId); break;
            case 'edit-folder': showFolderDialog(groupId); break;
            case 'delete-folder': deleteSshFolder(groupId); break;
          }
          return;
        }

        const item = e.target.closest('.ssh-conn-item');
        if (!item) return;
        const connId = item.dataset.connId;
        switch (btn.dataset.action) {
          case 'connect': connectSsh(connId); break;
          case 'edit-conn': showConnectionDialog(connId); break;
          case 'delete-conn': deleteConnection(connId); break;
        }
      });
    }

    if (sshUserList) {
      sshUserList.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const item = e.target.closest('.ssh-user-item');
        if (!item) return;
        const userId = item.dataset.userId;
        switch (btn.dataset.action) {
          case 'edit-user': showUserDialog(userId); break;
          case 'delete-user': deleteUser(userId); break;
        }
      });
    }

    // --- Drop on root / folder children
    if (sshConnList) {
      // Track which folder is highlighted via its children area
      let highlightedFolder = null;

      sshConnList.addEventListener('dragover', (e) => {
        const folderEl = e.target.closest('.ssh-folder');
        const childrenEl = e.target.closest('.ssh-folder-children');

        if (folderEl) {
          // Over a folder header - folder's own dragover handles it
          sshConnList.classList.remove('ssh-root-drag-over');
          return;
        }

        if (childrenEl) {
          // Over a folder's children area - highlight the associated folder
          const assocFolder = childrenEl.previousElementSibling;
          if (assocFolder && assocFolder.classList.contains('ssh-folder')) {
            if (highlightedFolder && highlightedFolder !== assocFolder) {
              highlightedFolder.classList.remove('drag-over');
            }
            highlightedFolder = assocFolder;
            assocFolder.classList.add('drag-over');
          }
          sshConnList.classList.remove('ssh-root-drag-over');
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        } else {
          // Over root area (ungrouped connections or empty space)
          if (highlightedFolder) {
            highlightedFolder.classList.remove('drag-over');
            highlightedFolder = null;
          }
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          sshConnList.classList.add('ssh-root-drag-over');
        }
      });

      sshConnList.addEventListener('dragleave', (e) => {
        if (!sshConnList.contains(e.relatedTarget)) {
          sshConnList.classList.remove('ssh-root-drag-over');
          if (highlightedFolder) {
            highlightedFolder.classList.remove('drag-over');
            highlightedFolder = null;
          }
        }
      });

      sshConnList.addEventListener('drop', async (e) => {
        sshConnList.classList.remove('ssh-root-drag-over');
        if (highlightedFolder) {
          highlightedFolder.classList.remove('drag-over');
          highlightedFolder = null;
        }

        // If dropped on a folder header, let the folder's own handler deal with it
        if (e.target.closest('.ssh-folder')) return;

        e.preventDefault();
        const rawData = e.dataTransfer.getData('text/plain');
        if (!rawData) return;

        // Determine target folder: if dropped on a folder's children area, use that folder
        let targetFolderId = null;
        const childrenEl = e.target.closest('.ssh-folder-children');
        if (childrenEl) {
          const assocFolder = childrenEl.previousElementSibling;
          if (assocFolder && assocFolder.classList.contains('ssh-folder')) {
            targetFolderId = assocFolder.dataset.folderId || null;
          }
        }

        if (rawData.startsWith('folder:')) {
          // Re-parent dragged folder(s)
          const draggedFolderId = rawData.slice(7);
          const result = await api.sshFolderSave({ id: draggedFolderId, parentId: targetFolderId });
          if (result.error) { App.UI.showToast(App.__('toastError', { message: result.error })); return; }
          const selectedGroups = [...sshSelected].filter(k => k.startsWith('group:'));
          if (selectedGroups.length > 1 && sshSelected.has(sshKey('group', draggedFolderId))) {
            for (const key of selectedGroups) {
              const gid = key.split(':')[1];
              if (gid !== draggedFolderId) {
                const r = await api.sshFolderSave({ id: gid, parentId: targetFolderId });
                if (r.error) { App.UI.showToast(App.__('toastError', { message: r.error })); }
              }
            }
          }
        } else {
          // Move connection(s)
          const connId = rawData;
          await api.sshConnectionSave({ id: connId, folderId: targetFolderId });
          const selectedConns = [...sshSelected].filter(k => k.startsWith('connection:'));
          if (selectedConns.length > 1 && sshSelected.has(sshKey('connection', connId))) {
            for (const key of selectedConns) {
              const cid = key.split(':')[1];
              if (cid !== connId) await api.sshConnectionSave({ id: cid, folderId: targetFolderId });
            }
          }
        }
        clearSshSelection();
        await refreshConnectionTree();
      });
    }

    // --- SSH context menu handlers
    bindSshContextMenus();
  }

  function bindSshContextMenus() {
    if (!sshContextMenu) return;

    // Store original button texts for restore
    const originalTexts = new Map();
    sshContextMenu.querySelectorAll('button').forEach(b => originalTexts.set(b.dataset.action, b.textContent));

    function setBtnText(action, text) {
      const btn = sshContextMenu.querySelector(`[data-action="${action}"]`);
      if (btn) btn.textContent = text;
    }
    function restoreBtnTexts() {
      for (const [action, text] of originalTexts) setBtnText(action, text);
    }

    // Right-click on connection tree (folders + connections)
    if (sshConnList) {
      sshConnList.addEventListener('contextmenu', async (e) => {
        const folder = e.target.closest('.ssh-folder');
        const connItem = e.target.closest('.ssh-conn-item');
        if (!folder && !connItem) return;
        e.preventDefault();
        e.stopPropagation();
        // A new right-click discards any pending "Add Parent Folder" flow
        pendingAdoptTarget = null;

        if (folder) {
          const folderId = folder.dataset.folderId;
          const selectedGroups = [...sshSelected].filter(k => k.startsWith('group:'));
          if (selectedGroups.length > 1 && sshSelected.has(sshKey('group', folderId))) {
            // Multi-select bulk actions for groups
            sshContextTarget = { type: 'group', id: null, multi: true, ids: selectedGroups.map(k => k.split(':')[1]) };
            setBtnText('ssh-open-folder', App.__('sshCtxOpenAllMulti', { count: selectedGroups.length }));
            setBtnText('ssh-delete', App.__('sshCtxDeleteSelected', { count: selectedGroups.length }));
            const actions = ['ssh-open-folder', 'ssh-move', 'ssh-delete'];
            // "Add Parent Folder" only makes sense when all selected folders share the same parent
            const folders = await api.sshFolderList();
            const selected = folders.filter(f => sshContextTarget.ids.includes(f.id));
            if (selected.length > 0 && selected.every(f => (f.parentId || null) === (selected[0].parentId || null))) {
              actions.splice(1, 0, 'ssh-add-parent-folder');
            }
            showSshContextMenu(e, actions);
          } else {
            sshContextTarget = { type: 'group', id: folderId };
            showSshContextMenu(e, ['ssh-add-conn', 'ssh-add-subfolder', 'ssh-add-parent-folder', 'ssh-open-folder', 'ssh-edit', 'ssh-move', 'ssh-delete']);
          }
        } else if (connItem) {
          const connId = connItem.dataset.connId;
          const selectedConns = [...sshSelected].filter(k => k.startsWith('connection:'));
          if (selectedConns.length > 1 && sshSelected.has(sshKey('connection', connId))) {
            sshContextTarget = { type: 'connection', id: null, multi: true, ids: selectedConns.map(k => k.split(':')[1]) };
            setBtnText('ssh-connect', App.__('sshCtxConnectAll', { count: selectedConns.length }));
            setBtnText('ssh-duplicate', App.__('sshCtxDuplicateSelected', { count: selectedConns.length }));
            setBtnText('ssh-delete', App.__('sshCtxDeleteSelected', { count: selectedConns.length }));
            const actions = ['ssh-connect', 'ssh-duplicate', 'ssh-move', 'ssh-delete'];
            // "Add Parent Folder" only makes sense when all selected connections share the same folder
            const connections = await api.sshConnectionList();
            const selected = connections.filter(c => sshContextTarget.ids.includes(c.id));
            if (selected.length > 0 && selected.every(c => (c.folderId || null) === (selected[0].folderId || null))) {
              actions.splice(1, 0, 'ssh-add-parent-folder');
            }
            showSshContextMenu(e, actions);
          } else {
            sshContextTarget = { type: 'connection', id: connId };
            showSshContextMenu(e, ['ssh-connect', 'ssh-add-parent-folder', 'ssh-edit', 'ssh-duplicate', 'ssh-move', 'ssh-delete']);
          }
        }
      });
    }

    // Right-click on users
    if (sshUserList) {
      sshUserList.addEventListener('contextmenu', (e) => {
        const item = e.target.closest('.ssh-user-item');
        if (!item) return;
        e.preventDefault();
        e.stopPropagation();
        const userId = item.dataset.userId;
        const selectedUsers = [...sshSelected].filter(k => k.startsWith('user:'));
        if (selectedUsers.length > 1 && sshSelected.has(sshKey('user', userId))) {
          sshContextTarget = { type: 'user', id: null, multi: true, ids: selectedUsers.map(k => k.split(':')[1]) };
          setBtnText('ssh-delete', App.__('sshCtxDeleteSelected', { count: selectedUsers.length }));
          showSshContextMenu(e, ['ssh-delete']);
        } else {
          sshContextTarget = { type: 'user', id: userId };
          showSshContextMenu(e, ['ssh-edit', 'ssh-delete']);
        }
      });
    }

    // Right-click on empty space in the sidebar scroll area (not on any item,
    // folder or action button): section-aware add menu.
    // The sections stack top-to-bottom (Connections, then Users), so any blank
    // area that is not inside a section lies below the Users section.
    const sshScrollEl = document.querySelector('.ssh-sidebar-scroll');
    if (sshScrollEl) {
      sshScrollEl.addEventListener('contextmenu', (e) => {
        // Item/folder right-clicks are handled (and stopped) by the list-level
        // handlers above; keep this guard as a safety net.
        if (e.target.closest('.ssh-folder, .ssh-conn-item, .ssh-user-item, .ssh-action-btn')) return;
        e.preventDefault();
        e.stopPropagation();
        // A new right-click discards any pending "Add Parent Folder" flow and any selection
        pendingAdoptTarget = null;
        clearSshSelection();
        const section = e.target.closest('.ssh-section');
        const isUsers = section ? section.contains(sshUserList) : true;
        sshContextTarget = { type: 'empty', id: null };
        showSshContextMenu(e, isUsers ? ['ssh-add-user'] : ['ssh-add-conn', 'ssh-add-folder']);
      });
    }

    // Menu item click handlers
    sshContextMenu.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', async () => {
        const action = btn.dataset.action;
        const target = sshContextTarget;
        sshContextMenu.classList.add('hidden');
        sshContextTarget = null;
        restoreBtnTexts();
        if (!target) return;

        switch (action) {
          case 'ssh-connect':
            if (target.multi) {
              for (const id of target.ids) connectSsh(id);
            } else {
              connectSsh(target.id);
            }
            break;
          case 'ssh-add-conn':
            showConnectionDialog(undefined, target.id);
            break;
          case 'ssh-add-folder':
            // Root-level folder (no parent preselected)
            showFolderDialog();
            break;
          case 'ssh-add-user':
            showUserDialog();
            break;
          case 'ssh-add-subfolder':
            showFolderDialog(undefined, target.id);
            break;
          case 'ssh-add-parent-folder': {
            // Preselect the new folder's parent so it lands where the target(s) sit.
            // The option is only offered for multi-select when all items share the
            // same parent, so the first selected item's parent applies to all.
            const adoptIds = target.multi ? target.ids : [target.id];
            let preselectParent = null;
            if (target.type === 'connection') {
              const connections = await api.sshConnectionList();
              const conn = connections.find(c => c.id === adoptIds[0]);
              preselectParent = conn?.folderId || null;
            } else if (target.type === 'group') {
              const folders = await api.sshFolderList();
              const folder = folders.find(f => f.id === adoptIds[0]);
              preselectParent = folder?.parentId || null;
            }
            pendingAdoptTarget = { type: target.type === 'group' ? 'group' : 'connection', ids: adoptIds };
            showFolderDialog(undefined, preselectParent);
            break;
          }
          case 'ssh-edit':
            if (target.type === 'connection') showConnectionDialog(target.id);
            else if (target.type === 'group') showFolderDialog(target.id);
            else if (target.type === 'user') showUserDialog(target.id);
            break;
          case 'ssh-move':
            // Handled by submenu population - only for multi now
            if (target.multi) {
              // For multi-select, the submenu moves all selected connections
              // submenu is populated in showSshContextMenu
            }
            break;
          case 'ssh-delete':
            if (target.multi) {
              const count = target.ids.length;
              const typeLabel = target.type === 'group' ? App.__('sshDeleteTypeFolder') : target.type === 'connection' ? App.__('sshDeleteTypeConnection') : App.__('sshDeleteTypeUser');
              let message = App._n('confirmDeleteMultiSsh', count, 'statusTerminalPlural').replace('{type}', typeLabel);
              if (target.type === 'user') {
                const affectedLines = await buildUserDeleteWarning(target.ids);
                if (affectedLines.length > 0) {
                  message += `\n${App.__('confirmDeleteMultiSshUserConnections', { users: affectedLines.join('\n') })}`;
                }
              }
              App.Menus.showConfirm(
                message,
                async () => {
                  for (const id of target.ids) {
                    if (target.type === 'connection') await api.sshConnectionDelete(id);
                    else if (target.type === 'group') await api.sshFolderDelete(id);
                    else if (target.type === 'user') await api.sshUserDelete(id);
                  }
                  clearSshSelection();
                  await refreshAll();
                },
                'skipSshDeleteConfirm',
                'confirmDelete'
              );
            } else {
              if (target.type === 'connection') deleteConnection(target.id);
              else if (target.type === 'group') deleteSshFolder(target.id);
              else if (target.type === 'user') deleteUser(target.id);
            }
            break;
          case 'ssh-duplicate': {
            const connections = await api.sshConnectionList();
            const ids = target.multi ? target.ids : [target.id];
            for (const id of ids) {
              const src = connections.find(c => c.id === id);
              if (!src) continue;
              await api.sshConnectionSave({
                name: src.name + ' (copy)',
                host: src.host,
                port: src.port,
                userId: src.userId,
                folderId: src.folderId,
                jumpHost: src.jumpHost,
                hostKeyAlgorithms: src.hostKeyAlgorithms ?? null,
                kexAlgorithms: src.kexAlgorithms ?? null,
                pubkeyAcceptedAlgorithms: src.pubkeyAcceptedAlgorithms ?? null,
              });
            }
            await refreshConnectionTree();
            break;
          }
          case 'ssh-open-folder':
            if (target.multi) {
              for (const id of target.ids) openSshFolder(id);
            } else {
              openSshFolder(target.id);
            }
            break;
        }
      });
    });

    // Submenu hover handling
    if (sshCtxMoveItem && sshCtxFolderSubmenu) {
      let hideTimer = null;
      sshCtxMoveItem.addEventListener('mouseenter', () => {
        clearTimeout(hideTimer);
        sshCtxFolderSubmenu.classList.remove('hidden');
        App.Menus.positionSubmenu(sshCtxFolderSubmenu);
      });
      sshCtxMoveItem.addEventListener('mouseleave', () => {
        hideTimer = setTimeout(() => sshCtxFolderSubmenu.classList.add('hidden'), 150);
      });
      sshCtxFolderSubmenu.addEventListener('mouseenter', () => {
        clearTimeout(hideTimer);
      });
      sshCtxFolderSubmenu.addEventListener('mouseleave', () => {
        sshCtxFolderSubmenu.classList.add('hidden');
      });
    }

    // Hide on outside click
    document.addEventListener('click', () => {
      if (sshContextMenu) sshContextMenu.classList.add('hidden');
    });
    document.addEventListener('contextmenu', () => {
      if (sshContextMenu) sshContextMenu.classList.add('hidden');
    });
  }

  async function showSshContextMenu(e, actions) {
    // Show/hide items based on available actions
    const allBtns = sshContextMenu.querySelectorAll('button');
    allBtns.forEach(b => b.classList.add('hidden'));
    for (const action of actions) {
      const btn = sshContextMenu.querySelector(`[data-action="${action}"]`);
      if (btn) btn.classList.remove('hidden');
    }
    // Show/hide the Move to Folder submenu trigger
    const showMove = actions.includes('ssh-move');
    if (sshCtxMoveItem) sshCtxMoveItem.classList.toggle('hidden', !showMove);

    // Show a separator only when there is visible content on both sides of it.
    // This keeps separators from piling up when a whole section is hidden.
    const children = [...sshContextMenu.children];
    let sinceLastSep = false;
    for (let i = 0; i < children.length; i++) {
      const el = children[i];
      if (el.classList.contains('context-separator')) {
        const hasAfter = children.slice(i + 1).some(c => !c.classList.contains('context-separator') && !c.classList.contains('hidden'));
        el.classList.toggle('hidden', !(sinceLastSep && hasAfter));
        sinceLastSep = false;
      } else if (!el.classList.contains('hidden')) {
        sinceLastSep = true;
      }
    }

    // Populate Move to Group submenu
    if (showMove && sshCtxFolderSubmenu) {
      const groups = await api.sshFolderList();
      const target = sshContextTarget;
      const isFolderMove = target?.type === 'group';

      let itemIds = [];
      let currentParentId = null;

      if (target?.multi) {
        itemIds = target.ids || [];
      } else if (target?.id) {
        itemIds = [target.id];
        if (isFolderMove) {
          const folder = groups.find(g => g.id === target.id);
          currentParentId = folder?.parentId || null;
        } else {
          const connections = await api.sshConnectionList();
          const conn = connections.find(c => c.id === target.id);
          currentParentId = conn?.folderId || null;
        }
      }

      // For folder moves, exclude self and descendants to prevent cycles
      const excludedFolderIds = new Set();
      if (isFolderMove) {
        for (const id of itemIds) excludedFolderIds.add(id);
        const collectDescendants = (pid) => {
          for (const g of groups) {
            if (g.parentId === pid) {
              excludedFolderIds.add(g.id);
              collectDescendants(g.id);
            }
          }
        };
        for (const id of itemIds) collectDescendants(id);
      }

      sshCtxFolderSubmenu.innerHTML = '';
      let hasGroups = false;
      // Sort groups alphabetically by name
      const sortedGroups = [...groups].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      for (const g of sortedGroups) {
        // Skip current parent (already here) and excluded folders
        if (itemIds.length === 1 && g.id === currentParentId) continue;
        if (isFolderMove && excludedFolderIds.has(g.id)) continue;
        hasGroups = true;
        const btn = document.createElement('button');
        btn.textContent = g.name;
        btn.addEventListener('click', async () => {
          sshContextMenu.classList.add('hidden');
          if (sshCtxFolderSubmenu) sshCtxFolderSubmenu.classList.add('hidden');
          if (isFolderMove) {
            for (const id of itemIds) {
              await api.sshFolderSave({ id, parentId: g.id });
            }
          } else {
            for (const id of itemIds) {
              await api.sshConnectionSave({ id, folderId: g.id });
            }
          }
          clearSshSelection();
          await refreshAll();
        });
        sshCtxFolderSubmenu.appendChild(btn);
      }

      if (!hasGroups) {
        const hint = document.createElement('button');
        hint.textContent = App.__('sshCtxNoOtherFolders');
        hint.style.color = 'var(--text-muted)';
        hint.style.fontStyle = 'italic';
        sshCtxFolderSubmenu.appendChild(hint);
      }
    }

    App.Menus.positionContextMenu(sshContextMenu, e.clientX, e.clientY);
  }

  // --- Actions
  async function connectSsh(connId) {
    const result = await api.sshConnect(connId);
    if (result.error) {
      const msg = result.errorCode === 'CONNECTION_NOT_FOUND'
        ? App.__('errorConnectionNotFound')
        : result.error;
      App.UI.showToast(App.__('toastSshError', { message: msg }));
      return;
    }
    // Create the terminal pane and tab using the existing infrastructure
    await App.Terminal.spawnSshTerminal(result);
  }

  async function openSshFolder(groupId) {
    const result = await api.sshOpenFolder(groupId);
    if (result.error) {
      const msg = result.errorCode === 'FOLDER_NOT_FOUND'
        ? App.__('errorGroupNotFound')
        : result.error;
      App.UI.showToast(App.__('toastError', { message: msg }));
      return;
    }

    // --- Create a new app group
    const group = App.Groups.createGroup(result.name, false);
    App.Groups.switchGroup(group.id);

    // --- Spawn each connection as a tab
    for (const conn of result.connections) {
      const spawnResult = await api.sshConnect(conn.id);
      if (spawnResult.error) {
        App.UI.showToast(App.__('toastSshErrorNamed', { name: conn.name, message: spawnResult.error }));
        continue;
      }
      await App.Terminal.spawnSshTerminal(spawnResult);
    }
  }

  async function deleteConnection(connId) {
    const connections = await api.sshConnectionList();
    const conn = connections.find(c => c.id === connId);
    App.Menus.showConfirm(
      App.__('confirmDeleteSshConnection', { name: conn?.name || connId }),
      async () => {
        await api.sshConnectionDelete(connId);
        await refreshConnectionTree();
      },
      'skipSshDeleteConfirm',
      'confirmDelete'
    );
  }

  async function deleteSshFolder(groupId) {
    const groups = await api.sshFolderList();
    const group = groups.find(g => g.id === groupId);
    App.Menus.showConfirm(
      App.__('confirmDeleteSshFolder', { name: group?.name || groupId }),
      async () => {
        await api.sshFolderDelete(groupId);
        await refreshAll();
      },
      'skipSshDeleteConfirm',
      'confirmDelete'
    );
  }

  // Build the per-user "connections reference this user" lines for a multi-user
  // delete. Returns one line per affected user, in selection order.
  async function buildUserDeleteWarning(userIds) {
    const [connections, users] = await Promise.all([api.sshConnectionList(), api.sshUserList()]);
    const lines = [];
    for (const userId of userIds) {
      const conns = connections.filter(c => c.userId === userId);
      if (conns.length === 0) continue;
      const user = users.find(u => u.id === userId);
      const names = conns.map(c => c.name).join(', ');
      lines.push(App.__('confirmDeleteMultiSshUserLine', { user: user?.name || userId, connections: names }));
    }
    return lines;
  }

  async function deleteUser(userId) {
    const users = await api.sshUserList();
    const user = users.find(u => u.id === userId);
    const connections = await api.sshConnectionList();
    const affected = connections.filter(c => c.userId === userId);
    let message = App.__('confirmDeleteSshUser', { name: user?.name || userId });
    if (affected.length > 0) {
      const names = affected.slice(0, 3).map(c => c.name).join(', ');
      const namesText = affected.length > 3
        ? `${names}, ${App.__('confirmDeleteSshUserMore', { count: affected.length - 3 })}`
        : names;
      message += `\n${App._p('confirmDeleteSshUserConnections', affected.length).replace('{names}', namesText)}`;
    }
    App.Menus.showConfirm(
      message,
      async () => {
        await api.sshUserDelete(userId);
        await refreshAll();
      },
      'skipSshDeleteConfirm',
      'confirmDelete'
    );
  }

  // --- SSH Config Import
  async function showImportDialog(mode) {
    importMode = mode || 'import';
    const result = await api.sshImportConfig();

    // --- User canceled the file selection
    if (result.canceled) return;

    sshImportBody.innerHTML = '';

    // --- Update dialog header and button
    const headerSpan = sshImportDialog.querySelector('.ssh-dialog-header span');
    if (headerSpan) {
      headerSpan.textContent = importMode === 'update'
        ? App.__('sshImportUpdateTitle')
        : App.__('sshImportTitle');
    }
    sshImportConfirm.textContent = importMode === 'update' ? App.__('sshImportBtnUpdate') : App.__('sshImportBtnImport');

    if (result.error) {
      const msg = result.errorCode === 'CONFIG_NOT_FOUND'
        ? App.__('errorConfigNotFound', { path: result.path || '' })
        : result.errorCode === 'NO_HOSTS_FOUND'
        ? App.__('sshImportNoHosts')
        : result.error;
      sshImportBody.innerHTML = `<div class="ssh-empty-hint">${escHtml(msg)}</div>`;
      sshImportDialog.classList.remove('hidden');
      return;
    }

    const hosts = result.hosts;
    const [existingConns, allUsers] = await Promise.all([
      api.sshConnectionList(),
      api.sshUserList(),
    ]);

    // --- Global update options (update mode only)
    let globalOpts = null;
    if (importMode === 'update') {
      globalOpts = document.createElement('div');
      globalOpts.className = 'ssh-update-global';
      globalOpts.innerHTML = `
        <span class="ssh-update-global-title">${App.__('sshImportUpdateFieldsTitle')}</span>
        <label class="ssh-update-field"><input type="checkbox" id="updGlobalHost" checked /> ${App.__('sshImportFieldHost')}</label>
        <label class="ssh-update-field"><input type="checkbox" id="updGlobalUser" checked /> ${App.__('sshImportFieldUser')}</label>
        <label class="ssh-update-field"><input type="checkbox" id="updGlobalJump" checked /> ${App.__('sshImportFieldJump')}</label>
        <label class="ssh-update-field"><input type="checkbox" id="updGlobalOptions" checked /> ${App.__('sshImportFieldOptions')}</label>
      `;
      sshImportBody.appendChild(globalOpts);
    }

    // Whether a global update field is selected (missing checkbox = on)
    const isUpdateFieldOn = (id) => {
      const cb = document.getElementById(id);
      return !cb || cb.checked;
    };

    // Sort hosts alphabetically by name
    hosts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    // --- Build / refresh the list based on the currently checked update fields
    function renderImportRows() {
      // Preserve the global options section (keeps its change listeners)
      while (sshImportBody.lastChild) sshImportBody.removeChild(sshImportBody.lastChild);
      if (globalOpts) sshImportBody.appendChild(globalOpts);

      const doHost = isUpdateFieldOn('updGlobalHost');
      const doUser = isUpdateFieldOn('updGlobalUser');
      const doJump = isUpdateFieldOn('updGlobalJump');
      const doOptions = isUpdateFieldOn('updGlobalOptions');

      let shown = 0;
      for (const host of hosts) {
        const existing = existingConns.find(c => c.name.toLowerCase() === host.name.toLowerCase());

        // --- Filter based on mode
        if (importMode === 'import' && existing) continue;
        if (importMode === 'update' && !existing) continue;

        const row: any = document.createElement('label');
        row.className = 'ssh-import-row';
        const authInfo = host.identityFile
          ? App.__('sshImportAuthKeyfile', { file: escHtml(host.identityFile.split(/[\\/]/).pop() || host.identityFile) })
          : App.__('sshImportAuthPassword');

        // --- Compute diffs only for fields selected for update
        const diffs = [];
        if (existing) {
          if (doHost && (existing.host !== host.host || existing.port !== host.port)) diffs.push(`${App.__('sshImportDiffHost')}: ${escHtml(existing.host)}:${existing.port} → ${escHtml(host.host)}:${host.port}`);
          if (doUser) {
            // Compare the actual username value, not the user's display name
            const existingUser = existing.userId ? allUsers.find(u => u.id === existing.userId) : null;
            const existingUsername = existingUser ? existingUser.username || '' : '';
            if (existingUsername !== (host.user || '') && host.user) diffs.push(`${App.__('sshImportDiffUser')}: ${escHtml(existingUsername || App.__('sshImportDiffNone'))} → ${escHtml(host.user)}`);
          }
          // Compare the actual jump host value, not just its presence
          if (doJump && host.proxyJump && existing.jumpHostDisplay !== host.proxyJump) diffs.push(`${App.__('sshImportDiffJump')}: ${escHtml(host.proxyJump)}`);
          if (doOptions) {
            // Only values defined in the config file count as changes
            const optChanges = [];
            if (host.hostKeyAlgorithms && existing.hostKeyAlgorithms !== host.hostKeyAlgorithms) optChanges.push(`HostKeyAlgorithms=${escHtml(host.hostKeyAlgorithms)}`);
            if (host.kexAlgorithms && existing.kexAlgorithms !== host.kexAlgorithms) optChanges.push(`KexAlgorithms=${escHtml(host.kexAlgorithms)}`);
            if (host.pubkeyAcceptedAlgorithms && existing.pubkeyAcceptedAlgorithms !== host.pubkeyAcceptedAlgorithms) optChanges.push(`PubkeyAcceptedAlgorithms=${escHtml(host.pubkeyAcceptedAlgorithms)}`);
            if (optChanges.length > 0) diffs.push(`${App.__('sshImportDiffOptions')}: ${optChanges.join(', ')}`);
          }
        }
        const diffsHtml = diffs.length > 0 ? `<span class="ssh-import-changes">${diffs.join(' · ')}</span>` : '';

        // --- Only show items that actually have changes
        if (importMode === 'update' && diffs.length === 0) continue;

        // Jump host indicator
        let jumpInfo = '';
        if (host.proxyJump) {
          const jhExists = hosts.some(h => h.name === host.proxyJump);
          jumpInfo = `<span class="ssh-import-jump">${App.__('sshImportJumpVia', { host: escHtml(host.proxyJump) })}${jhExists ? '' : App.__('sshImportJumpNotInConfig')}</span>`;
        }

        const detailDisplay = existing
          ? `<span class="ssh-import-detail">${escHtml(host.user || existing.userName || '')}@${escHtml(host.host)}:${host.port}</span>`
          : `<span class="ssh-import-detail">${escHtml(host.user || '')}@${escHtml(host.host)}:${host.port}</span>`;

        row.innerHTML = `
          <input type="checkbox" name="importHost" value="${escHtml(host.name)}" checked />
          <div class="ssh-import-info">
            <div class="ssh-import-title-row">
              <span class="ssh-import-name">${escHtml(host.name)}</span>
            </div>
            ${detailDisplay}
            ${jumpInfo}
            ${diffsHtml}
            <span class="ssh-import-auth">${authInfo}</span>
          </div>
        `;
        row._hostData = host;
        row._importStatus = existing ? 'update' : 'new';
        row._existingConn = existing;
        sshImportBody.appendChild(row);
        shown++;
      }

      // Auto-check jump hosts: if a host is checked and has a proxyJump in the list, check it too
      const allRows = sshImportBody.querySelectorAll('.ssh-import-row');
      for (const row of allRows) {
        const host = row._hostData;
        const cb = row.querySelector('input[name="importHost"]');
        if (!cb || !cb.checked || !host.proxyJump) continue;
        // Find the jump host row
        for (const jRow of allRows) {
          if (jRow._hostData.name === host.proxyJump) {
            const jCb = jRow.querySelector('input[name="importHost"]');
            if (jCb && !jCb.checked) {
              jCb.checked = true;
              jCb.indeterminate = true; // visual hint it was auto-checked
            }
            break;
          }
        }
      }

      if (shown === 0) {
        const msg = importMode === 'update'
          ? App.__('sshImportNoExistingToUpdate')
          : App.__('sshImportNoNewHosts');
        const hint = document.createElement('div');
        hint.className = 'ssh-empty-hint';
        hint.innerHTML = escHtml(msg);
        sshImportBody.appendChild(hint);
      }
    }

    // --- Refresh the list when update fields are checked/unchecked
    if (globalOpts) {
      for (const id of ['updGlobalHost', 'updGlobalUser', 'updGlobalJump', 'updGlobalOptions']) {
        const cb = document.getElementById(id);
        if (cb) cb.addEventListener('change', renderImportRows);
      }
    }

    renderImportRows();

    sshImportDialog.classList.remove('hidden');
  }

  function bindImportDialog() {
    if (!sshImportDialog) return;

    sshImportCancel.addEventListener('click', () => {
      sshImportDialog.classList.add('hidden');
    });

    sshImportConfirm.addEventListener('click', async () => {
      const checkboxes = sshImportBody.querySelectorAll('input[name="importHost"]:checked');
      const allRows = [...sshImportBody.querySelectorAll('.ssh-import-row')];

      // Warn if a checked host's jump host is not also checked
      const missingJumps = [];
      for (const cb of checkboxes) {
        const row = cb.closest('.ssh-import-row');
        const host = row._hostData;
        if (!host || !host.proxyJump) continue;
        // In update mode, only warn if the global jump option is on
        if (importMode === 'update') {
          const globalJump = document.getElementById('updGlobalJump');
          if (!globalJump || !globalJump.checked) continue;
        }
        const jumpRow = allRows.find(r => r._hostData.name === host.proxyJump);
        if (jumpRow) {
          const jumpCb = jumpRow.querySelector('input[name="importHost"]');
          if (jumpCb && !jumpCb.checked) {
            missingJumps.push({ host: host.name, jump: host.proxyJump });
          }
        }
      }
      if (missingJumps.length > 0) {
        const names = missingJumps.map(m => `"${m.host}" needs "${m.jump}"`).join('\n');
        App.Menus.showConfirm(
          App.__('confirmJumpHostsMissing', { names }),
          () => doImportFromConfig(checkboxes),
          'skipSshJumpWarn'
        );
        return;
      }

      await doImportFromConfig(checkboxes);
    });

    // --- Import execution
    async function doImportFromConfig(checkboxes) {
      // Read global update options
      const updGlobalHost = document.getElementById('updGlobalHost');
      const updGlobalUser = document.getElementById('updGlobalUser');
      const updGlobalJump = document.getElementById('updGlobalJump');
      const updGlobalOptions = document.getElementById('updGlobalOptions');
      const doHost = !updGlobalHost || updGlobalHost.checked;
      const doUser = !updGlobalUser || updGlobalUser.checked;
      const doJump = !updGlobalJump || updGlobalJump.checked;
      const doOptions = !updGlobalOptions || updGlobalOptions.checked;

      // Build the checked-host payload for a single bulk IPC call.
      const hosts = [];
      for (const cb of checkboxes) {
        const row = cb.closest('.ssh-import-row');
        const host = row._hostData;
        if (!host) continue;
        hosts.push({
          name: host.name,
          host: host.host,
          port: host.port,
          user: host.user,
          identityFile: host.identityFile || null,
          proxyJump: host.proxyJump || null,
          hostKeyAlgorithms: host.hostKeyAlgorithms || null,
          kexAlgorithms: host.kexAlgorithms || null,
          pubkeyAcceptedAlgorithms: host.pubkeyAcceptedAlgorithms || null,
          existingConnId: row._existingConn ? row._existingConn.id : null,
        });
      }

      const result = await api.sshImportApply({
        hosts,
        mode: importMode,
        doHost,
        doUser,
        doJump,
        doOptions,
      });

      sshImportDialog.classList.add('hidden');

      if (result.error) {
        App.UI.showToast(App.__('toastError', { message: result.error }));
        await refreshAll();
        return;
      }

      const msgParts = [];
      if (result.imported > 0) msgParts.push(App.__('toastImportedNew', { count: result.imported }));
      if (result.updated > 0) msgParts.push(App.__('toastImportedUpdated', { count: result.updated }));
      if (msgParts.length > 0) {
        App.UI.showToast(App.__('toastImported', { list: msgParts.join(', ') }));
      }
      if (result.skipped.length > 0) {
        App.UI.showToast(App.__('toastError', {
          message: result.skipped.map(s => `${s.name}: ${s.error}`).join('\n'),
        }));
      }
      await refreshAll();
    }

    sshImportDialog.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') sshImportDialog.classList.add('hidden');
    });
  }

  // --- Generic Dialog
  function bindDialog() {
    sshDialogCancel.addEventListener('click', () => {
      pendingAdoptTarget = null;
      sshDialog.classList.add('hidden');
    });

    sshDialogSave.addEventListener('click', async () => {
      const form = sshDialogBody.querySelector('form');
      if (!form) return;
      const formData = new FormData(form);
      const data: any = Object.fromEntries(formData.entries());

      // Determine which save to call based on dialog type
      if (sshDialog.dataset.type === 'user') {
        const userData: SshUser = {
          id: editingUserId || undefined,
          name: data.userName || '',
          username: data.userUsername || '',
          authType: data.userAuthType || 'password',
          keyFilePath: data.userKeyFile || null,
        };
        if (data.userClearPassword === '1') {
          // Explicitly clear stored secrets
          userData.password = '';
          userData.keyPassword = '';
        } else {
          // Only include password if provided (editing with blank = keep existing)
          if (data.userPassword) userData.password = data.userPassword;
          if (data.userKeyPassword) userData.keyPassword = data.userKeyPassword;
        }
        const result = await api.sshUserSave(userData);
        if (result.error) { App.UI.showToast(App.__('toastError', { message: result.error })); return; }
      } else if (sshDialog.dataset.type === 'connection') { 
        // Build jump host data
        let jumpHost = null;
        if (data.connJumpType === 'manual') {
          jumpHost = {
            type: 'manual',
            host: data.connJumpHost || '',
            port: parseInt(data.connJumpPort, 10) || 22,
            username: data.connJumpUser || '',
          };
        } else if (data.connJumpType === 'reference' && data.connJumpRef) {
          jumpHost = {
            type: 'reference',
            connectionId: data.connJumpRef,
          };
        }

        const connData: SshConnection = {
          id: editingConnectionId || undefined,
          name: data.connName || '',
          host: data.connHost || '',
          port: parseInt(data.connPort, 10) || 22,
          userId: data.connUser || null,
          folderId: data.connGroup || null,
          jumpHost,
          hostKeyAlgorithms: (data.connHostKeyAlgs || '').trim() || null,
          kexAlgorithms: (data.connKexAlgs || '').trim() || null,
          pubkeyAcceptedAlgorithms: (data.connPubkeyAlgs || '').trim() || null,
        };
        const result = await api.sshConnectionSave(connData);
        if (result.error) { App.UI.showToast(App.__('toastError', { message: result.error })); return; }
      } else if (sshDialog.dataset.type === 'group') { 
        const groupData: SshFolder = {
          id: editingFolderId || undefined,
          name: (data.groupName || '').trim(),
          parentId: data.groupParent || null,
        };
        const result = await api.sshFolderSave(groupData);
        if (result.error) { App.UI.showToast(App.__('toastError', { message: result.error })); return; }
        // If this folder was created via "Add Parent Folder", move the target item(s)
        // under it. All-or-nothing: if any move fails, restore the already-moved
        // items to their original locations and delete the new folder, so the tree
        // is never left half-moved.
        if (pendingAdoptTarget && result.folder?.id) {
          const parentFolderId = result.folder.id;
          const type = pendingAdoptTarget.type; // 'connection' | 'group'
          const saveMove = type === 'connection'
            ? (id: string, folderId: string | null) => api.sshConnectionSave({ id, folderId })
            : (id: string, parentId: string | null) => api.sshFolderSave({ id, parentId });

          // Capture each target's original location before touching anything.
          const originals = new Map<string, string | null>();
          if (type === 'connection') {
            const connections = await api.sshConnectionList();
            for (const id of pendingAdoptTarget.ids) {
              originals.set(id, connections.find(c => c.id === id)?.folderId || null);
            }
          } else {
            const folders = await api.sshFolderList();
            for (const id of pendingAdoptTarget.ids) {
              originals.set(id, folders.find(f => f.id === id)?.parentId || null);
            }
          }

          const moved: Array<{ id: string; original: string | null }> = [];
          let failedCount = 0;
          for (const id of pendingAdoptTarget.ids) {
            const moveResult = await saveMove(id, parentFolderId);
            if (moveResult.error) failedCount++;
            else moved.push({ id, original: originals.get(id) ?? null });
          }

          if (failedCount > 0) {
            const total = pendingAdoptTarget.ids.length;
            pendingAdoptTarget = null;
            // Roll back: restore moved items first; only delete the new folder when
            // every restore succeeded (deleting it while it still holds a child
            // folder would delete that folder).
            const rollbackErrors: string[] = [];
            for (const { id, original } of moved) {
              const restoreResult = await saveMove(id, original);
              if (restoreResult.error) rollbackErrors.push(restoreResult.error);
            }
            if (rollbackErrors.length === 0) {
              const deleteResult = await api.sshFolderDelete(parentFolderId);
              if (deleteResult.error) rollbackErrors.push(deleteResult.error);
            }
            App.UI.showToast(
              rollbackErrors.length > 0
                ? App.__('toastAdoptRollbackFailed', { failed: failedCount, total, message: rollbackErrors[0] })
                : App.__('toastAdoptRolledBack', { failed: failedCount, total })
            );
            sshDialog.classList.add('hidden');
            await refreshAll();
            return;
          }
          pendingAdoptTarget = null;
        }
      }

      sshDialog.classList.add('hidden');
      await refreshAll();
    });

    // Close on Escape, submit on Enter
    sshDialog.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { pendingAdoptTarget = null; sshDialog.classList.add('hidden'); }
      if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.closest('form')) {
        e.preventDefault();
        sshDialogSave.click();
      }
    });
  }

  // Focus the first visible text input inside a popup
  function focusFirstTextInput(container) {
    const input = [...container.querySelectorAll('input, textarea')].find(el => {
      if (el.closest('.hidden')) return false;
      // Match by effective type (covers inputs without an explicit type attribute)
      return el.tagName === 'TEXTAREA' || ['text', 'number', 'password', 'search', 'email', 'tel', 'url'].includes(el.type);
    });
    if (input) input.focus();
  }

  // Show a typed popup and automatically focus its first text input
  function showPopup(el, type) {
    if (type) el.dataset.type = type;
    el.classList.remove('hidden');
    focusFirstTextInput(el);
  }

  async function showConnectionDialog(connId?, initialFolderId?) {
    editingConnectionId = connId || null;
    sshDialogTitle.textContent = connId ? App.__('sshDialogTitleEditConn') : App.__('sshDialogTitleNewConn');

    const connections = await api.sshConnectionList();
    const users = await api.sshUserList();
    const groups = await api.sshFolderList();
    const conn = connId ? connections.find(c => c.id === connId) : null;

    const userOptions = [...users]
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map(u =>
      `<option value="${escHtml(u.id)}" ${conn && conn.userId === u.id ? 'selected' : ''}>${escHtml(u.name)} (${escHtml(u.username)})</option>`
    ).join('');

    const selectedFolderId = (conn && conn.groupId) || (!connId ? initialFolderId : null);
    const groupOptions = [...groups]
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map(g =>
      `<option value="${escHtml(g.id)}" ${g.id === selectedFolderId ? 'selected' : ''}>${escHtml(g.name)}</option>`
    ).join('');

    // Jump host options from existing connections (exclude self)
    const jumpConnOptions = [...connections]
      .filter(c => c.id !== connId)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map(c => `<option value="${escHtml(c.id)}" ${conn && conn.jumpHost && conn.jumpHost.type === 'reference' && conn.jumpHost.connectionId === c.id ? 'selected' : ''}>${escHtml(c.name)} (${escHtml(c.host)})</option>`)
      .join('');

    // Determine jump host state
    const jhType = conn && conn.jumpHost ? conn.jumpHost.type : 'none';
    const jhManual = conn && conn.jumpHost && conn.jumpHost.type === 'manual' ? conn.jumpHost : { host: '', port: 22, username: '' };

    sshDialogBody.innerHTML = `
      <form>
        <label>${App.__('sshFormName')} <input name="connName" value="${escHtml(conn ? conn.name : '')}" required /></label>
        <label>${App.__('sshFormHost')} <input name="connHost" value="${escHtml(conn ? conn.host : '')}" required /></label>
        <label>${App.__('sshFormPort')} <input name="connPort" type="number" value="${conn ? conn.port : '22'}" /></label>
        <label>${App.__('sshFormUser')}
          <select name="connUser">
            <option value="">${App.__('sshFormSelectUser')}</option>
            ${userOptions}
          </select>
        </label>
        <label>${App.__('sshFolderOptional')}
          <select name="connGroup">
            <option value="">${App.__('sshFormNone')}</option>
            ${groupOptions}
          </select>
        </label>

        <!-- Jump Host -->
        <fieldset class="ssh-fieldset">
          <legend>${App.__('sshFormJumpHostOptional')}</legend>
          <label>${App.__('sshFormJumpType')}
            <select name="connJumpType" id="dialogJumpType">
              <option value="none" ${jhType === 'none' ? 'selected' : ''}>${App.__('sshFormJumpNone')}</option>
              <option value="manual" ${jhType === 'manual' ? 'selected' : ''}>${App.__('sshFormJumpManual')}</option>
              <option value="reference" ${jhType === 'reference' ? 'selected' : ''}>${App.__('sshFormJumpReference')}</option>
            </select>
          </label>

          <!-- Manual jump host fields -->
          <div id="dialogJumpManual" class="${jhType === 'manual' ? '' : 'hidden'}">
            <label>${App.__('sshFormJumpHost')} <input name="connJumpHost" value="${escHtml(jhManual.host)}" placeholder="192.168.1.1" /></label>
            <label>${App.__('sshFormJumpPort')} <input name="connJumpPort" type="number" value="${jhManual.port || 22}" /></label>
            <label>${App.__('sshFormJumpUsername')} <input name="connJumpUser" value="${escHtml(jhManual.username)}" /></label>
          </div>

          <!-- Reference jump host (select connection) -->
          <div id="dialogJumpRef" class="${jhType === 'reference' ? '' : 'hidden'}">
            <label>${App.__('sshFormJumpViaConnection')}
              <select name="connJumpRef">
                <option value="">${App.__('sshFormSelectConnection')}</option>
                ${jumpConnOptions}
              </select>
            </label>
          </div>
        </fieldset>

        <!-- Advanced SSH options (legacy server compatibility) -->
        <fieldset class="ssh-fieldset">
          <legend>${App.__('sshFormAdvancedOptional')}</legend>
          <label>${App.__('sshFormHostKeyAlgorithms')} <input name="connHostKeyAlgs" value="${escHtml(conn ? conn.hostKeyAlgorithms || '' : '')}" placeholder="+ssh-rsa,ssh-dss" /></label>
          <label>${App.__('sshFormKexAlgorithms')} <input name="connKexAlgs" value="${escHtml(conn ? conn.kexAlgorithms || '' : '')}" placeholder="+diffie-hellman-group14-sha1" /></label>
          <label>${App.__('sshFormPubkeyAcceptedAlgorithms')} <input name="connPubkeyAlgs" value="${escHtml(conn ? conn.pubkeyAcceptedAlgorithms || '' : '')}" placeholder="+ssh-rsa" /></label>
        </fieldset>
      </form>
    `;

    // Toggle jump host fields when type changes
    const jumpTypeSelect = sshDialogBody.querySelector('#dialogJumpType');
    if (jumpTypeSelect) {
      jumpTypeSelect.addEventListener('change', () => {
        const manual = sshDialogBody.querySelector('#dialogJumpManual');
        const ref = sshDialogBody.querySelector('#dialogJumpRef');
        if (jumpTypeSelect.value === 'manual') {
          if (manual) manual.classList.remove('hidden');
          if (ref) ref.classList.add('hidden');
        } else if (jumpTypeSelect.value === 'reference') {
          if (manual) manual.classList.add('hidden');
          if (ref) ref.classList.remove('hidden');
        } else {
          if (manual) manual.classList.add('hidden');
          if (ref) ref.classList.add('hidden');
        }
      });
    }

    showPopup(sshDialog, 'connection');
  }

  async function showUserDialog(userId?) {
    editingUserId = userId || null;
    sshDialogTitle.textContent = userId ? App.__('sshDialogTitleEditUser') : App.__('sshDialogTitleNewUser');

    const users = await api.sshUserList();
    const user = userId ? users.find(u => u.id === userId) : null;

    sshDialogBody.innerHTML = `
      <form>
        <label>${App.__('sshFormName')} <input name="userName" value="${escHtml(user ? user.name : '')}" required /></label>
        <label>${App.__('sshFormUsername')} <input name="userUsername" value="${escHtml(user ? user.username : '')}" required /></label>
        <label>${App.__('sshFormAuthType')}
          <select name="userAuthType" id="dialogAuthType">
            <option value="password" ${user && user.authType === 'password' ? 'selected' : ''}>${App.__('sshFormAuthPassword')}</option>
            <option value="keyfile" ${user && user.authType === 'keyfile' ? 'selected' : ''}>${App.__('sshFormAuthKeyfile')}</option>
          </select>
        </label>
        <label id="dialogPasswordLabel" class="${user && user.authType === 'keyfile' ? 'hidden' : ''}">
          ${App.__('sshFormPassword')} <input name="userPassword" type="password" value="" placeholder="${userId ? App.__('sshFormPasswordUnchanged') : ''}" />
        </label>
        <label id="dialogKeyFileLabel" class="${user && user.authType === 'keyfile' ? '' : 'hidden'}">
          ${App.__('sshFormKeyFilePath')} <input name="userKeyFile" value="${escHtml(user ? user.keyFilePath || '' : '')}" placeholder="C:\\Users\\...\\.ssh\\id_rsa" />
        </label>
        <label id="dialogKeyPasswordLabel" class="${user && user.authType === 'keyfile' ? '' : 'hidden'}">
          ${App.__('sshFormKeyPassphrase')} <input name="userKeyPassword" type="password" value="" placeholder="${userId ? App.__('sshFormPasswordUnchanged') : App.__('sshFormKeyPassphraseOptional')}" />
        </label>
        ${userId ? `
        <div class="ssh-clear-password-row">
          <button type="button" id="dialogClearPassword" class="ssh-dialog-btn ssh-dialog-btn-cancel ssh-clear-password-btn">${App.__('sshFormClearPassword')}</button>
          <input type="hidden" name="userClearPassword" value="0" />
        </div>
        ` : ''}
      </form>
    `;

    // Toggle password/keyfile fields based on auth type
    const authTypeSelect = sshDialogBody.querySelector('#dialogAuthType');
    if (authTypeSelect) {
      authTypeSelect.addEventListener('change', () => {
        const pwLabel = sshDialogBody.querySelector('#dialogPasswordLabel');
        const kfLabel = sshDialogBody.querySelector('#dialogKeyFileLabel');
        const kpLabel = sshDialogBody.querySelector('#dialogKeyPasswordLabel');
        if (authTypeSelect.value === 'keyfile') {
          if (pwLabel) pwLabel.classList.add('hidden');
          if (kfLabel) kfLabel.classList.remove('hidden');
          if (kpLabel) kpLabel.classList.remove('hidden');
        } else {
          if (pwLabel) pwLabel.classList.remove('hidden');
          if (kfLabel) kfLabel.classList.add('hidden');
          if (kpLabel) kpLabel.classList.add('hidden');
        }
      });
    }

    const clearPasswordBtn = sshDialogBody.querySelector('#dialogClearPassword');
    const clearPasswordFlag = sshDialogBody.querySelector('input[name="userClearPassword"]');
    if (clearPasswordBtn && clearPasswordFlag) {
      clearPasswordBtn.addEventListener('click', () => {
        const willClear = clearPasswordFlag.value !== '1';
        clearPasswordFlag.value = willClear ? '1' : '0';
        clearPasswordBtn.classList.toggle('active', willClear);
        clearPasswordBtn.textContent = willClear ? App.__('sshFormClearPasswordSet') : App.__('sshFormClearPassword');
      });
    }

    showPopup(sshDialog, 'user');
  }

  async function showFolderDialog(groupId?, initialParentId?) {
    editingFolderId = groupId || null;
    sshDialogTitle.textContent = groupId ? App.__('sshDialogTitleEditFolder') : App.__('sshDialogTitleNewFolder');

    const groups = await api.sshFolderList();
    const group = groupId ? groups.find(g => g.id === groupId) : null;

    // Build parent folder options (exclude self and descendants)
    const excludedIds = new Set();
    if (groupId) {
      excludedIds.add(groupId);
      // Collect all descendant folder IDs
      const collectDescendants = (pid) => {
        for (const g of groups) {
          if (g.parentId === pid) {
            excludedIds.add(g.id);
            collectDescendants(g.id);
          }
        }
      };
      collectDescendants(groupId);
    }

    const selectedParentId = (group && group.parentId) || (!groupId ? initialParentId : null);
    const parentOptions = [...groups]
      .filter(g => !excludedIds.has(g.id))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map(g => `<option value="${escHtml(g.id)}" ${g.id === selectedParentId ? 'selected' : ''}>${escHtml(g.name)}</option>`)
      .join('');

    sshDialogBody.innerHTML = `
      <form>
        <label>${App.__('sshFolderName')} <input name="groupName" value="${escHtml(group ? group.name : '')}" required /></label>
        <label>${App.__('sshFolderParent') || 'Parent folder'}
          <select name="groupParent">
            <option value="" ${!selectedParentId ? 'selected' : ''}>${App.__('sshFolderParentNone') || '(none — root level)'}</option>
            ${parentOptions}
          </select>
        </label>
      </form>
    `;
    showPopup(sshDialog, 'group');
  }

  // --- Keyboard Shortcut
  function bindKeyboardShortcut() {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        if (sshSidebar) {
          if (sshSidebar.classList.contains('collapsed')) {
            sshSidebar.classList.remove('collapsed');
            const savedWidth = localStorage.getItem('sshSidebarWidth');
            sshSidebar.style.width = savedWidth ? savedWidth + 'px' : '';
          } else {
            sshSidebar.style.width = '';
            sshSidebar.classList.add('collapsed');
          }
        }
      }
    });
  }

  // --- Sidebar resize handle
  function bindSidebarResize() {
    const handle = $('#sshResizeHandle');
    if (!handle || !sshSidebar) return;

    // Restore saved width
    const savedWidth = localStorage.getItem('sshSidebarWidth');
    if (savedWidth) {
      sshSidebar.style.width = savedWidth + 'px';
    }

    let startX = 0;
    let startWidth = 0;
    let dragging = false;

    handle.addEventListener('mousedown', (e) => {
      if (sshSidebar.classList.contains('collapsed')) return;
      e.preventDefault();
      dragging = true;
      startX = e.clientX;
      startWidth = sshSidebar.offsetWidth;
      handle.classList.add('active');
      sshSidebar.classList.add('resizing');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const delta = e.clientX - startX;
      const newWidth = Math.min(Math.max(startWidth + delta, 150), 500);
      sshSidebar.style.width = newWidth + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      handle.classList.remove('active');
      sshSidebar.classList.remove('resizing');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      localStorage.setItem('sshSidebarWidth', sshSidebar.offsetWidth);
    });
  }

  // --- Utility
  function escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // --- Exports
  App.SshPanel = {
    init, refreshAll, connectSsh, openSshFolder,
    showConnectionDialog, showUserDialog, showFolderDialog,
    showPasswordUnlock, showPasswordSetup, updatePasswordIcon,
  };
})();

export {};
