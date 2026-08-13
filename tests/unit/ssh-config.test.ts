// Unit tests for src/domain/services/ssh-config.ts
import { parseSshConfigText, renderSshConfig } from '../../src/domain/services/ssh-config';
import type { Connection, User } from '../../src/domain/entities/ssh';

const HOME_PREFIX = 'C:\\Users\\me\\';

function makeConnection(overrides: Partial<Connection> = {}): Connection {
  return {
    id: 'c1', name: 'conn', host: 'example.com', port: 22,
    userId: null, folderId: null, jumpHost: null,
    hostKeyAlgorithms: null, kexAlgorithms: null, pubkeyAcceptedAlgorithms: null,
    ...overrides,
  };
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'u1', name: 'User', username: 'deploy', authType: 'password',
    password: null, keyFilePath: null, keyPassword: null,
    ...overrides,
  };
}

describe('parseSshConfigText', () => {
  it('parses a full host block with aliases, port, user, identity file and proxy jump', () => {
    const content = [
      'Host web1 web1.internal',
      '  HostName 10.0.0.1',
      '  Port 2222',
      '  User deploy',
      '  IdentityFile ~/.ssh/id_rsa',
      '  ProxyJump admin@bastion:2200',
    ].join('\n');

    const hosts = parseSshConfigText(content, HOME_PREFIX);
    expect(hosts).toHaveLength(1);
    expect(hosts[0]).toEqual({
      name: 'web1',
      aliases: ['web1', 'web1.internal'],
      host: '10.0.0.1',
      port: 2222,
      user: 'deploy',
      identityFile: 'C:\\Users\\me\\.ssh/id_rsa',
      proxyJump: 'bastion',
      hostKeyAlgorithms: null,
      kexAlgorithms: null,
      pubkeyAcceptedAlgorithms: null,
    });
  });

  it('parses algorithm overrides for legacy hosts', () => {
    const content = [
      'Host legacy',
      '  HostName legacy.example.com',
      '  HostKeyAlgorithms +ssh-rsa,ssh-dss',
      '  KexAlgorithms +diffie-hellman-group1-sha1',
      '  PubkeyAcceptedAlgorithms +ssh-rsa',
    ].join('\n');

    const hosts = parseSshConfigText(content, HOME_PREFIX);
    expect(hosts[0].hostKeyAlgorithms).toBe('+ssh-rsa,ssh-dss');
    expect(hosts[0].kexAlgorithms).toBe('+diffie-hellman-group1-sha1');
    expect(hosts[0].pubkeyAcceptedAlgorithms).toBe('+ssh-rsa');
  });

  it('accepts the legacy PubkeyAcceptedKeyTypes spelling', () => {
    const content = 'Host legacy\n  HostName legacy.example.com\n  PubkeyAcceptedKeyTypes +ssh-rsa\n';
    const hosts = parseSshConfigText(content, HOME_PREFIX);
    expect(hosts[0].pubkeyAcceptedAlgorithms).toBe('+ssh-rsa');
  });

  it('skips comments, blank lines and wildcard-only hosts', () => {
    const content = [
      '# global defaults',
      'Host *',
      '  ServerAliveInterval 60',
      '',
      'Host real',
      '  HostName real.example.com',
    ].join('\n');

    const hosts = parseSshConfigText(content, HOME_PREFIX);
    expect(hosts).toHaveLength(1);
    expect(hosts[0].name).toBe('real');
  });

  it('drops hosts without a HostName', () => {
    const content = 'Host incomplete\n  User nobody\n';
    expect(parseSshConfigText(content, HOME_PREFIX)).toEqual([]);
  });

  it('handles CRLF line endings', () => {
    const content = 'Host crlf\r\n  HostName 192.168.1.5\r\n';
    const hosts = parseSshConfigText(content, HOME_PREFIX);
    expect(hosts).toHaveLength(1);
    expect(hosts[0].host).toBe('192.168.1.5');
  });

  it('defaults port to 22 for missing or invalid values', () => {
    const content = [
      'Host a',
      '  HostName a.example.com',
      'Host b',
      '  HostName b.example.com',
      '  Port notanumber',
    ].join('\n');

    const hosts = parseSshConfigText(content, HOME_PREFIX);
    expect(hosts.map(h => h.port)).toEqual([22, 22]);
  });

  it('keeps absolute IdentityFile paths untouched', () => {
    const content = 'Host k\n  HostName k.example.com\n  IdentityFile C:\\keys\\id_rsa\n';
    const hosts = parseSshConfigText(content, HOME_PREFIX);
    expect(hosts[0].identityFile).toBe('C:\\keys\\id_rsa');
  });

  it('strips user@ and :port from ProxyJump, keeping the alias', () => {
    const content = 'Host p\n  HostName p.example.com\n  ProxyJump jumpuser@jumphost:22\n';
    const hosts = parseSshConfigText(content, HOME_PREFIX);
    expect(hosts[0].proxyJump).toBe('jumphost');
  });
});

