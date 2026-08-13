/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Active terminal/SSH session registry (main-process state)
   ═══════════════════════════════════════════════════════════════════════════ */

import type { PtyProcessHandle } from '../../domain/ports/pty-gateway';
import type { SessionEvents } from '../../application/session-events';

export type SendToRenderer = (channel: string, ...args: unknown[]) => void;

export interface Session {
  handle: PtyProcessHandle;
  shell: string;
}

export class SessionRegistry {
  private readonly sessions = new Map<number, Session>();
  private nextId = 1;

  createId(): number {
    return this.nextId++;
  }

  register(id: number, session: Session): void {
    this.sessions.set(id, session);
  }

  get(id: number): Session | undefined {
    return this.sessions.get(id);
  }

  remove(id: number): void {
    this.sessions.delete(id);
  }

  killAll(): void {
    for (const [, session] of this.sessions) {
      session.handle.kill();
    }
    this.sessions.clear();
  }
}

/** Per-session event wiring: forward output to the renderer, drop the session on exit. */
export function sessionEvents(registry: SessionRegistry, id: number, send: SendToRenderer): SessionEvents {
  return {
    onData: (data) => send('terminal:data', id, data),
    onExit: () => {
      registry.remove(id);
      send('terminal:exit', id);
    },
  };
}
