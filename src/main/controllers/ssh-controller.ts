/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — SSH controller: IPC interface adapter for the SSH feature
   Translates SSH IPC calls into use case invocations and shapes IPC responses
   to keep the frozen IPC contract (masked users, list views, error objects).
   ═══════════════════════════════════════════════════════════════════════════ */

import fs from 'fs';
import os from 'os';
import path from 'path';

import type { Connection, Folder, User } from '../../domain/entities/ssh';
import type { DialogService } from '../../domain/ports/dialog-service';
import { parseSshConfigText } from '../../domain/services/ssh-config';
import type {
  GetVaultStatus, SetMasterPassword, UseOsEncryption, UnlockWithPassword, UnlockWithOsCredentials,
  ClearSshData, ApplySshImport,
  ListUsers, SaveUser, DeleteUser,
  ListConnections, SaveConnection, DeleteConnection,
  ListFolders, SaveFolder, DeleteFolder,
  OpenFolder, ExportSshConfig, SpawnSshSession,
} from '../../application/use-cases';
import type { SshImportApplyRequest } from '../../../shared/ipc';
import { sessionEvents } from './session-registry';
import type { SendToRenderer, SessionRegistry } from './session-registry';

export class SshController {
  constructor(
    private readonly getVaultStatusUseCase: GetVaultStatus,
    private readonly setMasterPasswordUseCase: SetMasterPassword,
    private readonly useOsEncryptionUseCase: UseOsEncryption,
    private readonly clearSshDataUseCase: ClearSshData,
    private readonly unlockWithPasswordUseCase: UnlockWithPassword,
    private readonly unlockWithOsCredentialsUseCase: UnlockWithOsCredentials,
    private readonly listUsersUseCase: ListUsers,
    private readonly saveUserUseCase: SaveUser,
    private readonly deleteUserUseCase: DeleteUser,
    private readonly listConnectionsUseCase: ListConnections,
    private readonly saveConnectionUseCase: SaveConnection,
    private readonly deleteConnectionUseCase: DeleteConnection,
    private readonly listFoldersUseCase: ListFolders,
    private readonly saveFolderUseCase: SaveFolder,
    private readonly deleteFolderUseCase: DeleteFolder,
    private readonly openFolderUseCase: OpenFolder,
    private readonly exportSshConfigUseCase: ExportSshConfig,
    private readonly spawnSshSessionUseCase: SpawnSshSession,
    private readonly applySshImportUseCase: ApplySshImport,
    private readonly dialogs: DialogService,
    private readonly registry: SessionRegistry,
    private readonly send: SendToRenderer,
  ) {}

  // ── Vault ──

  passwordStatus() {
    return this.getVaultStatusUseCase.execute();
  }

  async setPassword(password: string) {
    try {
      await this.setMasterPasswordUseCase.execute(password);
      return { success: true };
    } catch (err) {
      return { error: err.message };
    }
  }

  useSafeStorage() {
    try {
      this.useOsEncryptionUseCase.execute();
      return { success: true };
    } catch (err) {
      return { error: err.message };
    }
  }

