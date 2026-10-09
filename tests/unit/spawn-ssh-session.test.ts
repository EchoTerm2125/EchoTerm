// Unit tests for src/application/use-cases/spawn-ssh-session.ts
// Focus: per-session config cleanup across the session's exit paths.
import { SpawnSshSession } from '../../src/application/use-cases/spawn-ssh-session';
import type { SessionEvents } from '../../src/application/session-events';
import type { ConnectionRepository } from '../../src/domain/ports/connection-repository';
import type { PtyGateway, PtyProcessHandle, PtySpawnOptions } from '../../src/domain/ports/pty-gateway';
import type { SessionConfigStore } from '../../src/domain/ports/session-config-store';
import type { ResolvedConnection } from '../../src/domain/entities/ssh';

class FakePty implements PtyGateway {
  spawned: { command: string; args: string[]; options: PtySpawnOptions }[] = [];
  handles: FakeHandle[] = [];
  failNext = false;

  spawn(command: string, args: string[], options: PtySpawnOptions): PtyProcessHandle {
    if (this.failNext) throw new Error('spawn failed');
    this.spawned.push({ command, args, options });
    const handle = new FakeHandle();
    this.handles.push(handle);
    return handle;
  }
}

class FakeHandle implements PtyProcessHandle {
  private exitCb: ((exitCode: number) => void) | null = null;
  written: string[] = [];

  onData(_callback: (data: string) => void): void { /* not under test */ }
  onExit(callback: (exitCode: number) => void): void { this.exitCb = callback; }
  write(data: string): void { this.written.push(data); }
  resize(_cols: number, _rows: number): void { /* not under test */ }
  kill(): void { /* not under test */ }

  exit(): void {
    if (this.exitCb) this.exitCb(0);
  }
}

class FakeConfigStore implements SessionConfigStore {
  written: { alias: string; path: string }[] = [];
  removed: string[] = [];
  private next = 1;

  write(alias: string, _text: string): string {
    // A fresh path per write, like TempSessionConfigStore's mkdtemp
    const file = `/tmp/echoterm-test-${this.next++}/${alias}.conf`;
    this.written.push({ alias, path: file });
    return file;
  }
  remove(path: string): void { this.removed.push(path); }
  userConfigPath(): string | null { return null; }
}

function fakeConnections(target: ResolvedConnection): ConnectionRepository {
  return {
    list: () => [],
    findById: () => null,
    findResolvedById: (id: string) => (id === target.id ? target : null),
    save: (c) => c,
    delete: () => {},
  } as unknown as ConnectionRepository;
}

function makeTarget(overrides: Partial<ResolvedConnection> = {}): ResolvedConnection {
  return {
    id: 'c1', name: 'Test', host: 'example.com', port: 22,
    username: 'alice', authType: 'password', password: 'pw',
    keyFilePath: null, keyPassword: null,
    resolvedJumpChain: [],
    hostKeyAlgorithms: null, kexAlgorithms: null, pubkeyAcceptedAlgorithms: null,
    ciphers: null, macs: null, caSignatureAlgorithms: null, compression: null,
    ...overrides,
  };
}

function makeEvents(): SessionEvents & { exited: number } {
  const events = {
    exited: 0,
    onData: () => {},
    onExit: () => { events.exited++; },
  };
  return events;
}

describe('SpawnSshSession — config cleanup on exit', () => {
  it('removes its config file and reports the exit when the session ends', () => {
    const pty = new FakePty();
    const store = new FakeConfigStore();
    const events = makeEvents();
    const useCase = new SpawnSshSession(fakeConnections(makeTarget()), pty, store);

    const result = useCase.execute('c1', 1, '/home', events);

    expect('error' in result).toBe(false);
    pty.handles[0].exit();

    expect(store.removed).toEqual([store.written[0].path]);
    expect(events.exited).toBe(1);
  });

  it('still removes its own config when superseded, but does not report the exit', () => {
    const pty = new FakePty();
    const store = new FakeConfigStore();
    const events = makeEvents();
    const useCase = new SpawnSshSession(fakeConnections(makeTarget()), pty, store);

    useCase.execute('c1', 1, '/home', events, () => true);
    pty.handles[0].exit();

    // write() mints a fresh path per spawn, so the superseded session's config
    // is its own file — it must not leak, but the pane belongs to the replacement
    expect(store.removed).toEqual([store.written[0].path]);
    expect(events.exited).toBe(0);
  });

  it('removes the config when spawning fails after the file was written', () => {
    const pty = new FakePty();
    const store = new FakeConfigStore();
    const events = makeEvents();
    const useCase = new SpawnSshSession(fakeConnections(makeTarget()), pty, store);

    pty.failNext = true;
    const result = useCase.execute('c1', 1, '/home', events);

    expect('error' in result).toBe(true);
    expect(store.removed).toEqual([store.written[0].path]);
    expect(events.exited).toBe(0);
  });
});
