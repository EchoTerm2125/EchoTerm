/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Infrastructure adapter: SSH user persistence
   Implements the domain UserRepository port on the vault's JSON payload.
   ═══════════════════════════════════════════════════════════════════════════ */

import type { User } from '../../domain/entities/ssh';
import type { UserRepository } from '../../domain/ports/user-repository';
import type { CryptoVault } from './crypto-vault';
import { nextId } from './ssh-data';
import type { StoredUser } from './ssh-data';

export class FileUserRepository implements UserRepository {
  constructor(private readonly vault: CryptoVault) {}

  list(): User[] {
    const data = this.vault.getData();
    if (!data) return [];
    return data.users.map(u => this.toEntity(u));
  }

  findById(id: string): User | null {
    const data = this.vault.getData();
    if (!data) return null;
    const stored = data.users.find(u => u.id === id);
    return stored ? this.toEntity(stored) : null;
  }

  save(user: User): User {
    const data = this.vault.ensureData();
    const users = data.users;

    if (user.id) {
      const idx = users.findIndex(u => u.id === user.id);
      if (idx === -1) throw new Error('User not found.');
      // Merge: keep existing password if not provided in update
      const merged = { ...users[idx], ...user, id: users[idx].id };
      if (user.password === undefined || user.password === null) {
        merged.password = users[idx].password;
      }
      if (user.keyPassword === undefined || user.keyPassword === null) {
        merged.keyPassword = users[idx].keyPassword;
      }
      users[idx] = merged;
      this.vault.persist();
      return this.toEntity(merged);
    }

    const stored: StoredUser = {
      id: nextId('u', users),
      name: user.name || '',
      username: user.username || '',
      authType: user.authType || 'password',
      password: user.password || '',
      keyFilePath: user.keyFilePath || null,
      keyPassword: user.keyPassword || null,
    };
    users.push(stored);
    this.vault.persist();
    return this.toEntity(stored);
  }

  delete(id: string): void {
    const data = this.vault.getData();
    if (!data) throw new Error('No data loaded.');
    const idx = data.users.findIndex(u => u.id === id);
    if (idx === -1) throw new Error('User not found.');
    data.users.splice(idx, 1);
    // Remove user reference from any connections using it
    for (const conn of data.connections) {
      if (conn.userId === id) conn.userId = null;
    }
    this.vault.persist();
  }

  private toEntity(stored: StoredUser): User {
    return {
      id: stored.id,
      name: stored.name,
      username: stored.username,
      authType: stored.authType,
      password: stored.password ?? null,
      keyFilePath: stored.keyFilePath || null,
      keyPassword: stored.keyPassword ?? null,
    };
  }
}
