const { app, BrowserWindow, ipcMain, Menu, safeStorage, session } = require('electron');
const path = require('path');

// Infrastructure adapters
import { CryptoVault } from './src/main/infrastructure/crypto-vault';
import { ElectronDialogService } from './src/main/infrastructure/electron-dialog-service';
import { FileConnectionFolderRepository } from './src/main/infrastructure/file-connection-folder-repository';
import { FileConnectionRepository } from './src/main/infrastructure/file-connection-repository';
import { FileUserFolderRepository } from './src/main/infrastructure/file-user-folder-repository';
import { FileUserRepository } from './src/main/infrastructure/file-user-repository';
import { FileUpdateSettingsStore } from './src/main/infrastructure/file-update-settings';
import { FileWindowBounds } from './src/main/infrastructure/file-window-bounds';
import { NodePtyGateway } from './src/main/infrastructure/node-pty-gateway';
import { WindowsShellDetector } from './src/main/infrastructure/windows-shell-detector';

// Application use cases
import {
  ClearSshData, DeleteConnection, DeleteConnectionFolder, DeleteUser, DeleteUserFolder,
  ExportSshConfig, GetVaultStatus, ListConnectionFolders, ListConnections,
  ListUserFolders, ListUsers, OpenConnectionFolder, SaveConnection, SaveConnectionFolder,
  SaveUser, SaveUserFolder, SetMasterPassword, SpawnShellSession, SpawnSshSession,
  UnlockWithOsCredentials, UnlockWithPassword, UseOsEncryption,
  ApplySshImport,
} from './src/application/use-cases';

// Controllers
import { SessionRegistry } from './src/main/controllers/session-registry';
import { SshController } from './src/main/controllers/ssh-controller';
import { TerminalController } from './src/main/controllers/terminal-controller';
import { UpdateController } from './src/main/controllers/update-controller';

// ─── Global error handlers ──────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

// ─── Composition root: adapters → use cases → controllers ───────────────────
const vault = new CryptoVault(path.join(app.getPath('userData'), 'ssh'), safeStorage);
const userRepo = new FileUserRepository(vault);
const connectionRepo = new FileConnectionRepository(vault);
const userFolderRepo = new FileUserFolderRepository(vault);
const connectionFolderRepo = new FileConnectionFolderRepository(vault);
const ptyGateway = new NodePtyGateway();
const shellDetector = new WindowsShellDetector();
const sessionRegistry = new SessionRegistry();

let mainWindow = null;

// Set when the user confirmed the update install: the window close interceptor
// must let quitAndInstall() close the window without asking the renderer again.
let installingUpdate = false;

// ─── Search panel window (Ctrl+Shift+F) ─────────────────────────────────────
// The panel owns no terminal: it relays "run search" and "jump" to the main
// window's renderer, which is the only place the xterm buffers live.
let searchWindow: Electron.BrowserWindow | null = null;
let lastPanelTheme: unknown = null;
let lastPanelGroupState: unknown = null;
let panelRequestSeq = 0;
const pendingPanelRuns = new Map<number, (results: unknown) => void>();
const searchPanelBounds = new FileWindowBounds(path.join(app.getPath('userData'), 'search-panel.json'));

const EMPTY_SEARCH_RESULTS = { empty: true, groups: [], total: 0, truncated: false, query: '' };

