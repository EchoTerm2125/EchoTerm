/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Domain service: SSH config file parsing & rendering
   Pure logic — no Node/Electron imports allowed (see .dependency-cruiser.cjs).
   ═══════════════════════════════════════════════════════════════════════════ */

import type { Connection, ResolvedConnection, ResolvedJumpHost, User } from '../entities/ssh';

// ─── Parsing ─────────────────────────────────────────────────────────────────

/** A host entry parsed from an SSH config file. */
export interface SshConfigHostEntry {
  name: string;
  aliases: string[];
  host: string;
  port: number;
  user: string;
  identityFile: string | null;
  proxyJump: string | null;
  hostKeyAlgorithms: string | null;
  kexAlgorithms: string | null;
  pubkeyAcceptedAlgorithms: string | null;
  ciphers: string | null;
  macs: string | null;
  caSignatureAlgorithms: string | null;
  compression: string | null;
}

/**
 * Parse SSH config text into host entries.
 *
 * @param content    raw config file content
 * @param homePrefix replacement for a leading "~/" in IdentityFile paths
 *                   (caller supplies homedir + platform path separator)
 */
export function parseSshConfigText(content: string, homePrefix: string): SshConfigHostEntry[] {
  const lines = content.split(/\r?\n/);
  const hosts: SshConfigHostEntry[] = [];
  let current: SshConfigHostEntry | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const match = line.match(/^(\S+)\s+(.+)$/);
    if (!match) continue;

    const keyword = match[1].toLowerCase();
    const value = match[2].trim();

    if (keyword === 'host') {
      if (current) hosts.push(current);
      const aliases = value.split(/\s+/);
      current = {
        name: aliases[0], aliases, host: '', port: 22, user: '',
        identityFile: null, proxyJump: null,
        hostKeyAlgorithms: null, kexAlgorithms: null, pubkeyAcceptedAlgorithms: null,
        ciphers: null, macs: null, caSignatureAlgorithms: null, compression: null,
      };
    } else if (current) {
      switch (keyword) {
        case 'hostname': current.host = value; break;
        case 'port': current.port = parseInt(value, 10) || 22; break;
        case 'user': current.user = value; break;
        case 'identityfile':
          current.identityFile = value.replace(/^~\//, homePrefix);
          break;
        case 'proxyjump':
          // Extract just the host alias (strip user@ and :port)
          current.proxyJump = value.replace(/^.+@/, '').replace(/:\d+$/, '');
          break;
        case 'hostkeyalgorithms': current.hostKeyAlgorithms = value; break;
        case 'kexalgorithms': current.kexAlgorithms = value; break;
        case 'pubkeyacceptedalgorithms':
        case 'pubkeyacceptedkeytypes': // pre-8.5 name of the same option
          current.pubkeyAcceptedAlgorithms = value;
          break;
        case 'ciphers': current.ciphers = value; break;
        case 'macs': current.macs = value; break;
        case 'casignaturealgorithms': current.caSignatureAlgorithms = value; break;
        case 'compression': current.compression = value; break;
      }
    }
  }
  if (current) hosts.push(current);
  return hosts.filter(h => h.host && h.name !== '*');
}

// ─── Rendering ───────────────────────────────────────────────────────────────

/** The seven optional algorithm/compression override directives. */
interface AlgorithmOverrides {
  hostKeyAlgorithms: string | null;
  kexAlgorithms: string | null;
  pubkeyAcceptedAlgorithms: string | null;
  ciphers: string | null;
  macs: string | null;
  caSignatureAlgorithms: string | null;
  compression: string | null;
}

/**
 * Validate and format a directive value: newlines would inject extra config
 * lines (e.g. a smuggled ProxyCommand) and stray double quotes make ssh reject
 * the whole file ("invalid quotes"); values containing whitespace need double
 * quotes so ssh does not split them.
 */
