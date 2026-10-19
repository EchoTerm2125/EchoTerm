/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Domain service: interactive credential prompt detection
   Pure logic — no Node/Electron imports allowed (see .dependency-cruiser.cjs).
   ═══════════════════════════════════════════════════════════════════════════ */

import type { AuthType } from '../entities/ssh';

/** Detect an interactive password prompt in terminal output (target host login). */
export function isPasswordPrompt(data: string): boolean {
  return (
    data.includes('assword:') ||
    data.includes('Password:') ||
    data.includes('password:')
  );
}

/** Detect an interactive key-passphrase prompt in terminal output. */
export function isPassphrasePrompt(data: string): boolean {
  return data.includes('Enter passphrase') || data.includes('passphrase for key');
}

/** A stored credential slot, ordered by authentication (jump hops first, target last). */
export interface CredentialSlot {
  authType: AuthType | null;
  password: string | null;
  keyPassword: string | null;
  keyFilePath: string | null;
  /** Set once injected — ssh re-prompts after a rejected credential, which is the user's to resolve. */
  consumed: boolean;
}

/** Compare key file paths ignoring Windows separators and case. */
function sameKeyPath(a: string, b: string): boolean {
  return a.replace(/\\/g, '/').toLowerCase() === b.replace(/\\/g, '/').toLowerCase();
}

/**
 * Pick the stored credential to auto-inject for an interactive prompt.
 *
 * Jump hops authenticate before the target (ProxyJump chains ssh processes), so
 * every hop's prompt arrives first on the same output stream; slots are in
 * authentication order and each injects at most once. A passphrase prompt names
 * its key file, so it is attributed by path when possible and falls back to
 * slot order when the prompt arrives without one (e.g. split across chunks).
 *
 * @returns the credential to write, or null when nothing is stored for this prompt
 */
export function credentialForPrompt(slots: CredentialSlot[], data: string): string | null {
  if (isPassphrasePrompt(data)) {
    const keyPath = data.match(/passphrase for key '([^']+)'/i)?.[1];
    const available = slots.filter(s => !s.consumed && s.authType === 'keyfile' && s.keyPassword);
    // A named key is only ever served by its own slot: an unmatched path means
    // the prompt belongs to a key we do not hold, so injecting another slot's
    // passphrase would fail the login and burn its one-shot injection. The
    // slot-order fallback is for prompts that arrive with no key path at all.
    const slot = keyPath
      ? available.find(s => s.keyFilePath && sameKeyPath(s.keyFilePath, keyPath)) ?? null
      : available[0] ?? null;
    if (!slot) return null;
    slot.consumed = true;
    return slot.keyPassword;
  }
  if (isPasswordPrompt(data)) {
    const slot = slots.find(s => !s.consumed && s.authType === 'password' && s.password);
    if (!slot) return null;
    slot.consumed = true;
    return slot.password;
  }
  return null;
}
