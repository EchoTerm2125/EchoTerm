// Unit tests for folder repository cascade-delete and duplicate semantics
import { FileConnectionFolderRepository } from '../../src/main/infrastructure/file-connection-folder-repository';
import { FileUserFolderRepository } from '../../src/main/infrastructure/file-user-folder-repository';
import { FileUserRepository } from '../../src/main/infrastructure/file-user-repository';
import type { CryptoVault } from '../../src/main/infrastructure/crypto-vault';
import type { SshData } from '../../src/main/infrastructure/ssh-data';
import { defaultData } from '../../src/main/infrastructure/ssh-data';

// Minimal in-memory vault implementing only the surface the repos use
class FakeVault {
  constructor(private data: SshData = defaultData()) {}
  getData() { return this.data; }
  ensureData() { return this.data; }
  persist() { /* no-op */ }
}

describe('FileConnectionFolderRepository.delete', () => {
  it('cascade-deletes the folder subtree and every contained connection', () => {
    const vault = new FakeVault({
      users: [],
      connections: [
        { id: 'c1', name: 'A', host: 'a', port: 22, folderId: 'g1' },
        { id: 'c2', name: 'B', host: 'b', port: 22, folderId: 'g2' },
        { id: 'c3', name: 'C', host: 'c', port: 22, folderId: null },
      ],
      connectionFolders: [
        { id: 'g1', name: 'Root', parentId: null },
        { id: 'g2', name: 'Child', parentId: 'g1' },
      ],
      userFolders: [],
      version: 3,
    });
    const repo = new FileConnectionFolderRepository(vault as unknown as CryptoVault);

    repo.delete('g1');

    expect(vault.getData().connectionFolders).toEqual([]);
    expect(vault.getData().connections.map(c => c.id)).toEqual(['c3']);
  });

  it('throws when the folder does not exist', () => {
    const vault = new FakeVault();
    const repo = new FileConnectionFolderRepository(vault as unknown as CryptoVault);
    expect(() => repo.delete('missing')).toThrow('Folder not found.');
  });
});

describe('FileUserFolderRepository.delete', () => {
  it('cascade-deletes the subtree, contained users, and clears conn.userId references', () => {
    const vault = new FakeVault({
      users: [
        { id: 'u1', name: 'A', username: 'a', authType: 'password', folderId: 'uf1' },
        { id: 'u2', name: 'B', username: 'b', authType: 'password', folderId: 'uf2' },
        { id: 'u3', name: 'C', username: 'c', authType: 'password', folderId: null },
      ],
      connections: [
        { id: 'c1', name: 'S1', host: 'h', port: 22, userId: 'u1' },
        { id: 'c2', name: 'S2', host: 'h', port: 22, userId: 'u2' },
        { id: 'c3', name: 'S3', host: 'h', port: 22, userId: 'u3' },
      ],
      connectionFolders: [],
      userFolders: [
        { id: 'uf1', name: 'Team', parentId: null },
        { id: 'uf2', name: 'Sub', parentId: 'uf1' },
      ],
      version: 3,
    });
    const repo = new FileUserFolderRepository(vault as unknown as CryptoVault);

    repo.delete('uf1');

    expect(vault.getData().userFolders).toEqual([]);
    expect(vault.getData().users.map(u => u.id)).toEqual(['u3']);
    expect(vault.getData().connections.find(c => c.id === 'c1').userId).toBeNull();
    expect(vault.getData().connections.find(c => c.id === 'c2').userId).toBeNull();
    expect(vault.getData().connections.find(c => c.id === 'c3').userId).toBe('u3');
  });

  it('throws when the folder does not exist', () => {
    const vault = new FakeVault();
    const repo = new FileUserFolderRepository(vault as unknown as CryptoVault);
    expect(() => repo.delete('missing')).toThrow('Folder not found.');
  });
});