function createSearchWindow(): Electron.BrowserWindow | null {
  if (searchWindow && !searchWindow.isDestroyed()) return searchWindow;

  const saved = searchPanelBounds.load() || {};
  const width = typeof saved.width === 'number' ? saved.width : 420;
  const height = typeof saved.height === 'number' ? saved.height : 460;
  // Default to the main window's top-right corner when nothing was saved yet.
  const fallbackX = mainWindow ? mainWindow.getBounds().x + mainWindow.getBounds().width - width - 24 : undefined;
  const fallbackY = mainWindow ? mainWindow.getBounds().y + 80 : undefined;

  searchWindow = new BrowserWindow({
    width,
    height,
    x: typeof saved.x === 'number' ? saved.x : fallbackX,
    y: typeof saved.y === 'number' ? saved.y : fallbackY,
    minWidth: 320,
    minHeight: 260,
    frame: false,
    show: false,
    backgroundColor: '#11111b',
    title: 'EchoTerm Search',
    icon: path.join(__dirname, '..', 'build-assets', 'echoterm.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload-search.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  searchWindow.loadFile(path.join(__dirname, '..', 'renderer', 'search-window.html'));
  searchWindow.once('ready-to-show', () => { if (searchWindow) searchWindow.show(); });

  const persistBounds = () => {
    if (!searchWindow || searchWindow.isDestroyed()) return;
    searchPanelBounds.save(searchWindow.getBounds());
  };
  searchWindow.on('resize', persistBounds);
  searchWindow.on('move', persistBounds);

  searchWindow.on('closed', () => {
    for (const resolve of pendingPanelRuns.values()) resolve(EMPTY_SEARCH_RESULTS);
    pendingPanelRuns.clear();
    searchWindow = null;
    sendToRenderer('panel:closed');
  });

  return searchWindow;
}

// ─── Single instance: only one EchoTerm window may be open ──────────────────
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Focus the already-open window instead of opening a second one
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
      // Show a translated in-app warning instead of a native dialog
      mainWindow.webContents.send('app:single-instance-warning');
    }
  });
}

const sendToRenderer = (channel: string, ...args: unknown[]) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args);
  }
};
const dialogs = new ElectronDialogService(() => mainWindow);

const updateController = new UpdateController(
  new FileUpdateSettingsStore(path.join(app.getPath('userData'), 'settings.json')),
  sendToRenderer,
);

const terminalController = new TerminalController(
  new SpawnShellSession(shellDetector, ptyGateway),
  shellDetector,
  dialogs,
  sessionRegistry,
  sendToRenderer,
);

const sshController = new SshController(
  new GetVaultStatus(vault),
  new SetMasterPassword(vault),
  new UseOsEncryption(vault),
  new ClearSshData(vault),
  new UnlockWithPassword(vault),
  new UnlockWithOsCredentials(vault),
  new ListUsers(userRepo),
  new SaveUser(userRepo),
  new DeleteUser(userRepo),
  new ListUserFolders(userFolderRepo),
  new SaveUserFolder(userFolderRepo),
  new DeleteUserFolder(userFolderRepo),
  new ListConnections(connectionRepo),
  new SaveConnection(connectionRepo),
  new DeleteConnection(connectionRepo),
  new ListConnectionFolders(connectionFolderRepo),
  new SaveConnectionFolder(connectionFolderRepo),
  new DeleteConnectionFolder(connectionFolderRepo),
  new OpenConnectionFolder(connectionRepo, connectionFolderRepo),
  new ExportSshConfig(connectionRepo, userRepo),
  new SpawnSshSession(connectionRepo, ptyGateway),
  new ApplySshImport(vault, userRepo, connectionRepo),
  dialogs,
  sessionRegistry,
  sendToRenderer,
);

// ─── Window ───────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    minWidth: 600,
    minHeight: 400,
    frame: false,
    backgroundColor: '#11111b',
    title: 'EchoTerm',
    icon: path.join(__dirname, '..', 'build-assets', 'echoterm.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Compiled main process lives in build/, sources stay at project root
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  // DevTools in dev
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('close', (e) => {
    // Installing an update: the user already confirmed in the install warning,
    // so let the window close and the installer run.
    if (installingUpdate) return;
    // Prevent immediate close — ask renderer to confirm first
    e.preventDefault();
    mainWindow.webContents.send('app:confirm-close');
  });

  // Keep the custom titlebar's maximize/restore icon in sync
  mainWindow.on('maximize', () => sendToRenderer('window:maximized-changed', true));
  mainWindow.on('unmaximize', () => sendToRenderer('window:maximized-changed', false));

  mainWindow.on('closed', () => {
    mainWindow = null;
    // The panel is a companion of the main window: without it there is nothing
    // to search, and leaving it open would keep the app from quitting.
    if (searchWindow && !searchWindow.isDestroyed()) searchWindow.destroy();
  });
}

