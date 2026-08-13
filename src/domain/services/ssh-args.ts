/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Domain service: SSH command-line construction
   Pure logic — no Node/Electron imports allowed (see .dependency-cruiser.cjs).
   ═══════════════════════════════════════════════════════════════════════════ */

import type { ResolvedConnection } from '../entities/ssh';

/** POSIX shell-quote a value so it cannot be interpreted as command syntax. */
function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/**
 * Build the ssh.exe argument list for a resolved connection.
 * Key-file jump hosts go through ProxyCommand (ssh -i cannot be combined
 * with -J); all other jump hosts use -J ProxyJump.
 */
export function buildSshArgs(target: ResolvedConnection): string[] {
  const args: string[] = [];

  const jh = target.resolvedJumpHost;
  if (jh) {
    if (jh.authType === 'keyfile' && jh.keyFilePath) {
      // Use ProxyCommand to support key file auth for the jump host
      const jhPort = jh.port && jh.port !== 22 ? `:${jh.port}` : '';
      const jumpTarget = `${jh.username}@${jh.host}${jhPort}`;
      const proxyCmd = `ssh -i ${shellQuote(jh.keyFilePath)} -W %h:%p ${shellQuote(jumpTarget)}`;
      args.push('-o', `ProxyCommand=${proxyCmd}`);
    } else {
      // Use -J ProxyJump for password / no-auth jump hosts
      const jumpTarget = `${jh.username}@${jh.host}`;
      if (jh.port && jh.port !== 22) {
        args.push('-J', `${jumpTarget}:${jh.port}`);
      } else {
        args.push('-J', jumpTarget);
      }
    }
  }

  // Optional algorithm overrides for legacy servers
  // (e.g. "+ssh-rsa,ssh-dss" when a host only offers deprecated types)
  if (target.hostKeyAlgorithms) args.push('-o', `HostKeyAlgorithms=${target.hostKeyAlgorithms}`);
  if (target.kexAlgorithms) args.push('-o', `KexAlgorithms=${target.kexAlgorithms}`);
  if (target.pubkeyAcceptedAlgorithms) args.push('-o', `PubkeyAcceptedAlgorithms=${target.pubkeyAcceptedAlgorithms}`);

  if (target.port && target.port !== 22) args.push('-p', String(target.port));
  if (target.authType === 'keyfile' && target.keyFilePath) {
    args.push('-i', target.keyFilePath);
  }
  args.push(`${target.username}@${target.host}`);

  return args;
}
