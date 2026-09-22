// Unit tests for src/domain/services/winscp.ts
import {
  decodeWinScpPassword,
  decodeWinScpValue,
  mapWinScpSessions,
  parseWinScpIni,
  parseWinScpRegistryOutput,
} from '../../src/domain/services/winscp';
import type { WinScpRawSession } from '../../src/domain/services/winscp';

/** WinSCP's obfuscation, written out to build the vectors read back below. */
function encodeWinScpPassword(plain: string, username: string, hostname: string): string {
  const payload = new TextEncoder().encode(username + hostname + plain);
  const out: number[] = [];
  const se = (byte: number) => out.push((~byte ^ 0xa3) & 0xff);
  se(0xff);
  se(0x00); // version: simple, 8-bit length
  se(payload.length);
  se(0); // no random padding
  for (const byte of payload) se(byte);
  return out.map(byte => byte.toString(16).padStart(2, '0').toUpperCase()).join('');
}

function session(name: string, values: Record<string, string>): WinScpRawSession {
  return { name, values };
}

describe('decodeWinScpValue', () => {
  it('decodes the escapes WinSCP applies to key names and string values', () => {
    expect(decodeWinScpValue('Default%20Settings')).toBe('Default Settings');
    expect(decodeWinScpValue('C:%5CUsers%5Cme%5C.ssh%5Cid_ed25519')).toBe('C:\\Users\\me\\.ssh\\id_ed25519');
  });

  it('leaves characters WinSCP does not escape untouched', () => {
    expect(decodeWinScpValue('admin@example.com:2222')).toBe('admin@example.com:2222');
  });

  it('strips the UTF-8 BOM WinSCP prepends to non-ASCII text', () => {
    // "日本語" escaped as UTF-8 bytes behind a BOM
    expect(decodeWinScpValue('%EF%BB%BF%E6%97%A5%E6%9C%AC%E8%AA%9E')).toBe('日本語');
  });
});

describe('decodeWinScpPassword', () => {
  const user = 'deploy';
  const host = 'example.com';

  it('round-trips a password obfuscated for the site', () => {
    const encoded = encodeWinScpPassword('hunter2', user, host);
    expect(encoded.startsWith('A35C')).toBe(true); // flag 0xFF + simple version
    expect(decodeWinScpPassword(encoded, user, host)).toBe('hunter2');
  });

  it('returns null for a password sealed by a WinSCP master password', () => {
    expect(decodeWinScpPassword('A35D' + 'C0'.repeat(40), user, host)).toBeNull();
  });

  it('returns null when the value is empty, malformed, or decodes to another key', () => {
    expect(decodeWinScpPassword('', user, host)).toBeNull();
    expect(decodeWinScpPassword('ZZZZ', user, host)).toBeNull();
    expect(decodeWinScpPassword('A3', user, host)).toBeNull();
    expect(decodeWinScpPassword(encodeWinScpPassword('pw', 'other', 'elsewhere'), user, host)).toBeNull();
  });

  it('decodes the legacy (flag-as-length, unkeyed) format', () => {
    const out: number[] = [];
    const se = (byte: number) => out.push((~byte ^ 0xa3) & 0xff);
    se(2); // length
    se(0); // no padding
    se('p'.charCodeAt(0));
    se('w'.charCodeAt(0));
    const encoded = out.map(byte => byte.toString(16).padStart(2, '0').toUpperCase()).join('');
    expect(decodeWinScpPassword(encoded, user, host)).toBe('pw');
  });
});

describe('parseWinScpRegistryOutput', () => {
  it('reads sessions, their values and DWORD values out of reg.exe output', () => {
    const stdout = [
      'HKEY_CURRENT_USER\\Software\\Martin Prikryl\\WinSCP 2\\Sessions',
      'HKEY_CURRENT_USER\\Software\\Martin Prikryl\\WinSCP 2\\Sessions\\Default%20Settings',
      'HKEY_CURRENT_USER\\Software\\Martin Prikryl\\WinSCP 2\\Sessions\\thinkdbadmin@thinkdb.link',
      '    HostName    REG_SZ    thinkdb.eastus2.cloudapp.azure.com',
      '    UserName    REG_SZ    thinkdbadmin',
      '    PublicKeyFile    REG_SZ    C:%5CUsers%5CbrianC%5C.ssh%5Ckeys%5Cvmthinkdb_key.ppk',
      '    PortNumber    REG_DWORD    0x16',
      '',
    ].join('\r\n');

    const sessions = parseWinScpRegistryOutput(stdout);
    expect(sessions).toHaveLength(2);
    expect(sessions[0].name).toBe('Default%20Settings');
    expect(sessions[0].values).toEqual({});
    expect(sessions[1].name).toBe('thinkdbadmin@thinkdb.link');
    expect(sessions[1].values.HostName).toBe('thinkdb.eastus2.cloudapp.azure.com');
    expect(sessions[1].values.PortNumber).toBe('0x16');
  });
});

describe('parseWinScpIni', () => {
  it('reads only [Sessions\\…] sections', () => {
    const ini = [
      '[Configuration\\Interface]',
      'Interface=1',
      '',
      '[Sessions\\Prod/Web/web01]',
      'HostName=web01.internal',
      'UserName=deploy',
      '',
      '[Sessions\\notes]',
      'HostName=notes.example.com',
      '',
    ].join('\n');

    const sessions = parseWinScpIni(ini);
    expect(sessions.map(s => s.name)).toEqual(['Prod/Web/web01', 'notes']);
    expect(sessions[0].values.HostName).toBe('web01.internal');
  });
});

