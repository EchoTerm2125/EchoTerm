const { app, BrowserWindow, ipcMain, Menu, safeStorage, session } = require('electron');
const path = require('path');

// Infrastructure adapters
import { CryptoVault } from './src/main/infrastructure/crypto-vault';
import { ElectronDialogService } from './src/main/infrastructure/electron-dialog-service';
import { FileConnectionRepository } from './src/main/infrastructure/file-connection-repository';
import { FileFolderRepository } from './src/main/infrastructure/file-folder-repository';
import { FileUserRepository } from './src/main/infrastructure/file-user-repository';
import { FileUpdateSettingsStore } from './src/main/infrastructure/file-update-settings';
import { NodePtyGateway } from './src/main/infrastructure/node-pty-gateway';
import { WindowsShellDetector } from './src/main/infrastructure/windows-shell-detector';

// Application use cases
import {
  ClearSshData, DeleteConnection, DeleteFolder, DeleteUser, ExportSshConfig,
  GetVaultStatus, ListConnections, ListFolders, ListUsers,
  OpenFolder, SaveConnection, SaveFolder, SaveUser,
  SetMasterPassword, SpawnShellSession, SpawnSshSession,
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
const folderRepo = new FileFolderRepository(vault);
const ptyGateway = new NodePtyGateway();
const shellDetector = new WindowsShellDetector();
const sessionRegistry = new SessionRegistry();

let mainWindow = null;

// Set when the user confirmed the update install: the window close interceptor
// must let quitAndInstall() close the window without asking the renderer again.
let installingUpdate = false;

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
  new ListConnections(connectionRepo),
  new SaveConnection(connectionRepo),
  new DeleteConnection(connectionRepo),
  new ListFolders(folderRepo),
  new SaveFolder(folderRepo),
  new DeleteFolder(folderRepo),
  new OpenFolder(connectionRepo, folderRepo),
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

    // Auto-update: check for updates shortly after launch so the check never
    // competes with terminal spawn at startup. Runs for both packaged and dev
    // runs (dev consults dev-app-update.yml, see UpdateController.init()); the
    // user's "check automatically" setting still governs via update policy.
    updateController.init();
    setTimeout(() => updateController.checkForUpdates(false), 5000);

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
ipcMain.handle('ssh:connection-list', () => sshController.listConnections());
ipcMain.handle('ssh:connection-save', (event, connData) => sshController.saveConnection(connData));
ipcMain.handle('ssh:connection-delete', (event, connId) => sshController.deleteConnection(connId));
ipcMain.handle('ssh:folder-list', () => sshController.listFolders());
ipcMain.handle('ssh:folder-save', (event, folderData) => sshController.saveFolder(folderData));
ipcMain.handle('ssh:folder-delete', (event, folderId) => sshController.deleteFolder(folderId));
ipcMain.handle('ssh:connect', (event, connectionId) => sshController.connect(connectionId));
ipcMain.handle('ssh:open-folder', (event, folderId) => sshController.openFolder(folderId));
ipcMain.handle('ssh:import-config', (event, customPath) => sshController.importConfig(customPath));
ipcMain.handle('ssh:import-apply', (event, request) => sshController.importApply(request));
ipcMain.handle('ssh:export-config', () => sshController.exportConfig());

// ─── Auto-update IPC handlers ───────────────────────────────────────────────
ipcMain.handle('update:check', () => updateController.checkForUpdates(true));
ipcMain.handle('update:get-settings', () => updateController.getSettings());
ipcMain.handle('update:set-settings', (event, patch) => updateController.setSettings(patch));
ipcMain.handle('update:get-build-type', () => ({ portable: updateController.isPortableBuild() }));
ipcMain.handle('update:install', () => {
  // Portable/zip builds open the GitHub releases page instead — no app close,
  // so no need to bypass the close interceptor. Installed builds: the renderer
  // already warned the user and got confirmation, so let quitAndInstall close
  // the window and run the (assisted) installer. The flag is only set for
  // packaged, non-portable runs — that is the only path where quitAndInstall
  // actually quits; dev runs no-op (electron-updater dispatches an async
  // 'error' and returns without quitting), so the flag must not linger there.
  if (!updateController.isPortableBuild() && app.isPackaged) {
    installingUpdate = true;
  }
  try {
    updateController.installUpdate();
  } catch (err) {
    // The quit-and-install did not proceed — restore the close interceptor so
    // future window closes still ask the renderer for confirmation.
    installingUpdate = false;
    console.error('Update install failed:', err);
  }
});

export {};
