/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Domain port: pseudo-terminal spawning
   Abstracts node-pty so the domain/application layers never touch it.
   Implemented by an infrastructure adapter (Phase 3).
   ═══════════════════════════════════════════════════════════════════════════ */

export interface PtyProcessHandle {
  onData(callback: (data: string) => void): void;
  onExit(callback: (exitCode: number) => void): void;
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(): void;
}

export interface PtySpawnOptions {
  cols: number;
  rows: number;
  cwd?: string;
}

export interface PtyGateway {
  spawn(command: string, args: string[], options: PtySpawnOptions): PtyProcessHandle;
}
