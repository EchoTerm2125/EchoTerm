// Unit tests for src/domain/services/ssh-args.ts
import { buildSshArgs } from '../../src/domain/services/ssh-args';
import type { ResolvedConnection } from '../../src/domain/entities/ssh';

function makeTarget(overrides: Partial<ResolvedConnection> = {}): ResolvedConnection {
  return {
    id: 'c1',
    name: 'Test',
    host: 'example.com',
    port: 22,
    username: 'alice',
    authType: 'password',
    password: null,
    keyFilePath: null,
    keyPassword: null,
    resolvedJumpHost: null,
    hostKeyAlgorithms: null,
    kexAlgorithms: null,
    pubkeyAcceptedAlgorithms: null,
    ...overrides,
  };
}

describe('buildSshArgs', () => {
  it('basic connection, default port, password auth', () => {
    const args = buildSshArgs(makeTarget());
    expect(args).toEqual(['alice@example.com']);
  });

  it('custom port and keyfile auth add -p and -i', () => {
    const args = buildSshArgs(makeTarget({
      port: 2222,
      authType: 'keyfile',
      keyFilePath: 'C:\\keys\\id_rsa',
    }));
    expect(args).toEqual(['-p', '2222', '-i', 'C:\\keys\\id_rsa', 'alice@example.com']);
  });

  it('password jump host uses -J ProxyJump', () => {
    const args = buildSshArgs(makeTarget({
      resolvedJumpHost: { host: 'bastion', username: 'bob', port: 22, authType: 'password', keyFilePath: null },
    }));
    expect(args).toEqual(['-J', 'bob@bastion', 'alice@example.com']);
  });

  it('jump host with custom port appends port to -J', () => {
    const args = buildSshArgs(makeTarget({
      resolvedJumpHost: { host: 'bastion', username: 'bob', port: 2200, authType: 'password', keyFilePath: null },
    }));
    expect(args).toEqual(['-J', 'bob@bastion:2200', 'alice@example.com']);
  });

  it('keyfile jump host uses ProxyCommand', () => {
    const args = buildSshArgs(makeTarget({
      resolvedJumpHost: {
        host: 'bastion', username: 'bob', port: 22,
        authType: 'keyfile', keyFilePath: 'C:\\keys\\jh_rsa',
      },
    }));
    expect(args).toEqual([
      '-o', "ProxyCommand=ssh -i 'C:\\keys\\jh_rsa' -W %h:%p 'bob@bastion'",
      'alice@example.com',
    ]);
  });

  it('keyfile jump host with custom port appends port in ProxyCommand', () => {
    const args = buildSshArgs(makeTarget({
      port: 2022,
      resolvedJumpHost: {
        host: 'bastion', username: 'bob', port: 2200,
        authType: 'keyfile', keyFilePath: 'C:\\keys\\jh_rsa',
      },
    }));
    expect(args).toEqual([
      '-o', "ProxyCommand=ssh -i 'C:\\keys\\jh_rsa' -W %h:%p 'bob@bastion:2200'",
      '-p', '2022',
      'alice@example.com',
    ]);
  });

  it('escapes shell metacharacters in keyfile jump host ProxyCommand', () => {
    const args = buildSshArgs(makeTarget({
      resolvedJumpHost: {
        host: 'bastion', username: 'bob', port: 22,
        authType: 'keyfile', keyFilePath: 'id_rsa; rm -rf /',
      },
    }));
    expect(args).toEqual([
      '-o', "ProxyCommand=ssh -i 'id_rsa; rm -rf /' -W %h:%p 'bob@bastion'",
      'alice@example.com',
    ]);
  });

  it('no jump host field at all', () => {
    const args = buildSshArgs(makeTarget({ host: 'db.internal', username: 'root' }));
    expect(args).toEqual(['root@db.internal']);
  });

  it('algorithm overrides add -o options for legacy servers', () => {
    const args = buildSshArgs(makeTarget({
      hostKeyAlgorithms: '+ssh-rsa,ssh-dss',
      kexAlgorithms: '+diffie-hellman-group1-sha1',
      pubkeyAcceptedAlgorithms: '+ssh-rsa',
    }));
    expect(args).toEqual([
      '-o', 'HostKeyAlgorithms=+ssh-rsa,ssh-dss',
      '-o', 'KexAlgorithms=+diffie-hellman-group1-sha1',
      '-o', 'PubkeyAcceptedAlgorithms=+ssh-rsa',
      'alice@example.com',
    ]);
  });

  it('algorithm overrides combine with port and keyfile options', () => {
    const args = buildSshArgs(makeTarget({
      port: 2222,
      authType: 'keyfile',
      keyFilePath: 'C:\\keys\\id_rsa',
      hostKeyAlgorithms: '+ssh-rsa',
    }));
    expect(args).toEqual([
      '-o', 'HostKeyAlgorithms=+ssh-rsa',
      '-p', '2222',
      '-i', 'C:\\keys\\id_rsa',
      'alice@example.com',
    ]);
  });
});
