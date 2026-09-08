// Unit tests for src/domain/services/update-policy.ts
import { shouldCheckForUpdate } from '../../src/domain/services/update-policy';
import type { UpdateSettings } from '../../src/domain/ports/update-settings';

const baseSettings: UpdateSettings = {
  includePrerelease: false,
  checkForUpdatesAutomatically: true,
};

describe('shouldCheckForUpdate', () => {
  it('runs automatic checks when the master toggle is on', () => {
    expect(shouldCheckForUpdate({ settings: baseSettings, manual: false })).toBe(true);
  });

  it('skips automatic checks when the master toggle is off', () => {
    const settings = { ...baseSettings, checkForUpdatesAutomatically: false };
    expect(shouldCheckForUpdate({ settings, manual: false })).toBe(false);
  });

  it('manual checks always run, even when the toggle is off', () => {
    const settings = { ...baseSettings, checkForUpdatesAutomatically: false };
    expect(shouldCheckForUpdate({ settings, manual: true })).toBe(true);
  });

  it('manual checks run when the toggle is on', () => {
    expect(shouldCheckForUpdate({ settings: baseSettings, manual: true })).toBe(true);
  });

  it('skips automatic checks while a check is busy', () => {
    expect(shouldCheckForUpdate({ settings: baseSettings, manual: false, busy: true })).toBe(false);
  });

  it('skips automatic checks while busy even when the toggle is off', () => {
    const settings = { ...baseSettings, checkForUpdatesAutomatically: false };
    expect(shouldCheckForUpdate({ settings, manual: false, busy: true })).toBe(false);
  });

  it('manual checks always run, even while busy', () => {
    expect(shouldCheckForUpdate({ settings: baseSettings, manual: true, busy: true })).toBe(true);
  });

  it('manual checks run while busy even when the toggle is off', () => {
    const settings = { ...baseSettings, checkForUpdatesAutomatically: false };
    expect(shouldCheckForUpdate({ settings, manual: true, busy: true })).toBe(true);
  });
});
