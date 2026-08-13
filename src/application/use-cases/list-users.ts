/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Use case: list SSH users
   ═══════════════════════════════════════════════════════════════════════════ */

import type { User } from '../../domain/entities/ssh';
import type { UserRepository } from '../../domain/ports/user-repository';

export class ListUsers {
  constructor(private readonly users: UserRepository) {}

  execute(): User[] {
    return this.users.list();
  }
}
