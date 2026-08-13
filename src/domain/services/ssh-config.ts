/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Domain service: SSH config file parsing & rendering
   Pure logic — no Node/Electron imports allowed (see .dependency-cruiser.cjs).
   ═══════════════════════════════════════════════════════════════════════════ */

import type { Connection, User } from '../entities/ssh';

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
      }
    }
  }
  if (current) hosts.push(current);
  return hosts.filter(h => h.host && h.name !== '*');
}

// ─── Rendering ───────────────────────────────────────────────────────────────

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
    if (conn.hostKeyAlgorithms) configText += `  HostKeyAlgorithms ${conn.hostKeyAlgorithms}\n`;
    if (conn.kexAlgorithms) configText += `  KexAlgorithms ${conn.kexAlgorithms}\n`;
    if (conn.pubkeyAcceptedAlgorithms) configText += `  PubkeyAcceptedAlgorithms ${conn.pubkeyAcceptedAlgorithms}\n`;
    configText += '\n';
  }
  return configText;
}
