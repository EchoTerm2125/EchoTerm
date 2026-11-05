// Unit tests for src/domain/services/password-prompt.ts
import {
  credentialForPrompt,
  isPasswordPrompt,
  isPassphrasePrompt,
  type CredentialSlot,
} from '../../src/domain/services/password-prompt';

function slot(partial: Partial<CredentialSlot> = {}): CredentialSlot {
  return { authType: null, password: null, keyPassword: null, keyFilePath: null, consumed: false, ...partial };
}

describe('isPasswordPrompt', () => {
  it('matches "Password:" (capitalized prompt)', () => {
    expect(isPasswordPrompt('alice@example.com\'s Password: ')).toBe(true);
  });

  it('matches lowercase "password:"', () => {
    expect(isPasswordPrompt('password: ')).toBe(true);
  });

  it('matches partial chunk ending in "assword:"', () => {
    expect(isPasswordPrompt('P\r\nassword:')).toBe(true);
  });

  it('does not match ordinary shell output', () => {
    expect(isPasswordPrompt('Welcome to Ubuntu 22.04 LTS')).toBe(false);
  });

  it('does not match passphrase prompts', () => {
    expect(isPasswordPrompt('Enter passphrase for key \'C:\\keys\\id_rsa\': ')).toBe(false);
  });
});

describe('isPassphrasePrompt', () => {
  it('matches "Enter passphrase"', () => {
    expect(isPassphrasePrompt('Enter passphrase for key \'C:\\keys\\id_rsa\': ')).toBe(true);
  });

  it('matches "passphrase for key"', () => {
    expect(isPassphrasePrompt('Enter a passphrase for key \'id_ed25519\'')).toBe(true);
  });

  it('does not match a plain password prompt', () => {
    expect(isPassphrasePrompt('Password: ')).toBe(false);
  });
});

describe('credentialForPrompt', () => {
  it('returns the first unused password slot for a password prompt', () => {
    const slots = [slot({ authType: 'password', password: 'hop-pw' }), slot({ authType: 'password', password: 'target-pw' })];
    expect(credentialForPrompt(slots, 'Password: ')).toBe('hop-pw');
    expect(credentialForPrompt(slots, 'Password: ')).toBe('target-pw');
    expect(credentialForPrompt(slots, 'Password: ')).toBeNull();
  });

  it('attributes a passphrase prompt to the key file it names', () => {
    const slots = [
      slot({ authType: 'keyfile', keyFilePath: 'C:\\keys\\jump', keyPassword: 'jump-kp' }),
      slot({ authType: 'keyfile', keyFilePath: 'C:\\keys\\target', keyPassword: 'target-kp' }),
    ];
    expect(credentialForPrompt(slots, "Enter passphrase for key 'C:\\keys\\target': ")).toBe('target-kp');
    expect(slots[1].consumed).toBe(true);
    expect(slots[0].consumed).toBe(false);
  });

  it('matches key paths across separators and case', () => {
    const slots = [slot({ authType: 'keyfile', keyFilePath: 'C:\\Keys\\id_rsa', keyPassword: 'kp' })];
    expect(credentialForPrompt(slots, "Enter passphrase for key 'c:/keys/id_rsa': ")).toBe('kp');
  });

  it('does not inject for a named key that matches no stored slot', () => {
    const slots = [slot({ authType: 'keyfile', keyFilePath: 'C:\\keys\\stored', keyPassword: 'kp' })];
    expect(credentialForPrompt(slots, "Enter passphrase for key 'C:\\keys\\other': ")).toBeNull();
    expect(slots[0].consumed).toBe(false);
  });

  it('falls back to slot order when the prompt names no key file', () => {
    const slots = [slot({ authType: 'keyfile', keyFilePath: 'C:\\keys\\a', keyPassword: 'first' })];
    expect(credentialForPrompt(slots, 'Enter passphrase')).toBe('first');
  });

  it('ignores slots whose auth type does not match the prompt', () => {
    const keyOnly = [slot({ authType: 'keyfile', keyFilePath: 'C:\\keys\\a', keyPassword: 'kp' })];
    expect(credentialForPrompt(keyOnly, 'Password: ')).toBeNull();
    expect(keyOnly[0].consumed).toBe(false);

    const pwOnly = [slot({ authType: 'password', password: 'pw' })];
    expect(credentialForPrompt(pwOnly, "Enter passphrase for key 'C:\\keys\\a': ")).toBeNull();
    expect(pwOnly[0].consumed).toBe(false);
  });

  it('returns null for output that is not a credential prompt', () => {
    expect(credentialForPrompt([slot({ authType: 'password', password: 'pw' })], 'Welcome to Ubuntu')).toBeNull();
  });
});
