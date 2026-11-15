// Unit tests for renderer/session.ts — Session snapshot writing and Restore
// Restore rebuilds the remembered layout as Dormant panes: nothing connects
// until a Pane is shown (docs/adr/0017).
import { vi } from 'vitest';
import { resetTestEnv, loadModules, getApp, injectTerminal } from '../setup.js';

describe('Session snapshot (session.js)', () => {
  let App;

  beforeEach(async () => {
    await resetTestEnv();
    // session.js depends on groups/tabs/terminal for both writing and Restore
    await loadModules('menus', 'ui', 'groups', 'echo', 'tabs', 'terminal', 'session');
    App = getApp();
    localStorage.setItem('restoreSession', 'true');
  });

  function addGroupWithPanes() {
    const g1 = App.Groups.createGroup('Work', true);

    // injectTerminal already appends to paneOrder
    const local = injectTerminal(1, { customName: 'Build' });
    App.state.terminalGroups.set(1, g1.id);
    g1.terminalIds.add(1);

    const ssh = injectTerminal(2, {
      shell: 'ssh', connectionId: 'conn-a', label: 'Prod', host: 'h1', username: 'u',
    });
    App.state.terminalGroups.set(2, g1.id);
    g1.terminalIds.add(2);

    return { g1, local, ssh };
  }

  it('records groups, pane order, renames and Connection ids', () => {
    const { g1 } = addGroupWithPanes();
    App.state.groupActiveTerminal.set(g1.id, 2);

    const snapshot = App.Session.buildSnapshot();

    expect(snapshot.version).toBe(1);
    expect(snapshot.activeGroup).toBe(0);
    expect(snapshot.groups).toHaveLength(1);
    expect(snapshot.groups[0].name).toBe('Work');
    expect(snapshot.groups[0].activePane).toBe(1);
    expect(snapshot.groups[0].panes).toEqual([
      { shell: 'powershell', customName: 'Build', echo: true },
      { shell: 'ssh', connectionId: 'conn-a', echo: true },
    ]);
  });

  it('does not store an SSH pane name that is just the Connection name', () => {
    const { ssh } = addGroupWithPanes();
    ssh.customName = (ssh as any).label;

    const pane = App.Session.buildSnapshot().groups[0].panes[1];
    expect(pane.customName).toBeUndefined();
  });

  it('writes the snapshot once after the debounce', async () => {
    vi.useFakeTimers();
    try {
      // Past the startup no-write window: Restore has run (nothing to restore).
      await App.Session.restore(null);
      addGroupWithPanes();
      vi.advanceTimersByTime(500); // flush the writes the setup itself scheduled
      (window.api as any).sessionSave.mockClear();

      // A changed layout is what makes the write observable: identical
      // snapshots are skipped on purpose.
      App.Groups.renameGroup(App.state.groupOrder[0], 'Renamed');
      App.Session.scheduleSave();
      App.Session.scheduleSave();
      expect((window.api as any).sessionSave).not.toHaveBeenCalled();
      vi.advanceTimersByTime(500);
      expect((window.api as any).sessionSave).toHaveBeenCalledTimes(1);
      expect((window.api as any).sessionSave.mock.calls[0][0].groups[0].name).toBe('Renamed');
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not write a snapshot before Restore has run', () => {
    vi.useFakeTimers();
    try {
      // The bootstrap Group and Pane each schedule a debounced save.
      addGroupWithPanes();
      vi.advanceTimersByTime(500);
      expect((window.api as any).sessionSave).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not flush the snapshot when the window closes before Restore has run', () => {
    addGroupWithPanes();
    window.dispatchEvent(new Event('beforeunload'));
    expect((window.api as any).sessionSave).not.toHaveBeenCalled();
  });

  it('restores the remembered layout when the unlock outlasts the debounce', async () => {
    (window.api as any).sessionLoad.mockResolvedValue({
      snapshot: {
        version: 1,
        activeGroup: 0,
        groups: [{
          name: 'Servers', activePane: 0, echoActive: false,
          panes: [{ shell: 'ssh', connectionId: 'c1', echo: true }],
        }],
      },
    });
    (window.api as any).sshConnectionList.mockResolvedValue([
      { id: 'c1', name: 'Prod', host: 'h1', username: 'u' },
    ]);
    (window.api as any).sshConnect.mockResolvedValue({
      id: 101, shell: 'ssh', label: 'Prod', host: 'h1', username: 'u', connectionId: 'c1',
    });
    (window.api as any).sessionReserveIds.mockResolvedValue([101]);

    vi.useFakeTimers();
    try {
      // Bootstrap happens before the unlock dialog is answered.
      App.Groups.createGroup('Default', true);
      const defaultId = await App.Terminal.spawnTerminal('powershell');

      // The user is still typing the master password when the debounce fires.
      vi.advanceTimersByTime(500);
      expect((window.api as any).sessionSave).not.toHaveBeenCalled();

      await App.Session.restore(defaultId);

      expect([...App.state.groups.values()].map(g => g.name)).toEqual(['Servers']);
      expect(App.state.terminals.has(defaultId)).toBe(false);

      // Once Restore has run, the rebuilt layout is what gets written.
      vi.advanceTimersByTime(500);
      const saved = (window.api as any).sessionSave.mock.calls
        .map((call) => call[0]).at(-1);
      expect(saved.groups[0].name).toBe('Servers');
      expect(saved.groups[0].panes).toEqual([{ shell: 'ssh', connectionId: 'c1', echo: true }]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('stops recording while the setting is off', () => {
    addGroupWithPanes();
    localStorage.setItem('restoreSession', 'false');
    App.Session.saveNow();
    expect((window.api as any).sessionSave).not.toHaveBeenCalled();
  });

  it('restores the layout as Dormant panes and connects only the visible one', async () => {
    (window.api as any).sessionLoad.mockResolvedValue({
      snapshot: {
        version: 1,
        activeGroup: 1,
        groups: [
          { name: 'Work', activePane: 0, echoActive: false, panes: [{ shell: 'powershell', echo: true }] },
          {
            name: 'Servers',
            activePane: 0,
            echoActive: false,
            panes: [
              { shell: 'ssh', connectionId: 'c1', echo: true },
              { shell: 'ssh', connectionId: 'gone', echo: true },
            ],
          },
        ],
      },
    });
    (window.api as any).sshConnectionList.mockResolvedValue([
      { id: 'c1', name: 'Prod', host: 'h1', username: 'u' },
    ]);
    (window.api as any).sessionReserveIds.mockResolvedValue([101, 102, 103]);

    App.Groups.createGroup('Default', true);
    const defaultId = await App.Terminal.spawnTerminal('powershell');

    await App.Session.restore(defaultId);

    // The bootstrap pane is gone; the remembered Groups replace it.
    expect(App.state.terminals.has(defaultId)).toBe(false);
    expect([...App.state.groups.values()].map(g => g.name)).toEqual(['Work', 'Servers']);
    expect(App.state.activeGroupId).toBe(App.state.groupOrder[1]);

    // Every restored Pane exists; only the visible one of the Active group has
    // started a session, the others stay Dormant until they are shown.
    expect(App.state.terminals.size).toBe(3);
    expect((window.api as any).spawnTerminal).toHaveBeenCalledTimes(1); // the bootstrap pane only

    expect((window.api as any).sshConnect).toHaveBeenCalledWith('c1', 102);
    expect(App.state.terminals.get(102)._dormant).toBe(false);
    expect(App.state.terminals.get(103)._dormant).toBe(true);
    expect(App.state.terminals.get(101)._dormant).toBe(true);
  });

  it('marks a Pane whose Connection was deleted', async () => {
    (window.api as any).sessionLoad.mockResolvedValue({
      snapshot: {
        version: 1,
        activeGroup: 0,
        groups: [{ name: 'Gone', panes: [{ shell: 'ssh', connectionId: 'missing', echo: true }] }],
      },
    });
    (window.api as any).sessionReserveIds.mockResolvedValue([201]);
    (window.api as any).sshConnect.mockResolvedValue({
      error: 'Connection not found.', errorCode: 'CONNECTION_NOT_FOUND',
    });
    vi.spyOn(App.UI, 'showToast').mockImplementation(() => {});

    App.Groups.createGroup('Default', true);
    const defaultId = await App.Terminal.spawnTerminal('powershell');
    await App.Session.restore(defaultId);

    await vi.waitFor(() => expect((window.api as any).sshConnect).toHaveBeenCalledWith('missing', 201));
    const pane = App.state.terminals.get(201);
    expect(pane._dormant).toBe(true);
    expect(App.Terminal.paneName(pane)).toBe(App.__('paneDeletedConnection'));
  });

  it('skips Restore and warns once when the SSH data is locked', async () => {
    (window.api as any).sessionLoad.mockResolvedValue({
      snapshot: { version: 1, activeGroup: 0, groups: [{ name: 'Work', panes: [{ shell: 'powershell' }] }] },
    });
    (window.api as any).sshPasswordStatus.mockResolvedValue({ masterPasswordSet: true, unlocked: false });
    const toast = vi.spyOn(App.UI, 'showToast').mockImplementation(() => {});

    App.Groups.createGroup('Default', true);
    const defaultId = await App.Terminal.spawnTerminal('powershell');
    await App.Session.restore(defaultId);

    expect((window.api as any).sessionReserveIds).not.toHaveBeenCalled();
    expect(App.state.terminals.has(defaultId)).toBe(true);
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast.mock.calls[0][0]).toBe(App.__('toastRestoreSkippedLocked'));
  });

  it('warns when the stored snapshot is corrupt', async () => {
    (window.api as any).sessionLoad.mockResolvedValue({ snapshot: null, corrupt: true });
    const toast = vi.spyOn(App.UI, 'showToast').mockImplementation(() => {});

    App.Groups.createGroup('Default', true);
    const defaultId = await App.Terminal.spawnTerminal('powershell');
    await App.Session.restore(defaultId);

    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast.mock.calls[0][0]).toBe(App.__('toastRestoreFailed'));
  });

  it('does nothing at all when the setting is off', async () => {
    localStorage.setItem('restoreSession', 'false');
    App.Groups.createGroup('Default', true);
    const defaultId = await App.Terminal.spawnTerminal('powershell');

    await App.Session.restore(defaultId);

    expect((window.api as any).sessionLoad).not.toHaveBeenCalled();
    expect(App.state.terminals.has(defaultId)).toBe(true);
  });
});

describe('Dormant pane Connect', () => {
  let App;

  beforeEach(async () => {
    await resetTestEnv();
    await loadModules('menus', 'ui', 'groups', 'echo', 'tabs', 'terminal', 'session');
    App = getApp();
  });

  it('starts the session under the reserved id and turns the Pane live', async () => {
    (window.api as any).sshConnect.mockResolvedValue({
      id: 300, shell: 'ssh', label: 'Prod', host: 'h1', username: 'u', connectionId: 'c1',
    });

    App.Groups.createGroup('G', true);
    const pane = App.Terminal.mountPane({
      id: 300, shell: 'ssh', label: 'Prod', host: 'h1', username: 'u',
      connectionId: 'c1', dormant: true,
    });

    expect(pane._dormant).toBe(true);
    expect(pane.paneEl.querySelector('.pane-dormant-notice')).not.toBeNull();

    const connected = await App.Terminal.connectPane(300);

    expect(connected).toBe(true);
    expect((window.api as any).sshConnect).toHaveBeenCalledWith('c1', 300);
    expect(App.state.terminals.get(300)._dormant).toBe(false);
    expect(App.state.terminals.get(300).paneEl.querySelector('.pane-dormant-notice')).toBeNull();
  });

  it('keeps the Pane dormant and reports a deleted Connection', async () => {
    (window.api as any).sshConnect.mockResolvedValue({
      error: 'Connection not found.', errorCode: 'CONNECTION_NOT_FOUND',
    });
    const toast = vi.spyOn(App.UI, 'showToast').mockImplementation(() => {});

    App.Groups.createGroup('G', true);
    App.Terminal.mountPane({
      id: 301, shell: 'ssh', label: 'Gone', connectionId: 'missing', dormant: true,
    });

    const connected = await App.Terminal.connectPane(301);

    expect(connected).toBe(false);
    expect(App.state.terminals.get(301)._dormant).toBe(true);
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast.mock.calls[0][0]).toBe(App.__('toastSshError', {
      message: App.__('errorConnectionNotFound'),
    }));
  });

  it('auto-connects a Dormant pane when it becomes the visible one', async () => {
    (window.api as any).spawnTerminal.mockResolvedValue({ id: 302, shell: 'powershell' });

    const group = App.Groups.createGroup('G', true);
    App.state.activeGroupId = group.id;
    App.Terminal.mountPane({ id: 302, shell: 'powershell', dormant: true });

    App.Terminal.focusTerminal(302);

    expect((window.api as any).spawnTerminal).toHaveBeenCalledWith('powershell', 302);
  });
});
