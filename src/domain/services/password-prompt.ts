/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Domain service: interactive credential prompt detection
   Pure logic — no Node/Electron imports allowed (see .dependency-cruiser.cjs).
   ═══════════════════════════════════════════════════════════════════════════ */

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
