// Unit tests for folder repository cascade-delete semantics
import { FileConnectionFolderRepository } from '../../src/main/infrastructure/file-connection-folder-repository';
import { FileUserFolderRepository } from '../../src/main/infrastructure/file-user-folder-repository';
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
