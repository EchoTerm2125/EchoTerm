/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Session snapshot & Restore
   The layout is remembered as a plain snapshot in userData and rebuilt on the
   next launch as Dormant panes: tabs and boxes appear, sessions start only when
   a Pane is first shown (or Connect is pressed). See docs/adr/0017.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';
  const state = App.state;
  const api = App.api;

  const SAVE_DELAY_MS = 400;
  const MAX_GROUPS = 50;
  const MAX_PANES_PER_GROUP = 100;
  const MAX_PANES_TOTAL = 200;
  const SHELLS = ['powershell', 'cmd', 'gitbash', 'ssh'];

  let saveTimer = null;
  let warnedSaveFailure = false;
  let restoring = false;
  let restoreAttempted = false;
  let lastWrittenJson = '';

  // Turning the setting off stops the recording too (ADR 0017): a snapshot the
  // user opted out of is not rewritten behind their back.
  function isEnabled() {
    return localStorage.getItem('restoreSession') !== 'false';
  }

  // ─── Writing ───────────────────────────────────────────────────────────────

  // A Pane's own name, when it differs from the Connection's default one. The
  // Connection name itself is resolved from live data at Restore, so renaming
  // the Connection also renames Panes that were never renamed individually.
  function renamedOf(termState) {
    return termState.customName && termState.customName !== termState.label
      ? termState.customName
      : null;
  }

  function buildSnapshot() {
    const groups = state.groupOrder.map((gid) => {
      const group = state.groups.get(gid);
      const ids = App.Groups.getGroupTerminalIds(gid);
      const savedEchoSelection = state.groupEchoSelection.get(gid);

      const panes = [];
      for (const id of ids) {
        const t = state.terminals.get(id);
        if (!t) continue;
        const pane: any = { shell: t.shell };
        if (t.shell === 'ssh' && t.connectionId) pane.connectionId = t.connectionId;
        const renamed = renamedOf(t);
        if (renamed) pane.customName = renamed;
        // Absent selection means "all", matching Echo's own default.
        pane.echo = savedEchoSelection ? savedEchoSelection.has(id) : true;
        panes.push(pane);
      }

      const activeId = gid === state.activeGroupId
        ? (state.activeTerminalId ?? state.groupActiveTerminal.get(gid))
        : state.groupActiveTerminal.get(gid);
      const activeIdx = activeId !== undefined ? ids.indexOf(activeId) : -1;
      return {
        name: group ? group.name : '',
        activePane: activeIdx >= 0 ? activeIdx : (panes.length > 0 ? 0 : null),
        echoActive: !!state.groupEchoActive.get(gid) && panes.length >= 2,
        panes,
      };
    });

    return {
      version: 1 as const,
      activeGroup: Math.max(0, state.groupOrder.indexOf(state.activeGroupId)),
      groups,
    };
  }

  function writeSnapshot() {
    if (!isEnabled()) return;
    try {
      const snapshot = buildSnapshot();
      const json = JSON.stringify(snapshot);
      if (json === lastWrittenJson) return;
      lastWrittenJson = json;
      api.sessionSave(snapshot);
    } catch (err) {
      // Snapshotting must never break the UI it is recording.
      console.error('Session snapshot failed:', err);
    }
  }

  function scheduleSave() {
    if (restoring) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      writeSnapshot();
    }, SAVE_DELAY_MS);
  }

  // Write right now. Used when the setting is switched back on and before the
  // window closes, where the debounce would be lost.
  function saveNow() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    lastWrittenJson = '';
    writeSnapshot();
  }

  // ─── Restore ───────────────────────────────────────────────────────────────

  function normalizeShell(value) {
    return typeof value === 'string' && SHELLS.includes(value) ? value : 'powershell';
  }

  function groupName(record, index) {
    const name = record && typeof record.name === 'string' ? record.name.trim() : '';
    return name || App.__('groupDefaultName', { n: index + 1 });
  }

  interface ConnectionView {
    id?: string;
    name?: string;
    host?: string;
    username?: string | null;
  }

  /**
   * Rebuild the remembered layout as Dormant panes. Runs once per launch, after
   * the SSH panel has had its chance to unlock the vault: a locked vault means
   * no Restore, and the caller keeps the default Pane.
   */
  async function restore(defaultPaneId) {
    if (restoreAttempted) return;
    restoreAttempted = true;
    if (!isEnabled()) return;

    let loaded;
    try {
      loaded = await api.sessionLoad();
    } catch {
      return;
    }
    if (loaded && loaded.corrupt) {
      App.UI.showToast(App.__('toastRestoreFailed'));
      return;
    }

    const snapshot = loaded && loaded.snapshot;
    if (!snapshot || !Array.isArray(snapshot.groups) || snapshot.groups.length === 0) return;

    // Q20: Restore only once the SSH data is readable. Cancelling the unlock
    // dialog is a deliberate "skip this launch", so say so once.
    let status;
    try {
      status = await api.sshPasswordStatus();
    } catch {
      return;
    }
    if (!status || !status.unlocked) {
      App.UI.showToast(App.__('toastRestoreSkippedLocked'));
      return;
    }

    const groups = snapshot.groups.slice(0, MAX_GROUPS).map((record) => {
      const panes = Array.isArray(record && record.panes)
        ? record.panes.slice(0, MAX_PANES_PER_GROUP)
        : [];
      return { record, panes };
    });

    const totalPanes = Math.min(
      groups.reduce((sum, entry) => sum + entry.panes.length, 0),
      MAX_PANES_TOTAL,
    );
    if (totalPanes === 0) return;

    // Titles come from live Connection data — the snapshot holds only ids.
    let connections: ConnectionView[];
    try {
      connections = await api.sshConnectionList();
    } catch {
      connections = [];
    }
    const byId = new Map((connections || []).map(c => [c.id, c]));

    let ids;
    try {
      ids = await api.sessionReserveIds(totalPanes);
    } catch {
      return;
    }
    if (!Array.isArray(ids) || ids.length < totalPanes) return;

    restoring = true;
    App.Terminal.setSuppressAutoConnect(true);
    try {
      if (defaultPaneId !== null && defaultPaneId !== undefined) {
        App.Terminal.closeTerminal(defaultPaneId);
      }
      App.Groups.resetForRestore();

      const groupIds = groups.map((entry, index) =>
        App.Groups.createGroup(groupName(entry.record, index), index === 0));

      let cursor = 0;
      groups.forEach((entry, index) => {
        const gid = groupIds[index].id;
        const mounted = [];

        for (const pane of entry.panes) {
          if (cursor >= totalPanes) break;
          const shell = normalizeShell(pane && pane.shell);
          const id = ids[cursor++];

          let label = null;
          let host = null;
          let username = null;
          let connectionId = null;
          if (shell === 'ssh') {
            connectionId = pane && typeof pane.connectionId === 'string' ? pane.connectionId : null;
            const conn = connectionId ? byId.get(connectionId) : null;
            if (conn) {
              label = conn.name || null;
              host = conn.host || null;
              username = conn.username || null;
            } else {
              // The Connection was deleted after the snapshot was written; the
              // Pane keeps its place until the user closes it.
              label = App.__('paneDeletedConnection');
            }
          }

          App.Terminal.mountPane({
            id,
            shell,
            label,
            host,
            username,
            connectionId,
            customName: pane && typeof pane.customName === 'string' ? pane.customName : null,
            dormant: true,
            groupId: gid,
            echo: !pane || pane.echo !== false,
          });
          mounted.push({ id, echo: !pane || pane.echo !== false });
        }

        state.groupEchoActive.set(gid, !!(entry.record && entry.record.echoActive) && mounted.length >= 2);

        const activeIdx = entry.record && Number.isInteger(entry.record.activePane)
          ? entry.record.activePane
          : 0;
        const active = mounted[activeIdx] || mounted[0];
        if (active) state.groupActiveTerminal.set(gid, active.id);

        // Expressed in the new ids so Echo can restore this Group's selection.
        state.groupEchoSelection.set(gid, new Set(mounted.filter(p => p.echo).map(p => p.id)));
        state.groupEchoTerminals.set(gid, new Set(mounted.map(p => p.id)));
      });

      const activeIdx = Number.isInteger(snapshot.activeGroup) ? snapshot.activeGroup : 0;
      const targetGroup = (groupIds[activeIdx] || groupIds[0]).id;
      // Force switchGroup to run its restore path.
      state.activeGroupId = null;
      App.Groups.switchGroup(targetGroup);
      App.Groups.updateGroupTabs();
    } catch (err) {
      console.error('Restore failed:', err);
    } finally {
      restoring = false;
      App.Terminal.setSuppressAutoConnect(false);
    }

    // Only now may the visible Panes of the Active group start their sessions.
    App.Terminal.autoConnectVisible();
    App.UI.updateStatusBar();
    scheduleSave();
  }

  // ─── Wiring ────────────────────────────────────────────────────────────────
  // A failed write is reported once per launch: the same full disk or locked
  // file must not toast on every layout change.
  if (api.onSessionSaveError) {
    state.dataUnsubscribers.push(api.onSessionSaveError(() => {
      if (warnedSaveFailure) return;
      warnedSaveFailure = true;
      App.UI.showToast(App.__('toastSnapshotSaveFailed'));
    }));
  }

  window.addEventListener('beforeunload', () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    writeSnapshot();
  });

  App.Session = {
    isEnabled,
    buildSnapshot,
    scheduleSave,
    saveNow,
    restore,
  };
})();

export {};
