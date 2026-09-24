/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Domain service: WinSCP stored-site parsing
   Pure logic — no Node/Electron imports allowed (see .dependency-cruiser.cjs).

   WinSCP keeps its sites in the Windows registry (or a WinSCP.ini) with its own
   escaping, and obfuscates stored passwords. Everything here works on the strings
   read from that storage, so the whole import path is testable in isolation.
   ═══════════════════════════════════════════════════════════════════════════ */

/** One session as read from WinSCP storage: still-escaped name and values. */
export interface WinScpRawSession {
  name: string;
  values: Record<string, string>;
}

/** A site (or synthesized tunnel host) that can become an EchoTerm Connection. */
export interface WinScpCandidate {
  name: string;
  host: string;
  port: number;
  user: string;
  /** A key file OpenSSH can read, or null when the site has none to import. */
  identityFile: string | null;
  password: string | null;
  /** Name of the candidate that serves as this site's tunnel host, or null. */
  proxyJump: string | null;
  /** WinSCP folder path ("Prod/Web"), or null for a root-level site. */
  folderPath: string | null;
}

export interface WinScpParseResult {
  candidates: WinScpCandidate[];
  /** Non-SSH protocols left out of the import, with how many sites used each. */
  skippedProtocols: Array<{ protocol: string; count: number }>;
  /** Sites whose key file is unusable: imported without one, to be set by hand. */
  unsupportedKeySites: string[];
}

// ─── Escaping ────────────────────────────────────────────────────────────────

/**
 * Reverse WinSCP's storage escaping: `%XX` byte escapes, applied to UTF-8 bytes
 * with a BOM prefix for non-ASCII text (which TextDecoder strips).
 */
export function decodeWinScpValue(value: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '%' && i + 2 < value.length) {
      const byte = parseInt(value.slice(i + 1, i + 3), 16);
      if (!Number.isNaN(byte)) {
        bytes.push(byte);
        i += 2;
        continue;
      }
    }
    const code = value.charCodeAt(i);
    if (code < 0x80) bytes.push(code);
    else bytes.push(...new TextEncoder().encode(value[i]));
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

// ─── Passwords ───────────────────────────────────────────────────────────────

const PW_MAGIC = 0xa3;
const PW_FLAG = 0xff;
const PW_VERSION_EXTERNAL = 0x01; // AES blob written when a master password is set
const PW_VERSION_WIDE_LENGTH = 0x02;

/**
 * Decode a WinSCP-obfuscated password. The obfuscation key is the site's
 * `username + hostname`, so the plaintext is only recoverable for that site.
 * Returns null when the value is absent, malformed, or sealed behind a WinSCP
 * master password (which cannot be read back by design).
 */
export function decodeWinScpPassword(encoded: string, username: string, hostname: string): string | null {
  let pos = 0;
  const nextByte = (): number | null => {
    if (pos + 2 > encoded.length) return null;
    const high = parseInt(encoded[pos], 16);
    const low = parseInt(encoded[pos + 1], 16);
    pos += 2;
    if (Number.isNaN(high) || Number.isNaN(low)) return null;
    return ~(((high << 4) + low) ^ PW_MAGIC) & 0xff;
  };

  const flag = nextByte();
  if (flag === null) return null;

  let length: number;
  if (flag === PW_FLAG) {
    const version = nextByte();
    if (version === null) return null;
    if (version === PW_VERSION_EXTERNAL) return null; // master password: not recoverable
    if (version === PW_VERSION_WIDE_LENGTH) {
      const high = nextByte();
      const low = nextByte();
      if (high === null || low === null) return null;
      length = (high << 8) + low;
    } else {
      const byte = nextByte();
      if (byte === null) return null;
      length = byte;
    }
  } else {
    length = flag; // legacy format: the flag doubles as the length
  }

  // Random padding precedes the payload in both formats.
  const padding = nextByte();
  if (padding === null) return null;
  for (let i = 0; i < padding; i++) {
    if (nextByte() === null) return null;
  }

  const bytes: number[] = [];
  for (let i = 0; i < length; i++) {
    const byte = nextByte();
    if (byte === null) return null;
    bytes.push(byte);
  }
  const plain = new TextDecoder().decode(new Uint8Array(bytes));

  if (flag !== PW_FLAG) return plain;
  // The keyed format prefixes the plaintext with the encryption key itself.
  const key = username + hostname;
  if (!plain.startsWith(key)) return null;
  return plain.slice(key.length);
}

