// Unit tests for src/domain/services/ssh-args.ts
import { buildSshArgs } from '../../src/domain/services/ssh-args';

describe('buildSshArgs', () => {
  it('points ssh at the per-session config file and the session alias', () => {
    const args = buildSshArgs('C:\\Temp\\echoterm-ab12\\echoterm-session-7.conf', 'echoterm-session-7');
    expect(args).toEqual(['-F', 'C:\\Temp\\echoterm-ab12\\echoterm-session-7.conf', 'echoterm-session-7']);
  });

  it('handles a path with spaces without any quoting', () => {
    const args = buildSshArgs('C:\\Users\\John Doe\\AppData\\Local\\Temp\\echoterm-x\\s.conf', 'echoterm-session-1');
    expect(args).toEqual([
      '-F', 'C:\\Users\\John Doe\\AppData\\Local\\Temp\\echoterm-x\\s.conf', 'echoterm-session-1',
    ]);
  });
});
