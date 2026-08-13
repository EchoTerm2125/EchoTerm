// Unit tests for src/domain/services/password-prompt.ts
import { isPasswordPrompt, isPassphrasePrompt } from '../../src/domain/services/password-prompt';

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
