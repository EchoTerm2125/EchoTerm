// Unit tests for ssh-panel.ts — sidebar rendering and delete confirm flows
import { vi } from 'vitest';
import { resetTestEnv, loadModules, getApp } from '../setup.js';

// ─── DOM scaffolding for the SSH panel (mirrors renderer/index.html) ────────
const SSH_DIV_IDS = [
  'sshSidebar', 'sshConnectionList', 'sshUserList',
  'sshPasswordDialog', 'sshPasswordTitle', 'sshPasswordConfirmGroup', 'sshPasswordError',
  'sshImportDialog', 'sshImportBody',
  'sshContextMenu',
  'sshDialog', 'sshDialogTitle', 'sshDialogBody',
];
const SSH_BUTTON_IDS = [
  'sshPasswordBtn', 'sshPasswordSkip', 'sshPasswordCancel',
  'sshImportCancel', 'sshImportConfirm', 'sshDialogSave', 'sshDialogCancel',
  'btnSshImport', 'btnSshUpdate',
];
const SSH_INPUT_IDS = ['sshPasswordInput', 'sshPasswordConfirm'];

// Build the SSH context menu with the same structure as renderer/index.html
function buildSshContextMenu(menu) {
  const addBtn = (action, text) => {
    const btn = document.createElement('button');
    btn.dataset.action = action;
    btn.textContent = text;
    menu.appendChild(btn);
  };
  const addSep = (id) => {
    const el = document.createElement('div');
    el.className = 'context-separator';
    el.id = id;
    menu.appendChild(el);
  };

  addBtn('ssh-add-conn', 'Add Connection');
  addBtn('ssh-add-folder', 'Add Folder');
  addBtn('ssh-add-user', 'Add User');
  addBtn('ssh-add-subfolder', 'Add Sub Folder');
  addBtn('ssh-add-parent-folder', 'Add Parent Folder');
  addSep('sshCtxAddSep');
  addBtn('ssh-connect', 'Connect');
  addBtn('ssh-edit', 'Edit');
  addBtn('ssh-duplicate', 'Duplicate');
  addSep('sshCtxMoveSep');
  const moveItem = document.createElement('div');
  moveItem.className = 'context-submenu-trigger';
  moveItem.id = 'sshCtxMoveItem';
  const submenu = document.createElement('div');
  submenu.className = 'context-submenu hidden';
  submenu.id = 'sshCtxFolderSubmenu';
  moveItem.appendChild(submenu);
  menu.appendChild(moveItem);
  addSep('sshCtxDelSep');
  addBtn('ssh-delete', 'Delete');
  addSep('sshCtxOpenSep');
  addBtn('ssh-open-folder', 'Open All Connections');
}

function scaffoldSshDom() {
  for (const id of [...SSH_DIV_IDS, ...SSH_BUTTON_IDS, ...SSH_INPUT_IDS]) {
    document.getElementById(id)?.remove();
  }
  // Clean up wrappers from a previous test run (they have no id)
  document.querySelectorAll('.ssh-sidebar-scroll').forEach((el) => el.remove());
  for (const id of SSH_DIV_IDS) {
    const el = document.createElement('div');
    el.id = id;
    document.body.appendChild(el);
  }
  // Wrap the connection/user lists in the same structure as renderer/index.html:
  // .ssh-sidebar-scroll > .ssh-section > #sshConnectionList / #sshUserList
  const scrollEl = document.createElement('div');
  scrollEl.className = 'ssh-sidebar-scroll';
  const connSection = document.createElement('div');
  connSection.className = 'ssh-section';
  connSection.appendChild(document.getElementById('sshConnectionList'));
  scrollEl.appendChild(connSection);
  const userSection = document.createElement('div');
  userSection.className = 'ssh-section';
  userSection.appendChild(document.getElementById('sshUserList'));
  scrollEl.appendChild(userSection);
  document.body.appendChild(scrollEl);
  for (const id of SSH_BUTTON_IDS) {
    const el = document.createElement('button');
    el.id = id;
    document.body.appendChild(el);
  }
  for (const id of SSH_INPUT_IDS) {
    const el = document.createElement('input');
    el.id = id;
    el.type = 'password';
    document.body.appendChild(el);
  }
  // Context menu contents (mirrors renderer/index.html)
  buildSshContextMenu(document.getElementById('sshContextMenu'));
}

// Flush pending promise microtasks/macrotasks between click and assertion
function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function getConfirmElements() {
  return {
    dialog: document.getElementById('confirmDialog'),
    message: document.getElementById('confirmMessage'),
    ok: document.getElementById('confirmOk'),
    cancel: document.getElementById('confirmCancel'),
  };
}