function configValue(value: string): string {
  if (/[\r\n"]/.test(value)) throw new Error('SSH config values must not contain newlines or double quotes.');
  return /\s/.test(value) ? `"${value}"` : value;
}

/** Render the algorithm override directives shared by export and session rendering. */
function renderAlgorithmDirectives(o: AlgorithmOverrides): string {
  let text = '';
  if (o.hostKeyAlgorithms) text += `  HostKeyAlgorithms ${configValue(o.hostKeyAlgorithms)}\n`;
  if (o.kexAlgorithms) text += `  KexAlgorithms ${configValue(o.kexAlgorithms)}\n`;
  if (o.pubkeyAcceptedAlgorithms) text += `  PubkeyAcceptedAlgorithms ${configValue(o.pubkeyAcceptedAlgorithms)}\n`;
  if (o.ciphers) text += `  Ciphers ${configValue(o.ciphers)}\n`;
  if (o.macs) text += `  MACs ${configValue(o.macs)}\n`;
  if (o.caSignatureAlgorithms) text += `  CASignatureAlgorithms ${configValue(o.caSignatureAlgorithms)}\n`;
  if (o.compression) text += `  Compression ${configValue(o.compression)}\n`;
  return text;
}

/** Render connections (with their stored users) as SSH config text. */
export function renderSshConfig(connections: Connection[], users: User[]): string {
  let configText = '';
  for (const conn of connections) {
    const user = users.find(u => u.id === conn.userId);
    configText += `Host ${conn.name}\n`;
    configText += `  HostName ${conn.host}\n`;
    if (conn.port && conn.port !== 22) configText += `  Port ${conn.port}\n`;
    if (user) {
      configText += `  User ${user.username}\n`;
      if (user.authType === 'keyfile' && user.keyFilePath) {
        configText += `  IdentityFile ${user.keyFilePath}\n`;
      }
    }
    // Jump host
    if (conn.jumpHost) {
      if (conn.jumpHost.type === 'manual') {
        const jh = conn.jumpHost;
        configText += `  ProxyJump ${jh.username}@${jh.host}:${jh.port}\n`;
      } else if (conn.jumpHost.type === 'reference') {
        const refId = conn.jumpHost.connectionId;
        const jc = connections.find(c => c.id === refId);
        if (jc) configText += `  ProxyJump ${jc.name}\n`;
      }
    }
    // Algorithm overrides for legacy servers
    configText += renderAlgorithmDirectives(conn);
    configText += '\n';
  }
  return configText;
}

/**
 * Render the per-session ssh config used with `ssh -F`.
 *
 * EchoTerm's Host blocks come first and are keyed on the real host names: the
 * session is spawned with the target's host name and every ProxyJump hop with
 * its own, so both our blocks and the user's own host-specific blocks match.
 * We deliberately omit HostName so a `Host <name>` entry in the user's config
 * can still remap it (a stored ssh alias keeps resolving). An Include of the
 * user's own ~/.ssh/config follows behind a `Host *` reset (an Include inside
 * a non-matching Host block is ignored entirely). ssh takes the first obtained
 * value per option, so our explicit values win while the user's config still
 * applies to everything else.
 *
 * @param target      connection with user credentials and jump chain resolved
 * @param includePath absolute path of the user's ~/.ssh/config, or null if absent
 */
export function renderSessionSshConfig(
  target: ResolvedConnection,
  includePath: string | null,
): string {
  const chain = target.resolvedJumpChain;
  // ProxyJump carries the hop's real host name (plus user/port like the old -J
  // argument) so each hop's own ssh process matches the user's host config too.
  const jumpSpec = (hop: ResolvedJumpHost): string => {
    const port = hop.port && hop.port !== 22 ? `:${hop.port}` : '';
    return configValue(`${hop.username ? `${hop.username}@` : ''}${hop.host}${port}`);
  };

  let text = `Host ${configValue(target.host)}\n`;
  if (target.port && target.port !== 22) text += `  Port ${target.port}\n`;
  if (target.username) text += `  User ${configValue(target.username)}\n`;
  if (target.authType === 'keyfile' && target.keyFilePath) {
    text += `  IdentityFile ${configValue(target.keyFilePath)}\n`;
  }
  if (chain.length) text += `  ProxyJump ${jumpSpec(chain[0])}\n`;
  text += renderAlgorithmDirectives(target);

  chain.forEach((hop, i) => {
    text += `\nHost ${configValue(hop.host)}\n`;
    if (hop.port && hop.port !== 22) text += `  Port ${hop.port}\n`;
    if (hop.username) text += `  User ${configValue(hop.username)}\n`;
    if (hop.authType === 'keyfile' && hop.keyFilePath) {
      text += `  IdentityFile ${configValue(hop.keyFilePath)}\n`;
    }
    if (chain[i + 1]) text += `  ProxyJump ${jumpSpec(chain[i + 1])}\n`;
  });

  // `Host *` resets the block context so the Include is processed whatever
  // block is active and the user's bare top-level directives land in a
  // catch-all block instead of one of our host-specific ones.
  if (includePath) text += `\nHost *\nInclude ${configValue(includePath)}\n`;
  return text;
}
