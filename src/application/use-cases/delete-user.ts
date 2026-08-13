/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Use case: delete an SSH user
   ═══════════════════════════════════════════════════════════════════════════ */

import type { UserRepository } from '../../domain/ports/user-repository';

export class DeleteUser {
  constructor(private readonly users: UserRepository) {}

  /** Throws when the user does not exist. */
  execute(id: string): void {
    this.users.delete(id);
  }
}