  async unlock(password: string) {
    try {
      return await this.unlockWithPasswordUseCase.execute(password);
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  tryUnlock() {
    try {
      return this.unlockWithOsCredentialsUseCase.execute();
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  clearAll() {
    try {
      this.clearSshDataUseCase.execute();
      return { success: true };
    } catch (err) {
      return { error: err.message };
    }
  }

  // ── Users ──

  listUsers() {
    return this.listUsersUseCase.execute().map(u => this.maskUser(u));
  }

  saveUser(userData: User) {
    try {
      const saved = this.saveUserUseCase.execute(userData);
      return { success: true, user: this.maskUser(saved) };
    } catch (err) {
      return { error: err.message };
    }
  }

  deleteUser(userId: string) {
    try {
      this.deleteUserUseCase.execute(userId);
      return { success: true };
    } catch (err) {
      return { error: err.message };
    }
  }

  // ── Connections ──

  listConnections() {
    const connections = this.listConnectionsUseCase.execute();
    const users = this.listUsersUseCase.execute();
    return connections.map(c => this.toConnectionView(c, users, connections));
  }

  saveConnection(connData: Connection) {
    try {
      const saved = this.saveConnectionUseCase.execute(connData);
      const users = this.listUsersUseCase.execute();
      const connections = this.listConnectionsUseCase.execute();
      return { success: true, connection: this.toConnectionView(saved, users, connections) };
    } catch (err) {
      return { error: err.message };
    }
  }

  deleteConnection(connId: string) {
    try {
      this.deleteConnectionUseCase.execute(connId);
      return { success: true };
    } catch (err) {
      return { error: err.message };
    }
  }

  // ── Folders ──

  listFolders() {
    const connections = this.listConnectionsUseCase.execute();
    const folders = this.listFoldersUseCase.execute();
    return folders.map(f => this.toFolderView(f, connections, folders));
  }

  saveFolder(folderData: Folder) {
    try {
      const saved = this.saveFolderUseCase.execute(folderData);
      const connections = this.listConnectionsUseCase.execute();
      const folders = this.listFoldersUseCase.execute();
      return { success: true, folder: this.toFolderView(saved, connections, folders) };
    } catch (err) {
      return { error: err.message };
    }
  }

  deleteFolder(folderId: string) {
    try {
      this.deleteFolderUseCase.execute(folderId);
      return { success: true };
    } catch (err) {
      return { error: err.message };
    }
  }

  // ── Sessions ──

  connect(connectionId: string) {
    const id = this.registry.createId();
    const events = sessionEvents(this.registry, id, this.send);
    const result = this.spawnSshSessionUseCase.execute(connectionId, id, os.homedir(), events);
    if ('error' in result) return { error: result.error, errorCode: result.errorCode };
    this.registry.register(id, { handle: result.handle, shell: 'ssh' });
    return { id: result.id, shell: 'ssh', label: result.label, host: result.host };
  }

  openFolder(folderId: string) {
    const result = this.openFolderUseCase.execute(folderId);
    if (!result) return { error: 'Folder not found.', errorCode: 'FOLDER_NOT_FOUND' };
    return {
      name: result.name,
      connections: result.connections.map(c => ({
        id: c.id,
        name: c.name,
        host: c.host,
        username: c.username,
      })),
    };
  }

  // ── SSH config import / export ──

  async importConfig(customPath?: string) {
    let configPath = customPath;
    if (!configPath) {
      const result = await this.dialogs.pickExistingFile({
        title: 'Select SSH Config File',
        defaultPath: path.join(os.homedir(), '.ssh', 'config'),
        filters: [
          { name: 'All Files', extensions: ['*'] },
        ],
      });
      if (result.canceled) return { canceled: true };
      configPath = result.filePath;
    }
    try {
      if (!fs.existsSync(configPath)) {
        return { error: `Config file not found: ${configPath}`, errorCode: 'CONFIG_NOT_FOUND', path: configPath };
      }
      const content = fs.readFileSync(configPath, 'utf8');
      const hosts = parseSshConfigText(content, os.homedir() + path.sep);
      if (hosts.length === 0) return { error: 'No hosts found in SSH config.', errorCode: 'NO_HOSTS_FOUND' };
      return { hosts, path: configPath };
    } catch (err) {
      return { error: err.message };
    }
  }

  importApply(request: SshImportApplyRequest) {
    try {
      return this.applySshImportUseCase.execute(request.hosts, request);
    } catch (err) {
      return { success: false, imported: 0, updated: 0, skipped: [], error: err.message };
    }
  }

  async exportConfig() {
    try {
      const configText = this.exportSshConfigUseCase.execute();
      const result = await this.dialogs.pickSaveFilePath({
        title: 'Export SSH Config',
        defaultPath: path.join(os.homedir(), 'ssh-config-export.txt'),
        filters: [
          { name: 'SSH Config', extensions: ['txt', 'config'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });
      if (result.canceled) return { canceled: true };
      fs.writeFileSync(result.filePath, configText, 'utf8');
      return { success: true, path: result.filePath };
    } catch (err) {
      return { error: err.message };
    }
  }

  // ── IPC presentation mapping (keeps the frozen IPC contract) ──

  private maskUser(user: User) {
    return {
      id: user.id, name: user.name, username: user.username,
      authType: user.authType, keyFilePath: user.keyFilePath,
    };
  }

  private toConnectionView(conn: Connection, users: User[], connections: Connection[]) {
    const user = conn.userId ? users.find(u => u.id === conn.userId) : null;
    // Resolve jump host display info
    let jumpHostDisplay = null;
    if (conn.jumpHost) {
      if (conn.jumpHost.type === 'manual') {
        jumpHostDisplay = `${conn.jumpHost.username || ''}@${conn.jumpHost.host || ''}`;
      } else if (conn.jumpHost.type === 'reference') {
        const refId = conn.jumpHost.connectionId;
        const jc = connections.find(c => c.id === refId);
        jumpHostDisplay = jc ? (jc.name || jc.host) : '(deleted)';
      }
    }
    return {
      id: conn.id, name: conn.name, host: conn.host, port: conn.port || 22,
      userId: conn.userId, folderId: conn.folderId || null,
      userName: user ? user.name : null,
      jumpHost: conn.jumpHost || null,
      jumpHostDisplay,
      hostKeyAlgorithms: conn.hostKeyAlgorithms || null,
      kexAlgorithms: conn.kexAlgorithms || null,
      pubkeyAcceptedAlgorithms: conn.pubkeyAcceptedAlgorithms || null,
    };
  }

  private toFolderView(folder: Folder, connections: Connection[], folders: Folder[]) {
    // Connections directly referencing this folder
    const connectionIds = connections.filter(c => c.folderId === folder.id).map(c => c.id);
    // Child folders
    const childFolderIds = folders.filter(f => f.parentId === folder.id).map(f => f.id);
    return {
      id: folder.id, name: folder.name, parentId: folder.parentId || null,
      connectionIds, childFolderIds,
      connectionCount: connectionIds.length, childCount: childFolderIds.length,
    };
  }
}
