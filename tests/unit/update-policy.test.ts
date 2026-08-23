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
});