describe('FileConnectionFolderRepository.duplicate', () => {
  it('deep-copies the subtree and connections, remapping folders and internal jump-host refs', () => {
    const vault = new FakeVault({
      users: [],
      connections: [
        { id: 'c1', name: 'A', host: 'a', port: 22, folderId: 'g1', jumpHost: { type: 'reference', connectionId: 'c2' } },
        { id: 'c2', name: 'B', host: 'b', port: 22, folderId: 'g2' },
        { id: 'c3', name: 'C', host: 'c', port: 22, folderId: 'g9', jumpHost: { type: 'reference', connectionId: 'c1' } },
      ],
      connectionFolders: [
        { id: 'g1', name: 'Root', parentId: null },
        { id: 'g2', name: 'Child', parentId: 'g1' },
        { id: 'g9', name: 'Other', parentId: null },
      ],
      userFolders: [],
      version: 3,
    });
    const repo = new FileConnectionFolderRepository(vault as unknown as CryptoVault);

    const copy = repo.duplicate('g1');
    const data = vault.getData();

    // The copy is a sibling of the source, renamed, with fresh ids
    expect(copy).toEqual({ id: 'g10', name: 'Root (copy)', parentId: null });
    expect(data.connectionFolders.map(f => f.id)).toEqual(['g1', 'g2', 'g9', 'g10', 'g11']);

    // Connections inside the subtree are copied into the copied folders
    expect(data.connections.map(c => c.id)).toEqual(['c1', 'c2', 'c3', 'c4', 'c5']);
    expect(data.connections.find(c => c.id === 'c4').folderId).toBe('g10');
    expect(data.connections.find(c => c.id === 'c5').folderId).toBe('g11');

    // An internal jump-host reference is rewritten to the copied connection…
    expect(data.connections.find(c => c.id === 'c4').jumpHost).toEqual({ type: 'reference', connectionId: 'c5' });
    // …while a reference from outside the subtree is left alone
    expect(data.connections.find(c => c.id === 'c3').jumpHost).toEqual({ type: 'reference', connectionId: 'c1' });

    // Denormalized connectionIds track the copies
    expect(data.connectionFolders.find(f => f.id === 'g10').connectionIds).toEqual(['c4']);
    expect(data.connectionFolders.find(f => f.id === 'g11').connectionIds).toEqual(['c5']);
  });

  it('throws when the folder does not exist', () => {
    const vault = new FakeVault();
    const repo = new FileConnectionFolderRepository(vault as unknown as CryptoVault);
    expect(() => repo.duplicate('missing')).toThrow('Folder not found.');
  });
});

describe('FileUserFolderRepository.duplicate', () => {
  it('deep-copies the subtree and users without re-pointing connections', () => {
    const vault = new FakeVault({
      users: [
        { id: 'u1', name: 'A', username: 'a', authType: 'password', password: 'pw', folderId: 'uf1' },
        { id: 'u2', name: 'B', username: 'b', authType: 'password', folderId: 'uf2' },
        { id: 'u3', name: 'C', username: 'c', authType: 'password', folderId: null },
        { id: 'u4', name: 'D', username: 'd', authType: 'password', folderId: 'uf9' },
      ],
      connections: [{ id: 'c1', name: 'S', host: 'h', port: 22, userId: 'u1' }],
      connectionFolders: [],
      userFolders: [
        { id: 'uf1', name: 'Team', parentId: null },
        { id: 'uf2', name: 'Sub', parentId: 'uf1' },
        { id: 'uf9', name: 'Other', parentId: null },
      ],
      version: 3,
    });
    const repo = new FileUserFolderRepository(vault as unknown as CryptoVault);

    const copy = repo.duplicate('uf1');
    const data = vault.getData();

    expect(copy).toEqual({ id: 'uf10', name: 'Team (copy)', parentId: null });
    expect(data.userFolders.map(f => f.id)).toEqual(['uf1', 'uf2', 'uf9', 'uf10', 'uf11']);

    // Users in the subtree are copied (credentials included) into copied folders
    expect(data.users.map(u => u.id)).toEqual(['u1', 'u2', 'u3', 'u4', 'u5', 'u6']);
    expect(data.users.find(u => u.id === 'u5').folderId).toBe('uf10');
    expect(data.users.find(u => u.id === 'u5').password).toBe('pw');
    expect(data.users.find(u => u.id === 'u6').folderId).toBe('uf11');

    // Existing connections keep pointing at the original user
    expect(data.connections[0].userId).toBe('u1');
  });

  it('throws when the folder does not exist', () => {
    const vault = new FakeVault();
    const repo = new FileUserFolderRepository(vault as unknown as CryptoVault);
    expect(() => repo.duplicate('missing')).toThrow('Folder not found.');
  });
});

describe('FileUserRepository.duplicate', () => {
  it('copies credentials under a new id with a " (copy)" name', () => {
    const vault = new FakeVault({
      users: [{
        id: 'u1', name: 'A', username: 'a', authType: 'keyfile',
        password: 'pw', keyFilePath: '/k', keyPassword: 'kp', folderId: 'uf1',
      }],
      connections: [],
      connectionFolders: [],
      userFolders: [],
      version: 3,
    });
    const repo = new FileUserRepository(vault as unknown as CryptoVault);

    const copy = repo.duplicate('u1');

    expect(copy.id).toBe('u2');
    expect(copy.name).toBe('A (copy)');
    expect(copy.username).toBe('a');
    expect(copy.password).toBe('pw');
    expect(copy.keyFilePath).toBe('/k');
    expect(copy.keyPassword).toBe('kp');
    expect(copy.folderId).toBe('uf1');
  });

  it('throws when the user does not exist', () => {
    const vault = new FakeVault();
    const repo = new FileUserRepository(vault as unknown as CryptoVault);
    expect(() => repo.duplicate('missing')).toThrow('User not found.');
  });
});
