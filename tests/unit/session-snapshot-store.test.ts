// Tests for src/main/infrastructure/file-session-snapshot.ts (real files)
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { FileSessionSnapshotStore } from '../../src/main/infrastructure/file-session-snapshot';
import type { SessionSnapshot } from '../../shared/ipc';

let dir: string;
let filePath: string;
let store: FileSessionSnapshotStore;

const SNAPSHOT: SessionSnapshot = {
  version: 1,
  activeGroup: 1,
  groups: [
    { name: 'Work', activePane: 0, echoActive: false, panes: [{ shell: 'powershell', echo: true }] },
    {
      name: 'Servers',
      activePane: 1,
      echoActive: true,
      panes: [
        { shell: 'ssh', connectionId: 'c1', echo: true },
        { shell: 'ssh', connectionId: 'c2', customName: 'db', echo: false },
      ],
    },
  ],
};

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'echoterm-session-'));
  filePath = path.join(dir, 'session.json');
  store = new FileSessionSnapshotStore(filePath);
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('FileSessionSnapshotStore', () => {
  it('reports no snapshot on a first launch', () => {
    expect(store.load()).toEqual({ snapshot: null });
  });

  it('round-trips a snapshot', () => {
    store.save(SNAPSHOT);
    expect(store.load()).toEqual({ snapshot: SNAPSHOT });
  });

  it('creates the parent directory when it does not exist yet', () => {
    const nested = path.join(dir, 'a', 'b', 'session.json');
    new FileSessionSnapshotStore(nested).save(SNAPSHOT);
    expect(fs.existsSync(nested)).toBe(true);
  });

  it('replaces an existing snapshot without leaving a temp file behind', () => {
    store.save(SNAPSHOT);
    store.save({ ...SNAPSHOT, activeGroup: 0 });
    expect(store.load().snapshot?.activeGroup).toBe(0);
    expect(fs.existsSync(`${filePath}.tmp`)).toBe(false);
  });

  it('deletes a file it cannot parse and reports it corrupt', () => {
    fs.writeFileSync(filePath, '{ not json', 'utf-8');
    expect(store.load()).toEqual({ snapshot: null, corrupt: true });
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it('treats an unknown version as corrupt', () => {
    fs.writeFileSync(filePath, JSON.stringify({ version: 99, groups: [] }), 'utf-8');
    expect(store.load()).toEqual({ snapshot: null, corrupt: true });
  });

  it('clear() removes the snapshot', () => {
    store.save(SNAPSHOT);
    store.clear();
    expect(store.load()).toEqual({ snapshot: null });
  });
});
