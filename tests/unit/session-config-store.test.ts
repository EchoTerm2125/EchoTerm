// Tests for src/main/infrastructure/temp-session-config.ts (real temp directories)
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { TempSessionConfigStore } from '../../src/main/infrastructure/temp-session-config';

let tmpBase: string;
let home: string;
let store: TempSessionConfigStore;

beforeEach(() => {
  tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'echoterm-tmpbase-'));
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'echoterm-home-'));
  store = new TempSessionConfigStore(tmpBase, home);
});

afterEach(() => {
  fs.rmSync(tmpBase, { recursive: true, force: true });
  fs.rmSync(home, { recursive: true, force: true });
});

describe('TempSessionConfigStore', () => {
  it('write() creates a config file inside an echoterm- mkdtemp dir and returns its path', () => {
    const file = store.write('echoterm-session-1', 'Host echoterm-session-1\n');
    expect(fs.existsSync(file)).toBe(true);
    expect(fs.readFileSync(file, 'utf8')).toBe('Host echoterm-session-1\n');
    expect(path.basename(path.dirname(file))).toMatch(/^echoterm-/);
    expect(path.basename(file)).toBe('echoterm-session-1.conf');
    expect(path.dirname(path.dirname(file))).toBe(tmpBase);
  });

  it('write() creates a fresh directory per session', () => {
    const a = store.write('echoterm-session-1', 'a');
    const b = store.write('echoterm-session-2', 'b');
    expect(path.dirname(a)).not.toBe(path.dirname(b));
  });

  if (process.platform !== 'win32') {
    it('write() restricts file permissions to 0600', () => {
      const file = store.write('echoterm-session-1', 'x');
      expect(fs.statSync(file).mode & 0o777).toBe(0o600);
    });
  }

  it('userConfigPath() returns null when the user has no ~/.ssh/config', () => {
    expect(store.userConfigPath()).toBeNull();
  });

  it('userConfigPath() returns the absolute path when ~/.ssh/config exists', () => {
    fs.mkdirSync(path.join(home, '.ssh'), { recursive: true });
    const userConfig = path.join(home, '.ssh', 'config');
    fs.writeFileSync(userConfig, 'Host *\n');
    expect(store.userConfigPath()).toBe(userConfig);
  });

  it('remove() deletes the file and its session directory, tolerating a missing file', () => {
    const file = store.write('echoterm-session-1', 'x');
    store.remove(file);
    expect(fs.existsSync(file)).toBe(false);
    expect(fs.existsSync(path.dirname(file))).toBe(false);
    expect(() => store.remove(file)).not.toThrow();
  });

  it('sweep() removes leftover echoterm- entries but leaves unrelated files', () => {
    store.write('echoterm-session-1', 'leftover');
    const keep = path.join(tmpBase, 'unrelated.txt');
    fs.writeFileSync(keep, 'keep me');

    store.sweep();

    const remaining = fs.readdirSync(tmpBase);
    expect(remaining).toEqual(['unrelated.txt']);
    expect(fs.existsSync(keep)).toBe(true);
  });
});
