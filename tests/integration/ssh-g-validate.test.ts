// Integration test: validate a rendered per-session config with the real ssh
// binary (`ssh -G`). Skipped silently when no ssh.exe is on PATH.
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { buildSshArgs } from '../../src/domain/services/ssh-args';
import { renderSessionSshConfig } from '../../src/domain/services/ssh-config';
import type { ResolvedConnection } from '../../src/domain/entities/ssh';

function sshAvailable(): boolean {
  try {
    execFileSync('ssh', ['-V'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const ALIAS = 'echoterm-session-99';

describe.skipIf(!sshAvailable())('ssh -G against a generated session config', () => {
  let dir: string;
  let keyFile: string;
  let configPath: string;

  const target: ResolvedConnection = {
    id: 'c1', name: 'cards-prod-1', host: 'cards.internal', port: 2202,
    username: 'alice', authType: 'keyfile', password: null,
    keyFilePath: '', keyPassword: null,
    resolvedJumpChain: [{
      host: 'bastion.internal', username: 'jump', port: 2201,
      authType: 'password', keyFilePath: null,
    }],
    hostKeyAlgorithms: '+ssh-rsa', kexAlgorithms: null, pubkeyAcceptedAlgorithms: null,
    ciphers: null, macs: null, caSignatureAlgorithms: null, compression: null,
  };

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'echoterm-gtest-'));
    keyFile = path.join(dir, 'id_test');
    fs.writeFileSync(keyFile, 'dummy');
    configPath = path.join(dir, `${ALIAS}.conf`);
    const text = renderSessionSshConfig(
      { ...target, keyFilePath: keyFile }, ALIAS, null,
    );
    fs.writeFileSync(configPath, text);
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  function sshG(alias: string): string {
    return execFileSync('ssh', ['-G', ...buildSshArgs(configPath, alias)], { encoding: 'utf8' });
  }

  it('resolves the target host from the session config', () => {
    const out = sshG(ALIAS);
    expect(out).toMatch(/^hostname cards\.internal$/m);
    expect(out).toMatch(/^port 2202$/m);
    expect(out).toMatch(/^user alice$/m);
    expect(out.toLowerCase()).toContain(`identityfile ${keyFile.toLowerCase()}`);
    expect(out).toMatch(/^hostkeyalgorithms .*ssh-rsa/m);
  });

  it('resolves the jump host block chained via ProxyJump', () => {
    const out = sshG(`${ALIAS}-jump`);
    expect(out).toMatch(/^hostname bastion\.internal$/m);
    expect(out).toMatch(/^port 2201$/m);
    expect(out).toMatch(/^user jump$/m);
  });
});
