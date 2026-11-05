// Unit tests for src/domain/services/ssh-args.ts
import { buildSshArgs } from '../../src/domain/services/ssh-args';

describe('buildSshArgs', () => {
  it('points ssh at the per-session config file and the real target host', () => {
    const args = buildSshArgs('C:\\Temp\\echoterm-ab12\\echoterm-session-7.conf', 'example.com');
    expect(args).toEqual(['-F', 'C:\\Temp\\echoterm-ab12\\echoterm-session-7.conf', 'example.com']);
  });

  it('handles a path with spaces without any quoting', () => {
    const args = buildSshArgs('C:\\Users\\John Doe\\AppData\\Local\\Temp\\echoterm-x\\s.conf', 'example.com');
    expect(args).toEqual([
      '-F', 'C:\\Users\\John Doe\\AppData\\Local\\Temp\\echoterm-x\\s.conf', 'example.com',
    ]);
  });
});