/** The site's stored password: obfuscated, or plaintext in "plain password" mode. */
function storedPassword(values: Record<string, string>, user: string, host: string): string | null {
  if (values.PasswordPlain) return decodeWinScpValue(values.PasswordPlain);
  if (!values.Password) return null;
  return decodeWinScpPassword(values.Password, user, host);
}

// ─── Session mapping ─────────────────────────────────────────────────────────

/** FSProtocol numbers WinSCP uses for SSH transports. */
const SSH_PROTOCOLS: Record<number, string> = { 0: 'SCP', 1: 'SFTP', 2: 'SFTP' };
/** FSProtocol numbers EchoTerm cannot connect to (ssh.exe only speaks SSH). */
const OTHER_PROTOCOLS: Record<number, string> = { 5: 'FTP', 6: 'WebDAV', 7: 'S3' };
/** WinSCP's reserved key holding per-folder new-site defaults, not a site. */
const DEFAULT_SETTINGS_NAME = 'Default Settings';
/** Default FSProtocol and PortNumber: WinSCP omits values equal to its defaults. */
const DEFAULT_PROTOCOL = 1;
const DEFAULT_PORT = 22;
/** WinSCP's PuTTY key format, which the ssh.exe we spawn cannot read. */
const PUTTY_KEY_EXTENSION = '.ppk';

/**
 * The site's key file when OpenSSH can use it. A PuTTY `.ppk` is dropped
 * instead of imported: it would only fail at connect time, so the site is
 * imported without a key file and reported for the user to set by hand.
 */
function usableKeyFile(raw: string | undefined): { path: string | null; dropped: boolean } {
  if (!raw) return { path: null, dropped: false };
  const keyPath = decodeWinScpValue(raw);
  return keyPath.toLowerCase().endsWith(PUTTY_KEY_EXTENSION)
    ? { path: null, dropped: true }
    : { path: keyPath, dropped: false };
}

