/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Infrastructure adapter: node-pty process gateway
   Implements the domain PtyGateway port.
   ═══════════════════════════════════════════════════════════════════════════ */

import type { PtyGateway, PtyProcessHandle, PtySpawnOptions } from '../../domain/ports/pty-gateway';

import * as pty from 'node-pty';

export class NodePtyGateway implements PtyGateway {
  spawn(command: string, args: string[], options: PtySpawnOptions): PtyProcessHandle {
    const ptyProcess = pty.spawn(command, args, {
      name: 'xterm-color',
      cols: options.cols,
      rows: options.rows,
      cwd: options.cwd,
      env: process.env,
      useConpty: true,
    });

    return {
      onData: (callback) => ptyProcess.onData(callback),
      onExit: (callback) => ptyProcess.onExit(({ exitCode }) => callback(exitCode)),
      write: (data) => ptyProcess.write(data),
      resize: (cols, rows) => ptyProcess.resize(cols, rows),
      kill: () => ptyProcess.kill(),
    };
  }
}
