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
      { ...target, keyFilePath: keyFile }, null,
    );
    fs.writeFileSync(configPath, text);
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  function sshG(target: string): string {
    return execFileSync('ssh', ['-G', ...buildSshArgs(configPath, target)], { encoding: 'utf8' });
  }

  it('resolves the target host from the session config', () => {
    const out = sshG('cards.internal');
    expect(out).toMatch(/^hostname cards\.internal$/m);
    expect(out).toMatch(/^port 2202$/m);
    expect(out).toMatch(/^user alice$/m);
    expect(out.toLowerCase()).toContain(`identityfile ${keyFile.toLowerCase()}`);
    expect(out).toMatch(/^hostkeyalgorithms .*ssh-rsa/m);
  });

  it('resolves the jump host block reached via its real host name in ProxyJump', () => {
    const out = sshG('bastion.internal');
    expect(out).toMatch(/^hostname bastion\.internal$/m);
    expect(out).toMatch(/^port 2201$/m);
    expect(out).toMatch(/^user jump$/m);
  });

  it('resolves a keyfile jump host verbatim (the shape that broke with a quoted ProxyCommand)', () => {
    const jumpKey = path.join(dir, 'jump_id');
    fs.writeFileSync(jumpKey, 'dummy');
    const cfgPath = path.join(dir, `${ALIAS}-keyjump.conf`);
    fs.writeFileSync(cfgPath, renderSessionSshConfig({
      ...target,
      keyFilePath: keyFile,
      resolvedJumpChain: [{
        host: 'bastion.internal', username: 'jump', port: 2201,
        authType: 'keyfile', keyFilePath: jumpKey,
      }],
    }, null));

    // The hop's key path must come through verbatim — no quoting artefacts
    const jumpOut = execFileSync('ssh', ['-G', ...buildSshArgs(cfgPath, 'bastion.internal')], { encoding: 'utf8' });
    expect(jumpOut.toLowerCase()).toContain(`identityfile ${jumpKey.toLowerCase()}`);

    const targetOut = execFileSync('ssh', ['-G', ...buildSshArgs(cfgPath, 'cards.internal')], { encoding: 'utf8' });
    expect(targetOut).toMatch(/^proxyjump jump@bastion\.internal:2201$/m);
  });

  it('resolves via the real host names so the user config keeps matching', () => {
    const userConfig = path.join(dir, 'user-config');
    fs.writeFileSync(userConfig, [
      'ServerAliveInterval 43',
      'Host cards.internal',
      '  SendEnv FOO',
      'Host *',
      '  Compression yes',
    ].join('\n') + '\n');
    const cfgPath = path.join(dir, `${ALIAS}-user.conf`);
    fs.writeFileSync(cfgPath, renderSessionSshConfig(
      { ...target, keyFilePath: keyFile }, userConfig,
    ));

    const targetOut = execFileSync('ssh', ['-G', ...buildSshArgs(cfgPath, 'cards.internal')], { encoding: 'utf8' });
    expect(targetOut).toMatch(/^serveraliveinterval 43$/m); // bare user global, via the Host * reset
    expect(targetOut).toMatch(/^sendenv FOO$/m);            // user's host-specific block
    expect(targetOut).toMatch(/^compression yes$/m);
    // EchoTerm's explicit values still win over the user config
    expect(targetOut).toMatch(/^port 2202$/m);

    const hopOut = execFileSync('ssh', ['-G', ...buildSshArgs(cfgPath, 'bastion.internal')], { encoding: 'utf8' });
    expect(hopOut).toMatch(/^serveraliveinterval 43$/m);
    expect(hopOut).toMatch(/^port 2201$/m); // hop block still wins for its own port
  });

  it('lets the user config remap HostName for a stored alias', () => {
    const userConfig = path.join(dir, 'alias-config');
    fs.writeFileSync(userConfig, 'Host cards.internal\n  HostName real.cards.example\n');
    const cfgPath = path.join(dir, `${ALIAS}-alias.conf`);
    fs.writeFileSync(cfgPath, renderSessionSshConfig(
      { ...target, host: 'cards.internal', keyFilePath: keyFile }, userConfig,
    ));

    const out = execFileSync('ssh', ['-G', ...buildSshArgs(cfgPath, 'cards.internal')], { encoding: 'utf8' });
    expect(out).toMatch(/^hostname real\.cards\.example$/m);
    expect(out).toMatch(/^port 2202$/m); // our other explicit values still win
  });
});
