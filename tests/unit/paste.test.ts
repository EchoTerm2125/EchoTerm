// Unit tests for bracketed-paste handling in terminal.js
import { resetTestEnv, loadModules, setupTest, getApp, injectTerminal, injectGroup } from '../setup.js';

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

  it('normalizes CRLF line endings to LF before writing', () => {
    injectTerminal(1);

    App.Terminal.pasteToTerminal(1, 'a\r\nb\r\nc');

    expect(App.api.write).toHaveBeenCalledWith(1, 'a\nb\nc');
  });

  it('normalizes bare CR line endings to LF before writing', () => {
    injectTerminal(1);

    App.Terminal.pasteToTerminal(1, 'a\rb\rc');

    expect(App.api.write).toHaveBeenCalledWith(1, 'a\nb\nc');
  });
});

describe('Paste event with the multi-line confirm disabled', () => {
  let App;

  /** Dispatch a real (capture-phase) paste event on a spawned terminal. */
  async function dispatchPaste(text) {
    const id = await App.Terminal.spawnTerminal('powershell');
    const entry = App.state.terminals.get(id);
    const xtermDiv = entry.paneEl.querySelector('.xterm-container');

    const ev = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'clipboardData', { value: { getData: () => text } });
    xtermDiv.dispatchEvent(ev);
    return { id, ev };
  }

  beforeEach(async () => {
    App = await setupTest('terminal', 'tabs', 'groups', 'ui', 'echo', 'menus');
    injectGroup('g1', 'Group 1');
    App.state.activeGroupId = 'g1';
  });

  it('writes the raw multi-line text exactly once when skipPastePreview is true', async () => {
    localStorage.setItem('skipPastePreview', 'true');

    const { id, ev } = await dispatchPaste('line1\nline2\nline3');

    // The paste must be intercepted (browser default suppressed) and the raw
    // text written verbatim — no newline rewriting, no double delivery.
    expect(ev.defaultPrevented).toBe(true);
    expect(App.api.write).toHaveBeenCalledTimes(1);
    expect(App.api.write).toHaveBeenCalledWith(id, 'line1\nline2\nline3');

    // The confirm dialog must not appear.
    expect(document.getElementById('pastePreviewDialog').classList.contains('hidden')).toBe(true);
  });

  it('shows the confirm dialog instead of writing when skipPastePreview is not set', async () => {
    const { ev } = await dispatchPaste('line1\nline2\nline3');

    expect(ev.defaultPrevented).toBe(true);
    expect(App.api.write).not.toHaveBeenCalled();
    expect(document.getElementById('pastePreviewDialog').classList.contains('hidden')).toBe(false);
  });

  it('leaves single-line pastes to the native handler (no intercept)', async () => {
    localStorage.setItem('skipPastePreview', 'true');

    const { ev } = await dispatchPaste('single-line');

    expect(ev.defaultPrevented).toBe(false);
    expect(App.api.write).not.toHaveBeenCalled();
    expect(document.getElementById('pastePreviewDialog').classList.contains('hidden')).toBe(true);
  });

  it('normalizes CRLF from the paste event before writing', async () => {
    localStorage.setItem('skipPastePreview', 'true');

    const { id, ev } = await dispatchPaste('a\r\nb\r\nc');

    expect(ev.defaultPrevented).toBe(true);
    expect(App.api.write).toHaveBeenCalledTimes(1);
    expect(App.api.write).toHaveBeenCalledWith(id, 'a\nb\nc');
  });

  it('normalizes CRLF read from the clipboard on right-click paste', async () => {
    localStorage.setItem('skipPastePreview', 'true');
    localStorage.setItem('skipRightClickPaste', 'false');
    (navigator.clipboard.readText as any).mockResolvedValue('x\r\ny\r\nz');

    const id = await App.Terminal.spawnTerminal('powershell');
    const entry = App.state.terminals.get(id);
    const xtermDiv = entry.paneEl.querySelector('.xterm-container');

    const ev = new Event('contextmenu', { bubbles: true, cancelable: true });
    xtermDiv.dispatchEvent(ev);
    await new Promise((r) => setTimeout(r, 0));

    expect(App.api.write).toHaveBeenCalledWith(id, 'x\ny\nz');
  });

  it('normalizes CRLF in echo-mode paste before writing to every selected terminal', async () => {
    localStorage.setItem('skipPastePreview', 'true');

    const id = await App.Terminal.spawnTerminal('powershell');
    const entry = App.state.terminals.get(id);
    const xtermDiv = entry.paneEl.querySelector('.xterm-container');

    // Enable echo mode with this terminal selected (echo branch writes directly).
    App.state.echoModeActive = true;
    App.state.echoSelection.add(id);

    const ev = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'clipboardData', { value: { getData: () => 'a\r\nb\r\nc' } });
    xtermDiv.dispatchEvent(ev);

    expect(ev.defaultPrevented).toBe(true);
    expect(App.api.write).toHaveBeenCalledTimes(1);
    expect(App.api.write).toHaveBeenCalledWith(id, 'a\nb\nc');
  });

  it('normalizes CRLF in echo-mode paste on an SSH terminal before writing', async () => {
    localStorage.setItem('skipPastePreview', 'true');

    // spawnSshTerminal attaches its own paste listener with the same echo
    // branch; it must normalize too (its text never passes through pasteToTerminal).
    const id = await App.Terminal.spawnSshTerminal({ id: 99, label: 'myhost', host: 'myhost' });
    const entry = App.state.terminals.get(id);
    const xtermDiv = entry.paneEl.querySelector('.xterm-container');

    App.state.echoModeActive = true;
    App.state.echoSelection.add(id);

    const ev = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'clipboardData', { value: { getData: () => 'a\r\nb\r\nc' } });
    xtermDiv.dispatchEvent(ev);

    expect(ev.defaultPrevented).toBe(true);
    expect(App.api.write).toHaveBeenCalledTimes(1);
    expect(App.api.write).toHaveBeenCalledWith(id, 'a\nb\nc');
  });
});
