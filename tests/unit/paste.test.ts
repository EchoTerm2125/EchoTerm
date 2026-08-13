// Unit tests for bracketed-paste handling in terminal.js
import { resetTestEnv, loadModules, getApp, injectTerminal, injectGroup } from '../setup.js';

describe('Paste bracketing (terminal.js)', () => {
  let App;

  beforeEach(async () => {
    await resetTestEnv();
    await loadModules('terminal');
    App = getApp();

    injectGroup('g1', 'Group 1');
    App.state.activeGroupId = 'g1';
  });

  it('wraps paste in bracketed markers when the app enabled bracketed paste and no prompt is active', () => {
    const entry = injectTerminal(1);
    entry.term.modes = { bracketedPasteMode: true };

    App.Terminal.pasteToTerminal(1, 'hello');

    expect(App.api.write).toHaveBeenCalledWith(1, '\x1b[200~hello\x1b[201~');
  });

  it('sends paste raw when the app never enabled bracketed paste', () => {
    const entry = injectTerminal(1);
    entry.term.modes = { bracketedPasteMode: false };

    App.Terminal.pasteToTerminal(1, 'hello');

    expect(App.api.write).toHaveBeenCalledWith(1, 'hello');
  });

  it('sends paste raw while a password prompt is active', () => {
    const entry = injectTerminal(1);
    entry.term.modes = { bracketedPasteMode: true };

    App.Terminal.noteOutput(1, '[sudo] password for user: ');
    expect(entry.pwPrompt).toBe(true);

    App.Terminal.pasteToTerminal(1, 'secret');

    expect(App.api.write).toHaveBeenCalledWith(1, 'secret');
  });

  it('tracks passphrase prompts as well', () => {
    const entry = injectTerminal(1);

    App.Terminal.noteOutput(1, "Enter passphrase for key '/home/u/.ssh/id_rsa': ");

    expect(entry.pwPrompt).toBe(true);
  });

  it('ignores ANSI escape sequences when detecting the prompt', () => {
    const entry = injectTerminal(1);

    App.Terminal.noteOutput(1, '\x1b[?2004h\x1b[1m[sudo] password for user: \x1b[0m');

    expect(entry.pwPrompt).toBe(true);
  });

  it('clears the password-prompt state once non-prompt output arrives', () => {
    const entry = injectTerminal(1);

    App.Terminal.noteOutput(1, '[sudo] password for user: ');
    expect(entry.pwPrompt).toBe(true);

    App.Terminal.noteOutput(1, 'ls\r\nfile1\r\n');

    expect(entry.pwPrompt).toBe(false);
  });
});
