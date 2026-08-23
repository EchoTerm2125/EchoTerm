// Unit tests for src/domain/services/update-policy.ts
import {
  applyRemindLater,
  isVersionSkipped,
  REMIND_MS,
  shouldCheckForUpdate,
} from '../../src/domain/services/update-policy';
import type { UpdateSettings } from '../../src/domain/ports/update-settings';

const baseSettings: UpdateSettings = {
  includePrerelease: false,
  checkForUpdatesAutomatically: true,
  skippedVersion: null,
  nextCheckAt: null,
};

describe('shouldCheckForUpdate', () => {
  it('runs when everything is enabled and no reminder is set', () => {
    expect(shouldCheckForUpdate({ settings: baseSettings, now: 1000, manual: false })).toBe(true);
  });

  it('skips automatic checks when the master toggle is off', () => {
    const settings = { ...baseSettings, checkForUpdatesAutomatically: false };
    expect(shouldCheckForUpdate({ settings, now: 1000, manual: false })).toBe(false);
  });

  it('skips automatic checks inside the 30-day reminder window', () => {
    const settings = { ...baseSettings, nextCheckAt: 5000 };
    expect(shouldCheckForUpdate({ settings, now: 1000, manual: false })).toBe(false);
  });

  it('runs automatic checks once the reminder window has passed', () => {
    const settings = { ...baseSettings, nextCheckAt: 5000 };
    expect(shouldCheckForUpdate({ settings, now: 5001, manual: false })).toBe(true);
  });

  it('manual checks always run, even when the toggle is off', () => {
    const settings = { ...baseSettings, checkForUpdatesAutomatically: false };
    expect(shouldCheckForUpdate({ settings, now: 1000, manual: true })).toBe(true);
  });

  it('manual checks always run, even inside the reminder window', () => {
    const settings = { ...baseSettings, nextCheckAt: 5000 };
    expect(shouldCheckForUpdate({ settings, now: 1000, manual: true })).toBe(true);
  });
});

describe('isVersionSkipped', () => {
  it('matches the exact skipped version', () => {
    const settings = { ...baseSettings, skippedVersion: '0.2.0-beta.1' };
    expect(isVersionSkipped(settings, '0.2.0-beta.1')).toBe(true);
  });

  it('does not match a different version', () => {
    const settings = { ...baseSettings, skippedVersion: '0.2.0-beta.1' };
    expect(isVersionSkipped(settings, '0.2.0')).toBe(false);
  });

  it('does not match when nothing was skipped', () => {
    expect(isVersionSkipped(baseSettings, '0.2.0')).toBe(false);
  });
});

describe('applyRemindLater', () => {
  it('sets nextCheckAt to now plus the 30-day window', () => {
    const updated = applyRemindLater(baseSettings, 1000);
    expect(updated.nextCheckAt).toBe(1000 + REMIND_MS);
    // Other fields are preserved
    expect(updated.includePrerelease).toBe(baseSettings.includePrerelease);
    expect(updated.checkForUpdatesAutomatically).toBe(true);
  });
});
