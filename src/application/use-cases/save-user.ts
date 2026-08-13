/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Use case: create or update an SSH user
   ═══════════════════════════════════════════════════════════════════════════ */

import type { User } from '../../domain/entities/ssh';
import type { UserRepository } from '../../domain/ports/user-repository';

export class SaveUser {
  constructor(private readonly users: UserRepository) {}

  /** Throws when updating a user that does not exist. */
  execute(user: User): User {
    return this.users.save(user);
  }
}
