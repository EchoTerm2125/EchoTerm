// Unit tests for ssh-panel.ts — sidebar rendering and delete confirm flows
import { vi } from 'vitest';
import { resetTestEnv, loadModules, getApp } from '../setup.js';

// ─── DOM scaffolding for the SSH panel (mirrors renderer/index.html) ────────
const SSH_DIV_IDS = [
  'sshSidebar', 'sshConnectionList', 'sshUserList',
  'sshPasswordDialog', 'sshPasswordTitle', 'sshPasswordConfirmGroup', 'sshPasswordError',
  'sshImportDialog', 'sshImportBody',
  'sshContextMenu', 'sshCtxOpenSep', 'sshCtxOpenFolder', 'sshCtxMoveSep',
  'sshCtxMoveItem', 'sshCtxFolderSubmenu',
  'sshDialog', 'sshDialogTitle', 'sshDialogBody',
];
const SSH_BUTTON_IDS = [
  'sshPasswordBtn', 'sshPasswordSkip', 'sshPasswordCancel',
  'sshImportCancel', 'sshImportConfirm', 'sshDialogSave', 'sshDialogCancel',
  'btnSshImport', 'btnSshUpdate',
];
const SSH_INPUT_IDS = ['sshPasswordInput', 'sshPasswordConfirm'];

function scaffoldSshDom() {
  for (const id of [...SSH_DIV_IDS, ...SSH_BUTTON_IDS, ...SSH_INPUT_IDS]) {
    document.getElementById(id)?.remove();
  }
  for (const id of SSH_DIV_IDS) {
    const el = document.createElement('div');
    el.id = id;
    document.body.appendChild(el);
  }
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
