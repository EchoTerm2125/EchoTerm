// Unit tests for FileConnectionRepository jump-chain resolution
import { FileConnectionRepository } from '../../src/main/infrastructure/file-connection-repository';
import type { CryptoVault } from '../../src/main/infrastructure/crypto-vault';
import type { SshData } from '../../src/main/infrastructure/ssh-data';
import { defaultData } from '../../src/main/infrastructure/ssh-data';

// Minimal in-memory vault implementing only the surface the repo uses
class FakeVault {
  constructor(private data: SshData = defaultData()) {}
  getData() { return this.data; }
  ensureData() { return this.data; }
  persist() { /* no-op */ }
}

function makeRepo(data: SshData): FileConnectionRepository {
  return new FileConnectionRepository(new FakeVault(data) as unknown as CryptoVault);
}

function data(partial: Partial<SshData>): SshData {
  return {
    users: [], connections: [], connectionFolders: [], userFolders: [], version: 3,
    ...partial,
  };
}

describe('FileConnectionRepository.findResolvedById — jump chain', () => {
  it('resolves a direct connection to an empty chain', () => {
    const repo = makeRepo(data({
      connections: [{ id: 'c1', name: 'A', host: 'a.example', port: 22 }],
    }));
    const resolved = repo.findResolvedById('c1');
    expect(resolved.resolvedJumpChain).toEqual([]);
    expect(resolved.jumpChainError).toBeUndefined();
  });

  it('resolves a manual jump host as a single-hop chain', () => {
    const repo = makeRepo(data({
      connections: [{
        id: 'c1', name: 'A', host: 'a.example', port: 22,
        jumpHost: { type: 'manual', host: 'bastion', username: 'jump', port: 2222, authType: 'password', keyFilePath: null },
      }],
    }));
    const resolved = repo.findResolvedById('c1');
    expect(resolved.resolvedJumpChain).toEqual([
      { host: 'bastion', username: 'jump', port: 2222, authType: 'password', keyFilePath: null },
    ]);
    expect(resolved.jumpChainError).toBeUndefined();
  });

  it('resolves a reference hop with the referenced connection’s user auth', () => {
    const repo = makeRepo(data({
      users: [{ id: 'u1', name: 'JumpUser', username: 'jump', authType: 'keyfile', keyFilePath: 'C:\\keys\\j.key' }],
      connections: [
        { id: 'c1', name: 'A', host: 'a.example', port: 22, jumpHost: { type: 'reference', connectionId: 'c2' } },
        { id: 'c2', name: 'Bastion', host: 'b.example', port: 2201, userId: 'u1' },
      ],
    }));
    const resolved = repo.findResolvedById('c1');
    expect(resolved.resolvedJumpChain).toEqual([
      { host: 'b.example', username: 'jump', port: 2201, authType: 'keyfile', keyFilePath: 'C:\\keys\\j.key' },
    ]);
    expect(resolved.jumpChainError).toBeUndefined();
  });

  it('walks a multi-hop chain: reference to a connection that has its own jump', () => {
    const repo = makeRepo(data({
      users: [
        { id: 'u1', name: 'B', username: 'bastion-user', authType: 'password' },
        { id: 'u2', name: 'C', username: 'outer-user', authType: 'password' },
      ],
      connections: [
        { id: 'c1', name: 'Target', host: 'target.example', port: 22, jumpHost: { type: 'reference', connectionId: 'c2' } },
        { id: 'c2', name: 'Inner', host: 'inner.example', port: 22, userId: 'u1', jumpHost: { type: 'reference', connectionId: 'c3' } },
        { id: 'c3', name: 'Outer', host: 'outer.example', port: 22, userId: 'u2' },
      ],
    }));
    const resolved = repo.findResolvedById('c1');
    expect(resolved.resolvedJumpChain.map(h => h.host)).toEqual(['inner.example', 'outer.example']);
    expect(resolved.resolvedJumpChain[1].username).toBe('outer-user');
    expect(resolved.jumpChainError).toBeUndefined();
  });

  it('stops a reference loop with jumpChainError "cycle"', () => {
    const repo = makeRepo(data({
      connections: [
        { id: 'c1', name: 'A', host: 'a.example', port: 22, jumpHost: { type: 'reference', connectionId: 'c2' } },
        { id: 'c2', name: 'B', host: 'b.example', port: 22, jumpHost: { type: 'reference', connectionId: 'c1' } },
      ],
    }));
    const resolved = repo.findResolvedById('c1');
    expect(resolved.jumpChainError).toBe('cycle');
    expect(resolved.resolvedJumpChain.map(h => h.host)).toEqual(['b.example']);
  });

  it('flags a self-reference as "cycle"', () => {
    const repo = makeRepo(data({
      connections: [
        { id: 'c1', name: 'A', host: 'a.example', port: 22, jumpHost: { type: 'reference', connectionId: 'c1' } },
      ],
    }));
    expect(repo.findResolvedById('c1').jumpChainError).toBe('cycle');
  });

  it('flags a reference to a missing connection as "dangling"', () => {
    const repo = makeRepo(data({
      connections: [
        { id: 'c1', name: 'A', host: 'a.example', port: 22, jumpHost: { type: 'reference', connectionId: 'gone' } },
      ],
    }));
    expect(repo.findResolvedById('c1').jumpChainError).toBe('dangling');
  });

  it('flags a chain broken midway as "dangling"', () => {
    const repo = makeRepo(data({
      connections: [
        { id: 'c1', name: 'A', host: 'a.example', port: 22, jumpHost: { type: 'reference', connectionId: 'c2' } },
        { id: 'c2', name: 'B', host: 'b.example', port: 22, jumpHost: { type: 'reference', connectionId: 'gone' } },
      ],
    }));
    const resolved = repo.findResolvedById('c1');
    expect(resolved.jumpChainError).toBe('dangling');
    expect(resolved.resolvedJumpChain.map(h => h.host)).toEqual(['b.example']);
  });
});