// ─── Window controls (custom titlebar) ──────────────────────────────────────
ipcMain.on('window:minimize', () => { if (mainWindow) mainWindow.minimize(); });
ipcMain.on('window:maximize-toggle', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
// Goes through the 'close' interceptor, so the renderer confirm flow is preserved
ipcMain.on('window:close', () => { if (mainWindow) mainWindow.close(); });
ipcMain.handle('window:is-maximized', () => (mainWindow ? mainWindow.isMaximized() : false));

// IPC: renderer confirms it's OK to close
ipcMain.on('app:close-confirmed', () => {
  if (mainWindow) {
    // Remove the close listener so it doesn't trigger again
    mainWindow.removeAllListeners('close');
    mainWindow.close();
  }
});

// IPC: application info for the About page
ipcMain.handle('app:info', () => ({
  name: app.getName(),
  version: app.getVersion(),
}));

// IPC: wipe all app data (cache, browser storage, SSH store) and restart the app
// so it boots exactly like a first launch. The renderer never receives the reply
// because the process relaunches immediately.
ipcMain.handle('app:clear-all-data', async () => {
  try {
    await session.defaultSession.clearCache();
    await session.defaultSession.clearCodeCaches({});
    // Clears localStorage, cookies, IndexedDB, etc. for this session
    await session.defaultSession.clearStorageData();
    // Wipe the encrypted SSH store (users, connections, folders)
    vault.resetData();
    // Terminate pty sessions before exiting
    sessionRegistry.killAll();
    app.relaunch();
    app.exit(0);
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
});

// IPC: clear only the app's Chromium session cache (settings and SSH data kept)
ipcMain.handle('cache:clear', async () => {
  try {
    await session.defaultSession.clearCache();
    await session.defaultSession.clearCodeCaches({});
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
});

if (gotTheLock) {
  app.whenReady().then(() => {
    // Hide the default Electron menu bar
    Menu.setApplicationMenu(null);

    createWindow();

    // Auto-update: check shortly after launch, then every 3 hours while the
    // app runs. Runs for both packaged and dev runs (dev consults
    // dev-app-update.yml, see UpdateController.init()); the user's "check
    // automatically" setting still governs via the update policy, and a tick
    // is skipped while a previous check/download is busy.
    updateController.init();
    updateController.startAutoUpdateSchedule();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  // Kill all pty processes
  sessionRegistry.killAll();
  if (process.platform !== 'darwin') app.quit();
});

// ─── IPC handlers ────────────────────────────────────────────────────────────
ipcMain.handle('shell:get-default', () => terminalController.getDefaultShells());
ipcMain.handle('shell:locate-gitbash', () => terminalController.locateGitBash());
ipcMain.handle('terminal:spawn', (event, shellKey) => terminalController.spawn(shellKey));
ipcMain.on('terminal:write', (event, id, data) => terminalController.write(id, data));
ipcMain.on('terminal:resize', (event, id, cols, rows) => terminalController.resize(id, cols, rows));
ipcMain.on('terminal:kill', (event, id) => terminalController.kill(id));

ipcMain.handle('ssh:password-status', () => sshController.passwordStatus());
ipcMain.handle('ssh:set-password', (event, password) => sshController.setPassword(password));
ipcMain.handle('ssh:use-safe-storage', () => sshController.useSafeStorage());
ipcMain.handle('ssh:unlock', (event, password) => sshController.unlock(password));
ipcMain.handle('ssh:try-unlock', () => sshController.tryUnlock());
ipcMain.handle('ssh:clear-all', () => sshController.clearAll());
ipcMain.handle('ssh:user-list', () => sshController.listUsers());
ipcMain.handle('ssh:user-save', (event, userData) => sshController.saveUser(userData));
ipcMain.handle('ssh:user-delete', (event, userId) => sshController.deleteUser(userId));
ipcMain.handle('ssh:user-folder-list', () => sshController.listUserFolders());
ipcMain.handle('ssh:user-folder-save', (event, folderData) => sshController.saveUserFolder(folderData));
ipcMain.handle('ssh:user-folder-delete', (event, folderId) => sshController.deleteUserFolder(folderId));
ipcMain.handle('ssh:connection-list', () => sshController.listConnections());
ipcMain.handle('ssh:connection-save', (event, connData) => sshController.saveConnection(connData));
ipcMain.handle('ssh:connection-delete', (event, connId) => sshController.deleteConnection(connId));
ipcMain.handle('ssh:connection-folder-list', () => sshController.listConnectionFolders());
ipcMain.handle('ssh:connection-folder-save', (event, folderData) => sshController.saveConnectionFolder(folderData));
ipcMain.handle('ssh:connection-folder-delete', (event, folderId) => sshController.deleteConnectionFolder(folderId));
ipcMain.handle('ssh:connect', (event, connectionId) => sshController.connect(connectionId));
ipcMain.handle('ssh:open-connection-folder', (event, folderId) => sshController.openConnectionFolder(folderId));
ipcMain.handle('ssh:import-config', (event, customPath) => sshController.importConfig(customPath));
ipcMain.handle('ssh:import-apply', (event, request) => sshController.importApply(request));
ipcMain.handle('ssh:export-config', () => sshController.exportConfig());

// ─── Search panel IPC (Ctrl+Shift+F) ────────────────────────────────────────
// The panel window runs its own page; every search it triggers is relayed to
// the main window's renderer, where the xterm buffers live.
ipcMain.handle('panel:open', () => {
  const win = createSearchWindow();
  if (!win) return { success: false, error: 'WINDOW_FAILED' };
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
  return { success: true };
});

ipcMain.handle('panel:init', () => lastPanelTheme || { theme: 'dark', labels: {} });

// The active group's last search, cached so a freshly opened panel can restore
// it (the main window pushes it before opening the window).
ipcMain.handle('panel:group-state', () => lastPanelGroupState);

ipcMain.on('panel:show', (event, state) => {
  lastPanelGroupState = state ?? null;
  if (searchWindow && !searchWindow.isDestroyed()) searchWindow.webContents.send('panel:show', lastPanelGroupState);
});

ipcMain.on('panel:theme-push', (event, info) => {
  lastPanelTheme = info;
  if (searchWindow && !searchWindow.isDestroyed()) searchWindow.webContents.send('panel:theme', info);
});

ipcMain.handle('panel:run', (event, query, options) => {
  if (!mainWindow || mainWindow.isDestroyed()) return EMPTY_SEARCH_RESULTS;
  return new Promise((resolve) => {
    const requestId = ++panelRequestSeq;
    pendingPanelRuns.set(requestId, resolve);
    mainWindow.webContents.send('panel:run', requestId, query, options);
    // Never leave the panel hanging if the main window is busy or gone.
    setTimeout(() => {
      const pending = pendingPanelRuns.get(requestId);
      if (pending) {
        pendingPanelRuns.delete(requestId);
        pending(EMPTY_SEARCH_RESULTS);
      }
    }, 5000);
  });
});

ipcMain.on('panel:run-result', (event, requestId, results) => {
  const resolve = pendingPanelRuns.get(requestId);
  if (resolve) {
    pendingPanelRuns.delete(requestId);
    resolve(results);
  }
});

ipcMain.on('panel:jump', (event, match) => sendToRenderer('panel:jump', match));

ipcMain.on('panel:close', () => {
  if (searchWindow && !searchWindow.isDestroyed()) searchWindow.close();
});

// ─── Auto-update IPC handlers ───────────────────────────────────────────────
ipcMain.handle('update:check', () => updateController.checkForUpdates(true));
ipcMain.handle('update:get-settings', () => updateController.getSettings());
ipcMain.handle('update:set-settings', (event, patch) => updateController.setSettings(patch));
ipcMain.handle('update:get-build-type', () => ({ portable: updateController.isPortableBuild() }));
ipcMain.handle('update:install', () => {
  // Only bypass the close interceptor when the install will actually quit the
  // app: portable/zip builds open the GitHub page (no app close), and a run
  // with nothing downloaded must not silently disable the close-confirm for
  // the rest of the session. The bypass is intentionally NOT gated on
  // app.isPackaged: dev runs are allowed to quitAndInstall so the update flow
  // (dev-app-update.yml) can be exercised during development.
  if (!updateController.isPortableBuild() && updateController.isUpdateDownloaded()) {
    installingUpdate = true;
  }
  try {
    const outcome = updateController.installUpdate();
    // quitAndInstall can silently fail to start; only keep the close
    // interceptor bypassed when the install actually proceeded.
    if (!outcome.success) installingUpdate = false;
    return outcome;
  } catch (err) {
    // The quit-and-install did not proceed — restore the close interceptor so
    // future window closes still ask the renderer for confirmation.
    installingUpdate = false;
    console.error('Update install failed:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
});

export {};
