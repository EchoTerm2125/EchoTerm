// Unit tests for src/main/infrastructure/ssh-data.ts — migrateData v2→v3
import { defaultData, migrateData } from '../../src/main/infrastructure/ssh-data';
import type { SshData } from '../../src/main/infrastructure/ssh-data';

describe('migrateData', () => {
  it('migrates a v2 payload: legacy `folders` becomes `connectionFolders`', () => {
    const raw = {
      users: [{ id: 'u1', name: 'Admin', username: 'admin', authType: 'password', password: 'x' }],
      connections: [{ id: 'c1', name: 'Srv', host: 'h', port: 22, userId: 'u1', folderId: 'g1', groupId: 'g1' }],
      folders: [{ id: 'g1', name: 'Work', parentId: null, connectionIds: ['c1'] }],
      version: 2,
    };
    const { data, changed } = migrateData(raw);
    expect(changed).toBe(true);
    expect(data.version).toBe(3);
    expect(data.connectionFolders).toEqual([{ id: 'g1', name: 'Work', parentId: null, connectionIds: ['c1'] }]);
    expect((data as unknown as Record<string, unknown>).folders).toBeUndefined();
    expect(data.userFolders).toEqual([]);
    // users/connections pass through; legacy groupId left for the connection repo
    expect(data.users).toHaveLength(1);
    expect(data.connections[0].groupId).toBe('g1');
  });

  it('adds userFolders when absent', () => {
    const raw = {
      users: [],
      connections: [],
      connectionFolders: [],
      version: 3,
    };
    const { data, changed } = migrateData(raw);
    expect(changed).toBe(true);
    expect(data.userFolders).toEqual([]);
  });

  it('leaves a current v3 payload untouched', () => {
    const raw: SshData = {
      users: [],
      connections: [],
      connectionFolders: [{ id: 'g1', name: 'Work', parentId: null }],
      userFolders: [{ id: 'uf1', name: 'Team', parentId: null }],
      version: 3,
    };
    const { data, changed } = migrateData(raw);
    expect(changed).toBe(false);
    expect(data).toEqual(raw);
  });

  it('handles null / non-object input by returning defaults', () => {
    const { data, changed } = migrateData(null);
    expect(changed).toBe(false);
    expect(data).toEqual(defaultData());
  });

  it('defaults missing arrays to empty', () => {
    const { data } = migrateData({ version: 2 });
    expect(data.users).toEqual([]);
    expect(data.connections).toEqual([]);
    expect(data.connectionFolders).toEqual([]);
    expect(data.userFolders).toEqual([]);
    expect(data.version).toBe(3);
  });
});