describe('renderSshConfig', () => {
  it('renders a connection with a matching keyfile user', () => {
    const text = renderSshConfig(
      [makeConnection({ name: 'web', host: '10.0.0.1', userId: 'u1' })],
      [makeUser({ authType: 'keyfile', keyFilePath: 'C:\\keys\\id_rsa' })],
    );
    expect(text).toBe(
      'Host web\n' +
      '  HostName 10.0.0.1\n' +
      '  User deploy\n' +
      '  IdentityFile C:\\keys\\id_rsa\n' +
      '\n',
    );
  });

  it('omits Port 22 and IdentityFile for password users', () => {
    const text = renderSshConfig(
      [makeConnection({ name: 'db', host: 'db.local', userId: 'u1' })],
      [makeUser({ username: 'root', authType: 'password' })],
    );
    expect(text).toBe('Host db\n  HostName db.local\n  User root\n\n');
  });

  it('includes custom port', () => {
    const text = renderSshConfig(
      [makeConnection({ name: 'alt', host: 'alt.local', port: 2222 })],
      [],
    );
    expect(text).toContain('  Port 2222\n');
  });

  it('renders manual jump host with default port 22', () => {
    const text = renderSshConfig(
      [makeConnection({
        name: 'via', host: 'via.local',
        jumpHost: { type: 'manual', host: 'bastion.local', username: 'jump', port: 22, authType: null, keyFilePath: null },
      })],
      [],
    );
    expect(text).toContain('  ProxyJump jump@bastion.local:22\n');
  });

  it('renders reference jump host by the referenced connection name', () => {
    const text = renderSshConfig(
      [
        makeConnection({ name: 'bastion', host: 'b.local' }),
        makeConnection({ id: 'c2', name: 'internal', host: 'i.local', jumpHost: { type: 'reference', connectionId: 'c1' } }),
      ],
      [],
    );
    expect(text).toContain('Host internal\n  HostName i.local\n  ProxyJump bastion\n');
  });

  it('returns empty string for no connections', () => {
    expect(renderSshConfig([], [])).toBe('');
  });

  it('renders algorithm overrides when configured', () => {
    const text = renderSshConfig(
      [makeConnection({
        name: 'legacy', host: 'legacy.local',
        hostKeyAlgorithms: '+ssh-rsa,ssh-dss',
        kexAlgorithms: '+diffie-hellman-group1-sha1',
        pubkeyAcceptedAlgorithms: '+ssh-rsa',
      })],
      [],
    );
    expect(text).toBe(
      'Host legacy\n' +
      '  HostName legacy.local\n' +
      '  HostKeyAlgorithms +ssh-rsa,ssh-dss\n' +
      '  KexAlgorithms +diffie-hellman-group1-sha1\n' +
      '  PubkeyAcceptedAlgorithms +ssh-rsa\n' +
      '\n',
    );
  });
});
