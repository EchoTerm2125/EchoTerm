/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Use case: duplicate an SSH user
   ═══════════════════════════════════════════════════════════════════════════ */

import type { User } from '../../domain/entities/ssh';
import type { UserRepository } from '../../domain/ports/user-repository';

export class DuplicateUser {
  constructor(private readonly users: UserRepository) {}

  /** Throws when the user does not exist. */
  execute(id: string): User {
    return this.users.duplicate(id);
  }
}
