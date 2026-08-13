/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Shared State & Constants
   ═══════════════════════════════════════════════════════════════════════════ */

import { getIpcClient } from './ipc-client';

(function () {
  'use strict';

  // ─── State ─────────────────────────────────────────────────────────────────
  const state = {
    terminals: new Map(),       // id -> { id, shell, term (xterm), fitAddon, paneEl, titlebar }
    paneOrder: [],              // ordered array of terminal IDs
    activeTerminalId: null,
    selectedShell: 'powershell',
    echoSelection: new Set(), // set of terminal IDs selected for echo
    echoModeActive: false,     // unified split+echo to all mode
    dataUnsubscribers: [],      // cleanup functions
    splitInstance: null,
    gridSplits: [],             // array of Split instances for nested grid layout
    groups: new Map(),          // groupId -> { id, name, terminalIds: Set }
    terminalGroups: new Map(),  // terminalId -> groupId
    groupOrder: [],             // ordered array of group IDs
    activeGroupId: null,
    groupEchoActive: new Map(), // groupId -> boolean (echo state per group)
    groupEchoSelection: new Map(), // groupId -> Set of terminal IDs selected for echo
    groupEchoTerminals: new Map(), // groupId -> Set of terminal IDs that were in the group when selection was saved
    selectedTabs: new Set(),       // set of tab IDs currently multi-selected
    lastClickedTabId: null,        // for shift-click range selection
    selectedGroups: new Set(),     // set of group IDs currently multi-selected
    lastClickedGroupId: null,      // for shift-click range selection on groups
    isRenaming: false,             // true while inline rename input is open
  };

  const nextGroupId = 1;
  const gitBashPath = null;

  // ─── DOM helper ────────────────────────────────────────────────────────────
  const $ = (sel: string): any => document.querySelector(sel);

  // ─── DOM refs ───────────────────────────────────────────────────────────────
  const container = $('#terminal-container');
  const tabList = $('#tabList');
  const btnNewTerminal = $('#btnNewTerminal');
  const btnNewTermDropdown = $('#btnNewTermDropdown');
  const newTermDropdown = $('#newTermDropdown');
  const btnEchoMode = $('#btnEchoMode');
  const btnEchoAll = $('#btnEchoAll');
  const btnEchoToggle = $('#btnEchoToggle');
  const btnEchoPaste = $('#btnEchoPaste');
  const groupList = $('#groupList');
  const btnNewGroup = $('#btnNewGroup');
  const gitBashStatus = $('#gitBashStatus');
  const statusTerminalCount = $('#statusTerminalCount');
  const statusEcho = $('#statusEcho');
  const statusShell = $('#statusShell');
  const btnSettings = $('#btnSettings');
  const optionsPanel = $('#optionsPanel');
  const optTabCloseConfirm = $('#optTabCloseConfirm');
  const optWindowCloseConfirm = $('#optWindowCloseConfirm');
  const optGroupCloseConfirm = $('#optGroupCloseConfirm');
  const optSshJumpWarn = $('#optSshJumpWarn');
  const optPastePreview = $('#optPastePreview');
  const optRightClickPaste = $('#optRightClickPaste');
  const tabCtxMoveSep = $('#tabCtxMoveSep');
  const tabCtxMoveItem = $('#tabCtxMoveItem');
  const tabCtxGroupSubmenu = $('#tabCtxGroupSubmenu');

  // ─── Tab icon mapping ─────────────────────────────────────────────────────
  const TAB_ICONS = {
    powershell: '⬡',
    cmd: '❯',
    gitbash: '$',
    ssh: '🖥️',
  };

  // ─── Shell config ───────────────────────────────────────────────────────────
  // Maps shell keys to i18n translation keys (resolved via App.getShellName)
  const SHELL_LABELS = {
    powershell: 'shellPowerShell',
    cmd: 'shellCmd',
    gitbash: 'shellGitBash',
    ssh: 'shellSsh',
  };

  /** Resolve a shell key to its translated display name. */
  function getShellName(shellKey) {
    // Use the existing __ function if available, otherwise fall back to the key mapping
    if (window.App && window.App.__) {
      return window.App.__(SHELL_LABELS[shellKey] || shellKey);
    }
    // Fallback for before i18n loads (shouldn't happen in practice)
    const fallback = { powershell: 'PowerShell', cmd: 'CMD', gitbash: 'Git Bash', ssh: 'SSH' };
    return fallback[shellKey] || shellKey;
  }

  // ─── Expose on window.App ─────────────────────────────────────────────────
  // Preserve any existing App properties (e.g. i18n loaded before us)
  const existingApp: AppGlobal = window.App || ({} as AppGlobal);
  window.App = {
    ...existingApp,
    state,
    $,
    __: existingApp.__ || ((k, _p) => k),
    _p: existingApp._p || ((k, _c) => k),
    _n: existingApp._n || ((k, _c, _pk) => k),
    nextGroupId,
    gitBashPath,
    container,
    tabList,
    btnNewTerminal,
    btnNewTermDropdown,
    newTermDropdown,
    btnEchoMode,
    btnEchoAll,
    btnEchoToggle,
    btnEchoPaste,
    groupList,
    btnNewGroup,
    gitBashStatus,
    statusTerminalCount,
    statusEcho,
    statusShell,
    btnSettings,
    optionsPanel,
    optTabCloseConfirm,
    optWindowCloseConfirm,
    optGroupCloseConfirm,
    optSshJumpWarn,
    optPastePreview,
    optRightClickPaste,
    tabCtxMoveSep,
    tabCtxMoveItem,
    tabCtxGroupSubmenu,
    TAB_ICONS,
    SHELL_LABELS,
    getShellName,
    api: getIpcClient(), // IPC gateway (preload bridge, or injected test fake)
  };
})();

export {};