describe('SshPanel (ssh-panel.ts)', () => {
  beforeEach(async () => {
    await resetTestEnv();
    scaffoldSshDom();

    const api = window.api;
    vi.mocked(api.sshPasswordStatus).mockResolvedValue({ masterPasswordSet: false, unlocked: true });
    vi.mocked(api.sshConnectionList).mockResolvedValue([
      { id: 'c1', name: 'My Server', host: 'example.com', port: 22, userId: null, folderId: null },
    ]);
    vi.mocked(api.sshFolderList).mockResolvedValue([
      { id: 'f1', name: 'Work', parentId: null },
    ]);
    vi.mocked(api.sshUserList).mockResolvedValue([
      { id: 'u1', name: 'Admin', username: 'admin', authType: 'password' },
    ]);

    await loadModules('menus', 'ssh-panel');
    // The real app always loads ui.ts before ssh-panel; stub its surface here
    getApp().UI = { showToast: () => {} };
    await getApp().SshPanel.init();
  });

  describe('rendering', () => {
    it('renders connections, folders and users on init', () => {
      const connList = document.getElementById('sshConnectionList');
      expect(connList.querySelector('.ssh-conn-item[data-conn-id="c1"]')).not.toBeNull();
      expect(connList.querySelector('.ssh-folder[data-folder-id="f1"]')).not.toBeNull();

      const userList = document.getElementById('sshUserList');
      expect(userList.querySelector('.ssh-user-item[data-user-id="u1"]')).not.toBeNull();
    });
  });

  describe('dialog folder preselect from context menu', () => {
    it('preselects the folder when adding a connection from a folder context menu', async () => {
      await getApp().SshPanel.showConnectionDialog(undefined, 'f1');

      const select = document.querySelector('#sshDialogBody select[name="connGroup"]');
      expect(select).not.toBeNull();
      expect(select.value).toBe('f1');
    });

    it('preselects the parent folder when adding a sub folder', async () => {
      await getApp().SshPanel.showFolderDialog(undefined, 'f1');

      const select = document.querySelector('#sshDialogBody select[name="groupParent"]');
      expect(select).not.toBeNull();
      expect(select.value).toBe('f1');
    });
  });

  describe('add parent folder from context menu', () => {
    it('creates a folder and moves the right-clicked folder under it', async () => {
      const api = window.api;
      // The main process generates an id for the new folder
      vi.mocked(api.sshFolderSave).mockResolvedValue({
        success: true,
        folder: { id: 'newF', name: 'New Parent', parentId: null },
      });

      const folderEl = document.querySelector('.ssh-folder[data-folder-id="f1"]') as HTMLElement;
      folderEl.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 100 }));
      await flush();

      const menuBtn = document.querySelector('#sshContextMenu [data-action="ssh-add-parent-folder"]') as HTMLElement;
      menuBtn.click();
      await flush();

      const dialog = document.getElementById('sshDialog');
      expect(dialog.classList.contains('hidden')).toBe(false);

      const nameInput = document.querySelector('#sshDialogBody input[name="groupName"]') as HTMLInputElement;
      nameInput.value = 'New Parent';

      (document.getElementById('sshDialogSave') as HTMLElement).click();
      await flush();
      await flush();

      // First call creates the new folder; second call moves f1 under it
      expect(api.sshFolderSave).toHaveBeenNthCalledWith(1, expect.objectContaining({ name: 'New Parent' }));
      expect(api.sshFolderSave).toHaveBeenNthCalledWith(2, { id: 'f1', parentId: 'newF' });
    });

    it('creates a folder and moves the right-clicked connection under it', async () => {
      const api = window.api;
      vi.mocked(api.sshFolderSave).mockResolvedValue({
        success: true,
        folder: { id: 'newF', name: 'New Parent', parentId: null },
      });

      const connEl = document.querySelector('.ssh-conn-item[data-conn-id="c1"]') as HTMLElement;
      connEl.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 100 }));
      await flush();

      const menuBtn = document.querySelector('#sshContextMenu [data-action="ssh-add-parent-folder"]') as HTMLElement;
      menuBtn.click();
      await flush();

      const nameInput = document.querySelector('#sshDialogBody input[name="groupName"]') as HTMLInputElement;
      nameInput.value = 'New Parent';

      (document.getElementById('sshDialogSave') as HTMLElement).click();
      await flush();
      await flush();

      expect(api.sshConnectionSave).toHaveBeenCalledWith({ id: 'c1', folderId: 'newF' });
    });
  });

  describe('add parent folder multi-select visibility', () => {
    const addParentBtn = () => document.querySelector('#sshContextMenu [data-action="ssh-add-parent-folder"]') as HTMLElement;

    it('shows the option when all selected folders share the same parent', async () => {
      const api = window.api;
      vi.mocked(api.sshFolderList).mockResolvedValue([
        { id: 'f1', name: 'Work', parentId: null },
        { id: 'f2', name: 'Personal', parentId: null },
      ]);
      await getApp().SshPanel.refreshAll();
      await flush();

      const f1 = document.querySelector('.ssh-folder[data-folder-id="f1"]') as HTMLElement;
      const f2 = document.querySelector('.ssh-folder[data-folder-id="f2"]') as HTMLElement;
      f1.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
      f2.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
      f1.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 100 }));
      await flush();

      expect(addParentBtn().classList.contains('hidden')).toBe(false);
    });

    it('hides the option when the selected folders are at different levels', async () => {
      const api = window.api;
      vi.mocked(api.sshFolderList).mockResolvedValue([
        { id: 'f1', name: 'Work', parentId: null },
        { id: 'f2', name: 'Sub', parentId: 'f1' },
      ]);
      await getApp().SshPanel.refreshAll();
      await flush();

      const f1 = document.querySelector('.ssh-folder[data-folder-id="f1"]') as HTMLElement;
      const f2 = document.querySelector('.ssh-folder[data-folder-id="f2"]') as HTMLElement;
      f1.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
      f2.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
      f1.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 100 }));
      await flush();

      expect(addParentBtn().classList.contains('hidden')).toBe(true);
    });

    it('shows the option when all selected connections share the same folder', async () => {
      const api = window.api;
      vi.mocked(api.sshConnectionList).mockResolvedValue([
        { id: 'c1', name: 'A', host: 'a.com', port: 22, userId: null, folderId: 'f1' },
        { id: 'c2', name: 'B', host: 'b.com', port: 22, userId: null, folderId: 'f1' },
      ]);
      await getApp().SshPanel.refreshAll();
      await flush();

      const c1 = document.querySelector('.ssh-conn-item[data-conn-id="c1"]') as HTMLElement;
      const c2 = document.querySelector('.ssh-conn-item[data-conn-id="c2"]') as HTMLElement;
      c1.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
      c2.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
      c1.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 100 }));
      await flush();

      expect(addParentBtn().classList.contains('hidden')).toBe(false);
    });

    it('hides the option when the selected connections are in different folders', async () => {
      const api = window.api;
      vi.mocked(api.sshConnectionList).mockResolvedValue([
        { id: 'c1', name: 'A', host: 'a.com', port: 22, userId: null, folderId: 'f1' },
        { id: 'c2', name: 'B', host: 'b.com', port: 22, userId: null, folderId: null },
      ]);
      await getApp().SshPanel.refreshAll();
      await flush();

      const c1 = document.querySelector('.ssh-conn-item[data-conn-id="c1"]') as HTMLElement;
      const c2 = document.querySelector('.ssh-conn-item[data-conn-id="c2"]') as HTMLElement;
      c1.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
      c2.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
      c1.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 100 }));
      await flush();

      expect(addParentBtn().classList.contains('hidden')).toBe(true);
    });

    it('preselects the shared parent when adding a parent folder for multiple folders', async () => {
      const api = window.api;
      vi.mocked(api.sshFolderList).mockResolvedValue([
        { id: 'p1', name: 'Parent', parentId: null },
        { id: 'f1', name: 'Work', parentId: 'p1' },
        { id: 'f2', name: 'Personal', parentId: 'p1' },
      ]);
      await getApp().SshPanel.refreshAll();
      await flush();

      const f1 = document.querySelector('.ssh-folder[data-folder-id="f1"]') as HTMLElement;
      const f2 = document.querySelector('.ssh-folder[data-folder-id="f2"]') as HTMLElement;
      f1.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
      f2.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
      f1.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 100 }));
      await flush();

      addParentBtn().click();
      await flush();

      const select = document.querySelector('#sshDialogBody select[name="groupParent"]') as HTMLSelectElement;
      expect(select.value).toBe('p1');
    });

    it('preselects the shared folder when adding a parent folder for multiple connections', async () => {
      const api = window.api;
      vi.mocked(api.sshConnectionList).mockResolvedValue([
        { id: 'c1', name: 'A', host: 'a.com', port: 22, userId: null, folderId: 'f1' },
        { id: 'c2', name: 'B', host: 'b.com', port: 22, userId: null, folderId: 'f1' },
      ]);
      await getApp().SshPanel.refreshAll();
      await flush();

      const c1 = document.querySelector('.ssh-conn-item[data-conn-id="c1"]') as HTMLElement;
      const c2 = document.querySelector('.ssh-conn-item[data-conn-id="c2"]') as HTMLElement;
      c1.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
      c2.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
      c1.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 100 }));
      await flush();

      addParentBtn().click();
      await flush();

      const select = document.querySelector('#sshDialogBody select[name="groupParent"]') as HTMLSelectElement;
      expect(select.value).toBe('f1');
    });
  });

  describe('context menu separator visibility', () => {
    it('hides the Move separator when no option sits between it and the add section', async () => {
      const api = window.api;
      vi.mocked(api.sshFolderList).mockResolvedValue([
        { id: 'f1', name: 'Work', parentId: null },
        { id: 'f2', name: 'Personal', parentId: null },
      ]);
      await getApp().SshPanel.refreshAll();
      await flush();

      const f1 = document.querySelector('.ssh-folder[data-folder-id="f1"]') as HTMLElement;
      const f2 = document.querySelector('.ssh-folder[data-folder-id="f2"]') as HTMLElement;
      f1.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
      f2.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
      f1.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 100 }));
      await flush();

      // The menu shows: Add Parent Folder, Move to Folder, Delete, Open All —
      // no content sits between the add separator and the Move separator
      const moveSep = document.getElementById('sshCtxMoveSep');
      expect(moveSep.classList.contains('hidden')).toBe(true);
      expect(document.getElementById('sshCtxAddSep').classList.contains('hidden')).toBe(false);
      expect(document.getElementById('sshCtxDelSep').classList.contains('hidden')).toBe(false);
    });

    it('keeps the Move separator when a visible option sits above it (single folder)', async () => {
      const f1 = document.querySelector('.ssh-folder[data-folder-id="f1"]') as HTMLElement;
      f1.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 100 }));
      await flush();

      // Single folder menu keeps Edit between the add section and Move to Folder
      expect(document.getElementById('sshCtxMoveSep').classList.contains('hidden')).toBe(false);
    });
  });

  describe('empty space context menu', () => {
    const menuBtn = (action): HTMLElement => document.querySelector(`#sshContextMenu [data-action="${action}"]`) as HTMLElement;
    const connSection = () => document.querySelector('.ssh-sidebar-scroll .ssh-section:first-child');
    const userSection = () => document.querySelector('.ssh-sidebar-scroll .ssh-section:last-child');
    const scrollEl = () => document.querySelector('.ssh-sidebar-scroll');

    it('shows Add Connection and Add Folder when right-clicking Connections empty space', async () => {
      connSection().dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 100 }));
      await flush();
      expect(menuBtn('ssh-add-conn').classList.contains('hidden')).toBe(false);
      expect(menuBtn('ssh-add-folder').classList.contains('hidden')).toBe(false);
      expect(menuBtn('ssh-add-user').classList.contains('hidden')).toBe(true);
    });

    it('shows only Add User when right-clicking Users empty space', async () => {
      userSection().dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 100 }));
      await flush();
      expect(menuBtn('ssh-add-user').classList.contains('hidden')).toBe(false);
      expect(menuBtn('ssh-add-conn').classList.contains('hidden')).toBe(true);
      expect(menuBtn('ssh-add-folder').classList.contains('hidden')).toBe(true);
    });

    it('treats the scroll-area blank below the sections as the Users section', async () => {
      scrollEl().dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 100 }));
      await flush();
      expect(menuBtn('ssh-add-user').classList.contains('hidden')).toBe(false);
      expect(menuBtn('ssh-add-conn').classList.contains('hidden')).toBe(true);
    });

    it('Add Connection opens the connection dialog with no folder preselected', async () => {
      connSection().dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 100 }));
      await flush();
      menuBtn('ssh-add-conn').click();
      await flush();

      const dialog = document.getElementById('sshDialog');
      expect(dialog.classList.contains('hidden')).toBe(false);
      expect(dialog.dataset.type).toBe('connection');
      const groupSelect = document.querySelector('#sshDialogBody select[name="connGroup"]') as HTMLSelectElement;
      expect(groupSelect.value).toBe('');
    });

    it('Add Folder opens the folder dialog with no parent preselected', async () => {
      connSection().dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 100 }));
      await flush();
      menuBtn('ssh-add-folder').click();
      await flush();

      const dialog = document.getElementById('sshDialog');
      expect(dialog.classList.contains('hidden')).toBe(false);
      expect(dialog.dataset.type).toBe('group');
      const parentSelect = document.querySelector('#sshDialogBody select[name="groupParent"]') as HTMLSelectElement;
      expect(parentSelect.value).toBe('');
    });

    it('Add User opens the user dialog', async () => {
      userSection().dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 100 }));
      await flush();
      menuBtn('ssh-add-user').click();
      await flush();

      const dialog = document.getElementById('sshDialog');
      expect(dialog.classList.contains('hidden')).toBe(false);
      expect(dialog.dataset.type).toBe('user');
    });

    it('does not open for item right-clicks (item menu still wins)', async () => {
      const connEl = document.querySelector('.ssh-conn-item[data-conn-id="c1"]') as HTMLElement;
      connEl.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 100 }));
      await flush();
      expect(menuBtn('ssh-connect').classList.contains('hidden')).toBe(false);
      expect(menuBtn('ssh-add-user').classList.contains('hidden')).toBe(true);
    });

    it('clears the current selection on empty-space right-click', async () => {
      const connEl = document.querySelector('.ssh-conn-item[data-conn-id="c1"]') as HTMLElement;
      connEl.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
      expect(connEl.classList.contains('selected')).toBe(true);

      connSection().dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 100 }));
      await flush();
      expect(connEl.classList.contains('selected')).toBe(false);
    });
  });

  describe('delete connection', () => {
    it('shows a Delete-labelled confirm and deletes on OK', async () => {
      const App = getApp();
      (document.querySelector('#sshConnectionList [data-action="delete-conn"]') as HTMLElement).click();
      await flush();

      const { dialog, message, ok } = getConfirmElements();
      expect(dialog.classList.contains('hidden')).toBe(false);
      expect(message.textContent).toBe(App.__('confirmDeleteSshConnection', { name: 'My Server' }));
      expect(ok.textContent).toBe(App.__('confirmDelete'));

      ok.click();
      await flush();
      expect(window.api.sshConnectionDelete).toHaveBeenCalledWith('c1');
    });

    it('does not delete when cancelled', async () => {
      (document.querySelector('#sshConnectionList [data-action="delete-conn"]') as HTMLElement).click();
      await flush();

      const { dialog, cancel } = getConfirmElements();
      cancel.click();
      await flush();

      expect(window.api.sshConnectionDelete).not.toHaveBeenCalled();
      expect(dialog.classList.contains('hidden')).toBe(true);
    });

    it('deletes immediately when skipSshDeleteConfirm is set', async () => {
      localStorage.setItem('skipSshDeleteConfirm', 'true');
      // Mirror the real markup, where the dialog starts hidden
      getConfirmElements().dialog.classList.add('hidden');

      (document.querySelector('#sshConnectionList [data-action="delete-conn"]') as HTMLElement).click();
      await flush();

      expect(window.api.sshConnectionDelete).toHaveBeenCalledWith('c1');
      const { dialog } = getConfirmElements();
      expect(dialog.classList.contains('hidden')).toBe(true);
    });
  });

  describe('delete folder', () => {
    it('shows a Delete-labelled confirm and deletes on OK', async () => {
      const App = getApp();
      (document.querySelector('#sshConnectionList [data-action="delete-folder"]') as HTMLElement).click();
      await flush();

      const { dialog, message, ok } = getConfirmElements();
      expect(dialog.classList.contains('hidden')).toBe(false);
      expect(message.textContent).toBe(App.__('confirmDeleteSshFolder', { name: 'Work' }));
      expect(ok.textContent).toBe(App.__('confirmDelete'));

      ok.click();
      await flush();
      expect(window.api.sshFolderDelete).toHaveBeenCalledWith('f1');
    });
  });

  describe('delete user', () => {
    it('shows a Delete-labelled confirm and deletes on OK', async () => {
      const App = getApp();
      (document.querySelector('#sshUserList [data-action="delete-user"]') as HTMLElement).click();
      await flush();

      const { dialog, message, ok } = getConfirmElements();
      expect(dialog.classList.contains('hidden')).toBe(false);
      expect(message.textContent).toBe(App.__('confirmDeleteSshUser', { name: 'Admin' }));
      expect(ok.textContent).toBe(App.__('confirmDelete'));

      ok.click();
      await flush();
      expect(window.api.sshUserDelete).toHaveBeenCalledWith('u1');
    });
  });

  describe('ssh config update dialog', () => {
    it('only shows hosts that have changes', async () => {
      const api = window.api;
      vi.mocked(api.sshConnectionList).mockResolvedValue([
        { id: 'c1', name: 'Same', host: 'example.com', port: 22, userId: null, folderId: null },
        { id: 'c2', name: 'Diff', host: 'old-host.com', port: 22, userId: null, folderId: null },
      ]);
      vi.mocked(api.sshImportConfig).mockResolvedValue({
        canceled: false,
        path: '/tmp/ssh_config',
        hosts: [
          { name: 'Same', aliases: [], host: 'example.com', port: 22, user: '', identityFile: null, proxyJump: null },
          { name: 'Diff', aliases: [], host: 'new-host.com', port: 2200, user: '', identityFile: null, proxyJump: null },
        ],
      });

      (document.getElementById('btnSshUpdate') as HTMLElement).click();
      await flush();

      const rows = document.querySelectorAll('#sshImportBody .ssh-import-row');
      expect(rows.length).toBe(1);
      expect(rows[0].querySelector('.ssh-import-name').textContent).toBe('Diff');
    });

    it('does not flag a change when only the user display name changed (username value matches)', async () => {
      const api = window.api;
      vi.mocked(api.sshConnectionList).mockResolvedValue([
        { id: 'c1', name: 'web', host: 'example.com', port: 22, userId: 'u1', folderId: null },
      ]);
      vi.mocked(api.sshUserList).mockResolvedValue([
        { id: 'u1', name: 'web UAT', username: 'web', authType: 'password' },
      ]);
      vi.mocked(api.sshImportConfig).mockResolvedValue({
        canceled: false,
        path: '/tmp/ssh_config',
        hosts: [
          { name: 'web', aliases: [], host: 'example.com', port: 22, user: 'web', identityFile: null, proxyJump: null },
        ],
      });

      (document.getElementById('btnSshUpdate') as HTMLElement).click();
      await flush();

      const rows = document.querySelectorAll('#sshImportBody .ssh-import-row');
      expect(rows.length).toBe(0);
    });

    it('flags a change when the username value differs', async () => {
      const api = window.api;
      vi.mocked(api.sshConnectionList).mockResolvedValue([
        { id: 'c1', name: 'web', host: 'example.com', port: 22, userId: 'u1', folderId: null },
      ]);
      vi.mocked(api.sshUserList).mockResolvedValue([
        { id: 'u1', name: 'web', username: 'web-old', authType: 'password' },
      ]);
      vi.mocked(api.sshImportConfig).mockResolvedValue({
        canceled: false,
        path: '/tmp/ssh_config',
        hosts: [
          { name: 'web', aliases: [], host: 'example.com', port: 22, user: 'web', identityFile: null, proxyJump: null },
        ],
      });

      (document.getElementById('btnSshUpdate') as HTMLElement).click();
      await flush();

      const rows = document.querySelectorAll('#sshImportBody .ssh-import-row');
      expect(rows.length).toBe(1);
    });

    it('does not flag a change when the jump host value already matches', async () => {
      const api = window.api;
      vi.mocked(api.sshConnectionList).mockResolvedValue([
        {
          id: 'c1', name: 'prod', host: 'prod.example.com', port: 22, userId: null, folderId: null,
          jumpHost: { type: 'reference', connectionId: 'c-bastion' }, jumpHostDisplay: 'bastion',
        },
      ]);
      vi.mocked(api.sshImportConfig).mockResolvedValue({
        canceled: false,
        path: '/tmp/ssh_config',
        hosts: [
          { name: 'prod', aliases: [], host: 'prod.example.com', port: 22, user: '', identityFile: null, proxyJump: 'bastion' },
        ],
      });

      (document.getElementById('btnSshUpdate') as HTMLElement).click();
      await flush();

      const rows = document.querySelectorAll('#sshImportBody .ssh-import-row');
      expect(rows.length).toBe(0);
    });

    it('flags a change when a jump host is added', async () => {
      const api = window.api;
      vi.mocked(api.sshConnectionList).mockResolvedValue([
        { id: 'c1', name: 'prod', host: 'prod.example.com', port: 22, userId: null, folderId: null, jumpHost: null, jumpHostDisplay: null },
      ]);
      vi.mocked(api.sshImportConfig).mockResolvedValue({
        canceled: false,
        path: '/tmp/ssh_config',
        hosts: [
          { name: 'prod', aliases: [], host: 'prod.example.com', port: 22, user: '', identityFile: null, proxyJump: 'bastion' },
        ],
      });

      (document.getElementById('btnSshUpdate') as HTMLElement).click();
      await flush();

      const rows = document.querySelectorAll('#sshImportBody .ssh-import-row');
      expect(rows.length).toBe(1);
    });

    it('refreshes the list when the Host update field is toggled', async () => {
      const api = window.api;
      vi.mocked(api.sshConnectionList).mockResolvedValue([
        { id: 'c1', name: 'Diff', host: 'old-host.com', port: 22, userId: null, folderId: null },
      ]);
      vi.mocked(api.sshImportConfig).mockResolvedValue({
        canceled: false,
        path: '/tmp/ssh_config',
        hosts: [
          { name: 'Diff', aliases: [], host: 'new-host.com', port: 2200, user: '', identityFile: null, proxyJump: null },
        ],
      });

      (document.getElementById('btnSshUpdate') as HTMLElement).click();
      await flush();

      const rowCount = () => document.querySelectorAll('#sshImportBody .ssh-import-row').length;
      expect(rowCount()).toBe(1);

      const hostCb = document.getElementById('updGlobalHost') as HTMLInputElement;
      hostCb.checked = false;
      hostCb.dispatchEvent(new Event('change'));
      await flush();
      expect(rowCount()).toBe(0);

      hostCb.checked = true;
      hostCb.dispatchEvent(new Event('change'));
      await flush();
      expect(rowCount()).toBe(1);
    });

    it('refreshes the list when the User update field is toggled', async () => {
      const api = window.api;
      vi.mocked(api.sshConnectionList).mockResolvedValue([
        { id: 'c1', name: 'web', host: 'example.com', port: 22, userId: 'u1', folderId: null },
      ]);
      vi.mocked(api.sshUserList).mockResolvedValue([
        { id: 'u1', name: 'web', username: 'web-old', authType: 'password' },
      ]);
      vi.mocked(api.sshImportConfig).mockResolvedValue({
        canceled: false,
        path: '/tmp/ssh_config',
        hosts: [
          { name: 'web', aliases: [], host: 'example.com', port: 22, user: 'web', identityFile: null, proxyJump: null },
        ],
      });

      (document.getElementById('btnSshUpdate') as HTMLElement).click();
      await flush();

      const rowCount = () => document.querySelectorAll('#sshImportBody .ssh-import-row').length;
      expect(rowCount()).toBe(1);

      const userCb = document.getElementById('updGlobalUser') as HTMLInputElement;
      userCb.checked = false;
      userCb.dispatchEvent(new Event('change'));
      await flush();
      expect(rowCount()).toBe(0);

      userCb.checked = true;
      userCb.dispatchEvent(new Event('change'));
      await flush();
      expect(rowCount()).toBe(1);
    });

    it('refreshes the list when the Jump update field is toggled', async () => {
      const api = window.api;
      vi.mocked(api.sshConnectionList).mockResolvedValue([
        { id: 'c1', name: 'prod', host: 'prod.example.com', port: 22, userId: null, folderId: null, jumpHost: null, jumpHostDisplay: null },
      ]);
      vi.mocked(api.sshImportConfig).mockResolvedValue({
        canceled: false,
        path: '/tmp/ssh_config',
        hosts: [
          { name: 'prod', aliases: [], host: 'prod.example.com', port: 22, user: '', identityFile: null, proxyJump: 'bastion' },
        ],
      });

      (document.getElementById('btnSshUpdate') as HTMLElement).click();
      await flush();

      const rowCount = () => document.querySelectorAll('#sshImportBody .ssh-import-row').length;
      expect(rowCount()).toBe(1);

      const jumpCb = document.getElementById('updGlobalJump') as HTMLInputElement;
      jumpCb.checked = false;
      jumpCb.dispatchEvent(new Event('change'));
      await flush();
      expect(rowCount()).toBe(0);

      jumpCb.checked = true;
      jumpCb.dispatchEvent(new Event('change'));
      await flush();
      expect(rowCount()).toBe(1);
    });

    it('flags a change when algorithm options are added in the config', async () => {
      const api = window.api;
      vi.mocked(api.sshConnectionList).mockResolvedValue([
        { id: 'c1', name: 'legacy', host: 'example.com', port: 22, userId: null, folderId: null },
      ]);
      vi.mocked(api.sshImportConfig).mockResolvedValue({
        canceled: false,
        path: '/tmp/ssh_config',
        hosts: [
          { name: 'legacy', aliases: [], host: 'example.com', port: 22, user: '', identityFile: null, proxyJump: null, hostKeyAlgorithms: '+ssh-rsa,ssh-dss' },
        ],
      });

      (document.getElementById('btnSshUpdate') as HTMLElement).click();
      await flush();

      const rows = document.querySelectorAll('#sshImportBody .ssh-import-row');
      expect(rows.length).toBe(1);
      expect(rows[0].querySelector('.ssh-import-changes').textContent).toContain('HostKeyAlgorithms=+ssh-rsa,ssh-dss');
    });

    it('does not flag a change when algorithm options already match', async () => {
      const api = window.api;
      vi.mocked(api.sshConnectionList).mockResolvedValue([
        { id: 'c1', name: 'legacy', host: 'example.com', port: 22, userId: null, folderId: null, hostKeyAlgorithms: '+ssh-rsa,ssh-dss' },
      ]);
      vi.mocked(api.sshImportConfig).mockResolvedValue({
        canceled: false,
        path: '/tmp/ssh_config',
        hosts: [
          { name: 'legacy', aliases: [], host: 'example.com', port: 22, user: '', identityFile: null, proxyJump: null, hostKeyAlgorithms: '+ssh-rsa,ssh-dss' },
        ],
      });

      (document.getElementById('btnSshUpdate') as HTMLElement).click();
      await flush();

      const rows = document.querySelectorAll('#sshImportBody .ssh-import-row');
      expect(rows.length).toBe(0);
    });

    it('refreshes the list when the Options update field is toggled', async () => {
      const api = window.api;
      vi.mocked(api.sshConnectionList).mockResolvedValue([
        { id: 'c1', name: 'legacy', host: 'example.com', port: 22, userId: null, folderId: null },
      ]);
      vi.mocked(api.sshImportConfig).mockResolvedValue({
        canceled: false,
        path: '/tmp/ssh_config',
        hosts: [
          { name: 'legacy', aliases: [], host: 'example.com', port: 22, user: '', identityFile: null, proxyJump: null, kexAlgorithms: '+diffie-hellman-group14-sha1' },
        ],
      });

      (document.getElementById('btnSshUpdate') as HTMLElement).click();
      await flush();

      const rowCount = () => document.querySelectorAll('#sshImportBody .ssh-import-row').length;
      expect(rowCount()).toBe(1);

      const optionsCb = document.getElementById('updGlobalOptions') as HTMLInputElement;
      optionsCb.checked = false;
      optionsCb.dispatchEvent(new Event('change'));
      await flush();
      expect(rowCount()).toBe(0);

      optionsCb.checked = true;
      optionsCb.dispatchEvent(new Event('change'));
      await flush();
      expect(rowCount()).toBe(1);
    });

    it('applies config algorithm options on save when the Options field is checked', async () => {
      const api = window.api;
      vi.mocked(api.sshConnectionList).mockResolvedValue([
        { id: 'c1', name: 'web', host: 'old.example.com', port: 22, userId: 'u1', folderId: null, hostKeyAlgorithms: '+ssh-rsa' },
      ]);
      vi.mocked(api.sshImportConfig).mockResolvedValue({
        canceled: false,
        path: '/tmp/ssh_config',
        hosts: [
          { name: 'web', aliases: [], host: 'new.example.com', port: 22, user: 'admin', identityFile: null, proxyJump: null, hostKeyAlgorithms: '+ssh-rsa,ssh-dss' },
        ],
      });

      (document.getElementById('btnSshUpdate') as HTMLElement).click();
      await flush();

      (document.getElementById('sshImportConfirm') as HTMLElement).click();
      await flush();

      expect(api.sshImportApply).toHaveBeenCalledWith(expect.objectContaining({
        mode: 'update',
        doOptions: true,
        hosts: expect.arrayContaining([
          expect.objectContaining({
            existingConnId: 'c1',
            host: 'new.example.com',
            hostKeyAlgorithms: '+ssh-rsa,ssh-dss',
          }),
        ]),
      }));
    });

    it('keeps stored algorithm options on save when the Options field is unchecked', async () => {
      const api = window.api;
      vi.mocked(api.sshConnectionList).mockResolvedValue([
        { id: 'c1', name: 'web', host: 'old.example.com', port: 22, userId: 'u1', folderId: null, hostKeyAlgorithms: '+ssh-rsa' },
      ]);
      vi.mocked(api.sshImportConfig).mockResolvedValue({
        canceled: false,
        path: '/tmp/ssh_config',
        hosts: [
          { name: 'web', aliases: [], host: 'new.example.com', port: 22, user: 'admin', identityFile: null, proxyJump: null, hostKeyAlgorithms: '+ssh-rsa,ssh-dss' },
        ],
      });

      (document.getElementById('btnSshUpdate') as HTMLElement).click();
      await flush();

      const optionsCb = document.getElementById('updGlobalOptions') as HTMLInputElement;
      optionsCb.checked = false;
      optionsCb.dispatchEvent(new Event('change'));
      await flush();

      (document.getElementById('sshImportConfirm') as HTMLElement).click();
      await flush();

      expect(api.sshImportApply).toHaveBeenCalledWith(expect.objectContaining({
        mode: 'update',
        doOptions: false,
        hosts: expect.arrayContaining([
          expect.objectContaining({
            existingConnId: 'c1',
            host: 'new.example.com',
            hostKeyAlgorithms: '+ssh-rsa,ssh-dss',
          }),
        ]),
      }));
    });
  });
});
