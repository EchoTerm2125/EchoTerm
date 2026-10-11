// Unit tests for terminal.js — Reconnect confirmation wiring
// The Reconnect confirmation is suppressible via the skipReconnectConfirm
// setting (CONTEXT.md: Reconnect confirmation); the failure summary is not.
import { vi } from 'vitest';
import { resetTestEnv, loadModules, getApp, injectTerminal, injectGroup } from '../setup.js';

describe('Reconnect confirmation (terminal.js)', () => {
  let App;

  beforeEach(async () => {
    await resetTestEnv();
    // terminal.js depends on tabs, ui, groups
    await loadModules('terminal', 'tabs', 'ui', 'groups');
    App = getApp();
    injectGroup('g1', 'Group 1');
    App.state.activeGroupId = 'g1';
    App.Menus = { showConfirm: vi.fn() };
  });

  function setupSsh(id, overrides = {}) {
    injectTerminal(id, { shell: 'ssh', connectionId: `conn-${id}`, host: `host-${id}`, ...overrides });
    App.state.terminalGroups.set(id, 'g1');
    App.state.groups.get('g1').terminalIds.add(id);
  }

  it('a live pane asks for confirmation under the suppressible key', () => {
    setupSsh(1);

    App.Terminal.requestReconnect(1);

    expect(App.Menus.showConfirm).toHaveBeenCalledTimes(1);
    expect(App.Menus.showConfirm.mock.calls[0][2]).toBe('skipReconnectConfirm');
  });

  it('an exited pane reconnects without asking', () => {
    setupSsh(1, { _exited: true });

    App.Terminal.requestReconnect(1);

    expect(App.Menus.showConfirm).not.toHaveBeenCalled();
    expect(window.api.sshReconnect).toHaveBeenCalledWith(1, 'conn-1');
  });

  it('the batch confirm uses the same suppressible key', () => {
    setupSsh(1);
    setupSsh(2);

    App.Terminal.reconnectTabs([1, 2]);

    expect(App.Menus.showConfirm).toHaveBeenCalledTimes(1);
    expect(App.Menus.showConfirm.mock.calls[0][2]).toBe('skipReconnectConfirm');
  });

  it('the failure summary is never suppressible', async () => {
    setupSsh(1);
    vi.mocked(window.api.sshReconnect).mockResolvedValueOnce({ error: 'boom' });
    App.Menus.showConfirm.mockImplementation((_msg, cb) => cb());

    App.Terminal.reconnectTabs([1]);
    await vi.waitFor(() => expect(App.Menus.showConfirm).toHaveBeenCalledTimes(2));

    expect(App.Menus.showConfirm.mock.calls[1][2]).toBeNull();
  });
});