describe('mapWinScpSessions', () => {
  it('maps a key-file site, defaulting the port and dropping the escaping', () => {
    const { candidates, skippedProtocols } = mapWinScpSessions([
      session('thinkdbadmin@thinkdb.link', {
        HostName: 'thinkdb.eastus2.cloudapp.azure.com',
        UserName: 'thinkdbadmin',
        PublicKeyFile: 'C:%5CUsers%5CbrianC%5C.ssh%5Ckeys%5Cvmthinkdb_key.ppk',
      }),
    ]);

    expect(skippedProtocols).toEqual([]);
    expect(candidates).toEqual([
      {
        name: 'thinkdbadmin@thinkdb.link',
        host: 'thinkdb.eastus2.cloudapp.azure.com',
        port: 22,
        user: 'thinkdbadmin',
        identityFile: 'C:\\Users\\brianC\\.ssh\\keys\\vmthinkdb_key.ppk',
        password: null,
        proxyJump: null,
        folderPath: null,
      },
    ]);
  });

  it('splits the WinSCP folder out of the site name', () => {
    const { candidates } = mapWinScpSessions([
      session('Prod/Web/web01', { HostName: 'web01', UserName: 'deploy', PortNumber: '0x2222' }),
    ]);

    expect(candidates).toHaveLength(1);
    expect(candidates[0].name).toBe('web01');
    expect(candidates[0].folderPath).toBe('Prod/Web');
    expect(candidates[0].port).toBe(0x2222);
  });

  it('skips WinSCP defaults, workspaces, and keys without a hostname', () => {
    const { candidates } = mapWinScpSessions([
      session('Default%20Settings', { HostName: 'ignored' }),
      session('My%20Workspace', { HostName: 'ignored', IsWorkspace: '0x1' }),
      session('shell-only-folder', {}),
    ]);

    expect(candidates).toEqual([]);
  });

  it('reports the non-SSH protocols it leaves out', () => {
    const { candidates, skippedProtocols } = mapWinScpSessions([
      session('files', { HostName: 'files.example.com', FSProtocol: '0x5' }),
      session('dav', { HostName: 'dav.example.com', FSProtocol: '0x6' }),
      session('sftp', { HostName: 'sftp.example.com', FSProtocol: '0x1' }),
      session('scp', { HostName: 'scp.example.com', FSProtocol: '0x0' }),
    ]);

    expect(candidates.map(c => c.name)).toEqual(['sftp', 'scp']);
    expect(skippedProtocols).toEqual([
      { protocol: 'FTP', count: 1 },
      { protocol: 'WebDAV', count: 1 },
    ]);
  });

  it('emits the tunnel host as its own candidate that the site references', () => {
    const { candidates } = mapWinScpSessions([
      session('Prod/web01', {
        HostName: 'web01.internal',
        UserName: 'deploy',
        Tunnel: '0x1',
        TunnelHostName: 'bastion.example.com',
        TunnelUserName: 'jump',
        TunnelPortNumber: '0x2222',
      }),
    ]);

    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toMatchObject({
      name: 'web01',
      proxyJump: 'jump@bastion.example.com',
      folderPath: 'Prod',
    });
    expect(candidates[1]).toEqual({
      name: 'jump@bastion.example.com',
      host: 'bastion.example.com',
      port: 0x2222,
      user: 'jump',
      identityFile: null,
      password: null,
      proxyJump: null,
      folderPath: 'Prod',
    });
  });

  it('reuses one tunnel candidate when several sites share a tunnel host', () => {
    const tunneled = {
      Tunnel: '0x1',
      TunnelHostName: 'bastion.example.com',
      TunnelUserName: 'jump',
    };
    const { candidates } = mapWinScpSessions([
      session('web01', { HostName: 'web01', ...tunneled }),
      session('web02', { HostName: 'web02', ...tunneled }),
    ]);

    expect(candidates.map(c => c.name)).toEqual(['web01', 'web02', 'jump@bastion.example.com']);
  });

  it('keeps a real site that shares the tunnel host name', () => {
    const { candidates } = mapWinScpSessions([
      session('bastion.example.com', { HostName: 'bastion.example.com', UserName: 'jump' }),
      session('web01', {
        HostName: 'web01',
        Tunnel: '0x1',
        TunnelHostName: 'bastion.example.com',
      }),
    ]);

    expect(candidates.map(c => c.name)).toEqual(['bastion.example.com', 'web01']);
    expect(candidates[1].proxyJump).toBe('bastion.example.com');
  });

  it('carries a decodable password and drops a master-password-locked one', () => {
    const { candidates } = mapWinScpSessions([
      session('prod', {
        HostName: 'prod.example.com',
        UserName: 'deploy',
        Password: encodeWinScpPassword('s3cret', 'deploy', 'prod.example.com'),
      }),
      session('locked', {
        HostName: 'locked.example.com',
        UserName: 'deploy',
        Password: 'A35D' + 'C0'.repeat(40),
      }),
    ]);

    expect(candidates[0].password).toBe('s3cret');
    expect(candidates[1].password).toBeNull();
  });

  it('prefers a plaintext password when WinSCP stored one', () => {
    const { candidates } = mapWinScpSessions([
      session('prod', {
        HostName: 'prod.example.com',
        UserName: 'deploy',
        PasswordPlain: 'stored%20in%20plain',
      }),
    ]);

    expect(candidates[0].password).toBe('stored in plain');
  });
});