function intValue(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = raw.toLowerCase().startsWith('0x') ? parseInt(raw, 16) : parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isFlagOn(raw: string | undefined): boolean {
  if (!raw) return false;
  return !['0', '0x0', 'false'].includes(raw.toLowerCase());
}

/**
 * Turn raw WinSCP sessions into import candidates: SSH-protocol sites only,
 * with their WinSCP folder path split off the site name, and each site's tunnel
 * host emitted as its own candidate that the site references by name.
 */
export function mapWinScpSessions(sessions: WinScpRawSession[]): WinScpParseResult {
  const candidates: WinScpCandidate[] = [];
  const skipped = new Map<string, number>();
  const siteNames = new Set<string>();
  const tunnels = new Map<string, WinScpCandidate>();
  const unsupportedKeySites = new Set<string>();

  for (const session of sessions) {
    const values = session.values;
    if (isFlagOn(values.IsWorkspace)) continue; // a saved set of tabs, not a site

    // WinSCP folders live inside the site name ("Prod/Web/web01"); a trailing
    // separator may also come from the INI's nested section path.
    const segments = session.name
      .replace(/\\/g, '/')
      .split('/')
      .filter(segment => segment.length > 0)
      .map(decodeWinScpValue);
    if (segments.length === 0) continue;

    const name = segments[segments.length - 1];
    const folderPath = segments.length > 1 ? segments.slice(0, -1).join('/') : null;
    if (name === DEFAULT_SETTINGS_NAME) continue;

    const host = decodeWinScpValue(values.HostName || '');
    if (!host) continue; // without a hostname it is not a connectable site

    const protocol = intValue(values.FSProtocol, DEFAULT_PROTOCOL);
    if (!SSH_PROTOCOLS[protocol]) {
      const label = OTHER_PROTOCOLS[protocol] || 'Unknown';
      skipped.set(label, (skipped.get(label) || 0) + 1);
      continue;
    }

    const user = decodeWinScpValue(values.UserName || '');
    let proxyJump: string | null = null;
    if (isFlagOn(values.Tunnel) && values.TunnelHostName) {
      proxyJump = mapTunnel(values, folderPath, tunnels, unsupportedKeySites);
    }

    const keyFile = usableKeyFile(values.PublicKeyFile);
    if (keyFile.dropped) unsupportedKeySites.add(name);

    siteNames.add(name);
    candidates.push({
      name,
      host,
      port: intValue(values.PortNumber, DEFAULT_PORT),
      user,
      identityFile: keyFile.path,
      password: storedPassword(values, user, host),
      proxyJump,
      folderPath,
    });
  }

  // Tunnel hosts are referenced by name, so each one is emitted as its own
  // candidate for the apply step to link, exactly like an ssh_config ProxyJump.
  for (const [name, tunnel] of tunnels) {
    if (!siteNames.has(name)) candidates.push(tunnel);
  }

  return {
    candidates,
    skippedProtocols: [...skipped].map(([protocol, count]) => ({ protocol, count })),
    unsupportedKeySites: [...unsupportedKeySites],
  };
}

/** Map a site's "connect through tunnel" settings onto a candidate (bastion host). */
function mapTunnel(
  values: Record<string, string>,
  folderPath: string | null,
  tunnels: Map<string, WinScpCandidate>,
  unsupportedKeySites: Set<string>,
): string {
  const tunnelHost = decodeWinScpValue(values.TunnelHostName || '');
  const tunnelUser = decodeWinScpValue(values.TunnelUserName || '');
  // Name it the way WinSCP names auto-saved sites, so it reads as a host.
  const name = tunnelUser ? `${tunnelUser}@${tunnelHost}` : tunnelHost;

  if (!tunnels.has(name)) {
    const keyFile = usableKeyFile(values.TunnelPublicKeyFile);
    if (keyFile.dropped) unsupportedKeySites.add(name);
    tunnels.set(name, {
      name,
      host: tunnelHost,
      port: intValue(values.TunnelPortNumber, DEFAULT_PORT),
      user: tunnelUser,
      identityFile: keyFile.path,
      password: storedPassword(
        { Password: values.TunnelPassword, PasswordPlain: values.TunnelPasswordPlain },
        tunnelUser,
        tunnelHost,
      ),
      proxyJump: null,
      folderPath,
    });
  }
  return name;
}

// ─── Storage readers ─────────────────────────────────────────────────────────

/**
 * Parse `reg.exe query "…\Sessions" /s` output. Every session is a direct child
 * of the Sessions key, so a key line's name is everything after `\Sessions\`.
 */
export function parseWinScpRegistryOutput(stdout: string): WinScpRawSession[] {
  const marker = '\\Sessions\\';
  const sessions: WinScpRawSession[] = [];
  let current: WinScpRawSession | null = null;

  for (const line of stdout.split(/\r?\n/)) {
    if (!line.trim()) continue;

    if (!/^\s/.test(line)) {
      const at = line.indexOf(marker);
      current = at === -1 ? null : { name: line.slice(at + marker.length).trim(), values: {} };
      if (current) sessions.push(current);
      continue;
    }
    if (!current) continue;

    const match = line.match(/^\s+(\S+)\s+REG_\w+\s?(.*)$/);
    if (match) current.values[match[1]] = match[2].trim();
  }

  return sessions;
}

/** Parse the `[Sessions\…]` sections of a WinSCP.ini. */
export function parseWinScpIni(content: string): WinScpRawSession[] {
  const sectionPrefix = 'Sessions\\';
  const sessions: WinScpRawSession[] = [];
  let current: WinScpRawSession | null = null;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith(';')) continue;

    const section = line.match(/^\[(.+)\]$/);
    if (section) {
      const header = section[1].trim();
      current = header.startsWith(sectionPrefix)
        ? { name: header.slice(sectionPrefix.length), values: {} }
        : null;
      if (current) sessions.push(current);
      continue;
    }
    if (!current) continue;

    const separator = line.indexOf('=');
    if (separator <= 0) continue;
    current.values[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }

  return sessions;
}
