const { contextBridge, ipcRenderer } = require('electron');

import type { WindowApi } from './shared/ipc';

const api: WindowApi = {
  // ─── Shell ──────────────────────────────────────────────────────────────────
  getDefaultShells: () => ipcRenderer.invoke('shell:get-default'),
  locateGitBash: () => ipcRenderer.invoke('shell:locate-gitbash'),

  // ─── Terminal lifecycle ─────────────────────────────────────────────────────
  spawnTerminal: (shell) => ipcRenderer.invoke('terminal:spawn', shell),
  write: (id, data) => ipcRenderer.send('terminal:write', id, data),
  resize: (id, cols, rows) => ipcRenderer.send('terminal:resize', id, cols, rows),
  killTerminal: (id) => ipcRenderer.send('terminal:kill', id),

  // ─── Terminal events (main → renderer) ──────────────────────────────────────
  onData: (callback) => {
    const listener = (_event: unknown, id: number, data: string) => callback(id, data);
    ipcRenderer.on('terminal:data', listener);
    return () => ipcRenderer.removeListener('terminal:data', listener);
  },
  onExit: (callback) => {
    const listener = (_event: unknown, id: number) => callback(id);
    ipcRenderer.on('terminal:exit', listener);
    return () => ipcRenderer.removeListener('terminal:exit', listener);
  },

  // ─── App lifecycle ─────────────────────────────────────────────────────────
  onConfirmClose: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('app:confirm-close', listener);
    return () => ipcRenderer.removeListener('app:confirm-close', listener);
  },
  confirmClose: () => ipcRenderer.send('app:close-confirmed'),
  onSingleInstanceWarning: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('app:single-instance-warning', listener);
    return () => ipcRenderer.removeListener('app:single-instance-warning', listener);
  },

  // ─── App info (About page) ───────────────────────────────────────────────
  getAppInfo: () => ipcRenderer.invoke('app:info'),

  // ─── Auto-update ─────────────────────────────────────────────────────────
  updateCheck: () => ipcRenderer.invoke('update:check'),
  updateGetSettings: () => ipcRenderer.invoke('update:get-settings'),
  updateSetSettings: (patch) => ipcRenderer.invoke('update:set-settings', patch),
  updateSkipVersion: (version) => ipcRenderer.invoke('update:skip-version', version),
  updateRemindLater: () => ipcRenderer.invoke('update:remind-later'),
  updateInstall: () => ipcRenderer.invoke('update:install'),
  onUpdateAvailable: (callback) => {
    const listener = (_event: unknown, info: unknown) => callback(info as never);
    ipcRenderer.on('update:available', listener);
    return () => ipcRenderer.removeListener('update:available', listener);
  },
  onUpdateNotAvailable: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('update:not-available', listener);
    return () => ipcRenderer.removeListener('update:not-available', listener);
  },
  onUpdateProgress: (callback) => {
    const listener = (_event: unknown, info: unknown) => callback(info as never);
    ipcRenderer.on('update:progress', listener);
    return () => ipcRenderer.removeListener('update:progress', listener);
  },
  onUpdateDownloaded: (callback) => {
    const listener = (_event: unknown, info: unknown) => callback(info as never);
    ipcRenderer.on('update:downloaded', listener);
    return () => ipcRenderer.removeListener('update:downloaded', listener);
  },
  onUpdateError: (callback) => {
    const listener = (_event: unknown, info: unknown) => callback(info as never);
    ipcRenderer.on('update:error', listener);
    return () => ipcRenderer.removeListener('update:error', listener);
  },
  onUpdatePortable: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('update:portable', listener);
    return () => ipcRenderer.removeListener('update:portable', listener);
  },

  // ─── Cache ───────────────────────────────────────────────────────────────
  clearCache: () => ipcRenderer.invoke('cache:clear'),

  // ─── App data reset (wipe all data and restart) ────────────────────────────
  clearAllData: () => ipcRenderer.invoke('app:clear-all-data'),

  // ─── Window controls (custom titlebar) ─────────────────────────────────────
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  toggleMaximizeWindow: () => ipcRenderer.send('window:maximize-toggle'),
  closeWindow: () => ipcRenderer.send('window:close'),
  isWindowMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  onWindowMaximizedChange: (callback) => {
    const listener = (_event: unknown, maximized: boolean) => callback(maximized);
    ipcRenderer.on('window:maximized-changed', listener);
    return () => ipcRenderer.removeListener('window:maximized-changed', listener);
  },

  // ─── SSH Connection Store ──────────────────────────────────────────────────
  sshPasswordStatus: () => ipcRenderer.invoke('ssh:password-status'),
  sshSetPassword: (password) => ipcRenderer.invoke('ssh:set-password', password),
  sshUseSafeStorage: () => ipcRenderer.invoke('ssh:use-safe-storage'),
  sshUnlock: (password) => ipcRenderer.invoke('ssh:unlock', password),
  sshTryUnlock: () => ipcRenderer.invoke('ssh:try-unlock'),

  sshClearAll: () => ipcRenderer.invoke('ssh:clear-all'),

  sshUserList: () => ipcRenderer.invoke('ssh:user-list'),
  sshUserSave: (userData) => ipcRenderer.invoke('ssh:user-save', userData),
  sshUserDelete: (userId) => ipcRenderer.invoke('ssh:user-delete', userId),

  sshConnectionList: () => ipcRenderer.invoke('ssh:connection-list'),
  sshConnectionSave: (connData) => ipcRenderer.invoke('ssh:connection-save', connData),
  sshConnectionDelete: (connId) => ipcRenderer.invoke('ssh:connection-delete', connId),

  sshFolderList: () => ipcRenderer.invoke('ssh:folder-list'),
  sshFolderSave: (folderData) => ipcRenderer.invoke('ssh:folder-save', folderData),
  sshFolderDelete: (folderId) => ipcRenderer.invoke('ssh:folder-delete', folderId),

  sshConnect: (connectionId) => ipcRenderer.invoke('ssh:connect', connectionId),
  sshOpenFolder: (folderId) => ipcRenderer.invoke('ssh:open-folder', folderId),
  sshImportConfig: (filePath) => ipcRenderer.invoke('ssh:import-config', filePath),
  sshImportApply: (request) => ipcRenderer.invoke('ssh:import-apply', request),
  sshExportConfig: () => ipcRenderer.invoke('ssh:export-config'),
};

contextBridge.exposeInMainWorld('api', api);

export {};
