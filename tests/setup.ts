/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Test Harness
   - Global stubs (Terminal, FitAddon, Split, localStorage, clipboard)
   - DOM scaffolding so state.js finds elements when loaded
   - Helpers to reset state and load renderer modules
   ═══════════════════════════════════════════════════════════════════════════ */

import { vi } from 'vitest';

import { setIpcClient } from '../renderer/ipc-client';

// ═══════════════════════════════════════════════════════════════════════════
// 1. Global stubs — must exist before ANY renderer module loads
// ═══════════════════════════════════════════════════════════════════════════

class MockTerminal {
  // Test stub — accepts any ad-hoc property
  [key: string]: any;
  constructor(opts?: any) {
    this.options = opts;
    this.textarea = document.createElement('textarea');
    this._onData = null;
    this._onResize = null;
    this._disposed = false;
  }
  loadAddon(addon) { this._addon = addon; }
  open(parent) { parent.appendChild(this.textarea); }
  onData(cb) { this._onData = cb; }
  onResize(cb) { this._onResize = cb; }
  focus() { this.textarea?.focus(); }
  write(_data) { /* noop in tests */ }
  getSelection() { return ''; }
  dispose() { this._disposed = true; this.textarea?.remove?.(); }
  _fireData(data) { if (this._onData) this._onData(data); }
  _fireResize(cols, rows) { if (this._onResize) this._onResize({ cols, rows }); }
}

class MockFitAddon {
  constructor() {}
  fit() {}
}

(globalThis as any).Terminal = MockTerminal;
(globalThis as any).FitAddon = { FitAddon: MockFitAddon };

(globalThis as any).Split = vi.fn((elements, opts) => ({
  destroy: vi.fn(),
  setSizes: vi.fn(),
  elements,
  options: opts,
}));

// ═══════════════════════════════════════════════════════════════════════════
// 2. Mock browser APIs & IPC
// ═══════════════════════════════════════════════════════════════════════════

// jsdom does not implement scrollIntoView
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

// Fake window.api — the IPC bridge exposed by preload.js
// Must exist BEFORE state.js loads because state.js resolves the IPC client
// from the gateway (which falls back to window.api).
let _nextApiId = 1;
(globalThis as any).window = globalThis.window || globalThis;
window.api = {
  getDefaultShells: vi.fn(() => Promise.resolve({
    shells: ['powershell', 'cmd', 'gitbash'],
    gitBashPath: null,
  })),
  locateGitBash: vi.fn(() => Promise.resolve({ path: null })),
  spawnTerminal: vi.fn((shell) => Promise.resolve({ id: _nextApiId++, shell })),
  write: vi.fn(),
  resize: vi.fn(),
  killTerminal: vi.fn(),
  onData: vi.fn(() => vi.fn()),
  onExit: vi.fn(() => vi.fn()),
  onConfirmClose: vi.fn(() => vi.fn()),
  confirmClose: vi.fn(),
  onSingleInstanceWarning: vi.fn(() => vi.fn()),
  // App info (About page)
  getAppInfo: vi.fn(() => Promise.resolve({
    name: 'EchoTerm',
    version: '1.0.0',
  })),
  // Auto-update
  updateCheck: vi.fn(() => Promise.resolve({ started: true })),
  updateGetSettings: vi.fn(() => Promise.resolve({
    includePrerelease: false,
    checkForUpdatesAutomatically: true,
    skippedVersion: null,
    nextCheckAt: null,
  })),
  updateSetSettings: vi.fn((patch) => Promise.resolve({
    includePrerelease: false,
    checkForUpdatesAutomatically: true,
    skippedVersion: null,
    nextCheckAt: null,
    ...patch,
  })),
  updateSkipVersion: vi.fn(() => Promise.resolve({ success: true })),
  updateRemindLater: vi.fn(() => Promise.resolve({ success: true })),
  updateInstall: vi.fn(() => Promise.resolve({ success: true })),
  onUpdateAvailable: vi.fn(() => vi.fn()),
  onUpdateNotAvailable: vi.fn(() => vi.fn()),
  onUpdateProgress: vi.fn(() => vi.fn()),
  onUpdateDownloaded: vi.fn(() => vi.fn()),
  onUpdateError: vi.fn(() => vi.fn()),
  onUpdatePortable: vi.fn(() => vi.fn()),
  // Window controls (custom titlebar)
  minimizeWindow: vi.fn(),
  toggleMaximizeWindow: vi.fn(),
  closeWindow: vi.fn(),
  isWindowMaximized: vi.fn(() => Promise.resolve(false)),
  onWindowMaximizedChange: vi.fn(() => vi.fn()),
  // Cache
  clearCache: vi.fn(() => Promise.resolve({ success: true })),
  // App data reset (wipe all data and restart)
  clearAllData: vi.fn(() => Promise.resolve({ success: true })),
  // SSH store
  sshPasswordStatus: vi.fn(() => Promise.resolve({ masterPasswordSet: false, unlocked: true })),
  sshSetPassword: vi.fn(() => Promise.resolve({ success: true })),
  sshUseSafeStorage: vi.fn(() => Promise.resolve({ success: true })),
  sshUnlock: vi.fn(() => Promise.resolve({ success: true })),
  sshTryUnlock: vi.fn(() => Promise.resolve({ success: true })),
  sshClearAll: vi.fn(() => Promise.resolve({ success: true })),
  sshUserList: vi.fn(() => Promise.resolve([])),
  sshUserSave: vi.fn((userData) => Promise.resolve({ success: true, user: userData })),
  sshUserDelete: vi.fn(() => Promise.resolve({ success: true })),
  sshConnectionList: vi.fn(() => Promise.resolve([])),
  sshConnectionSave: vi.fn((connData) => Promise.resolve({ success: true, connection: connData })),
  sshConnectionDelete: vi.fn(() => Promise.resolve({ success: true })),
  sshFolderList: vi.fn(() => Promise.resolve([])),
  sshFolderSave: vi.fn((folderData) => Promise.resolve({ success: true, folder: folderData })),
  sshFolderDelete: vi.fn(() => Promise.resolve({ success: true })),
  sshConnect: vi.fn((connectionId) => Promise.resolve({ id: _nextApiId++, shell: 'ssh', label: connectionId })),
  sshOpenFolder: vi.fn(() => Promise.resolve({ name: '', connections: [] })),
  sshImportConfig: vi.fn(() => Promise.resolve({ canceled: true })),
  sshImportApply: vi.fn(() => Promise.resolve({ success: true, imported: 0, updated: 0, skipped: [] })),
  sshExportConfig: vi.fn(() => Promise.resolve({ canceled: true })),
} as unknown as WindowApi;
// Inject the fake through the renderer IPC gateway
setIpcClient(window.api);

const _localStore: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: vi.fn((key) => _localStore[key] ?? null),
  setItem: vi.fn((key, val) => { _localStore[key] = String(val); }),
  removeItem: vi.fn((key) => { delete _localStore[key]; }),
  clear: vi.fn(() => { for (const k of Object.keys(_localStore)) delete _localStore[k]; }),
};

(globalThis as any).navigator = (globalThis as any).navigator || {};
(globalThis as any).navigator.clipboard = {
  readText: vi.fn(() => Promise.resolve('mock-clipboard-text')),
  writeText: vi.fn(() => Promise.resolve()),
};

// ═══════════════════════════════════════════════════════════════════════════
// 3. DOM scaffolding — creates elements state.js expects
// ═══════════════════════════════════════════════════════════════════════════

const DOM_IDS = [
  'terminal-container', 'tabList', 'btnNewTerminal', 'btnNewTermDropdown',
  'newTermDropdown', 'btnEchoMode', 'btnEchoAll', 'btnEchoToggle',
  'btnEchoPaste', 'groupList', 'btnNewGroup', 'gitBashStatus',
  'statusTerminalCount', 'statusEcho', 'statusShell',
  'btnSettings', 'optionsPanel', 'optTabCloseConfirm', 'optWindowCloseConfirm',
  'optGroupCloseConfirm', 'optSshJumpWarn', 'optPastePreview', 'optRightClickPaste',
  'tabCtxMoveSep', 'tabCtxMoveItem', 'tabCtxGroupSubmenu',
  'btnResetSettings', 'btnClearSshData', 'btnClearCache', 'btnClearAllData',
  'contextMenu', 'tabContextMenu', 'groupContextMenu',
  'ctxEcho', 'ctxEchoSep', 'ctxPasteAll', 'btnCloseSelected',
  'confirmDialog', 'confirmMessage', 'confirmOk', 'confirmCancel',
  'confirmDontShowAgain', 'pastePreviewDialog', 'pasteLineCount',
  'pastePreviewText', 'pastePreviewDontShow', 'pastePreviewCancel',
  'pastePreviewConfirm',
  // Auto-update
  'updateDialog', 'updateMessage', 'updateInstall', 'updateSkip', 'updateRemind',
  'optCheckUpdates', 'optIncludePrerelease', 'btnCheckUpdates',
  'updStatusBanner', 'updStatusLine', 'updProgressTrack', 'updProgressBar',
  'updSkippedFooter', 'updSkippedInfo', 'btnUndoSkip',
  // Language dropdown
  'langSelect', 'langSelectTrigger', 'langSelectLabel',
  'langSelectDropdown', 'langSearchInput', 'langOptionsList',
];

function scaffoldDom() {
  for (const id of DOM_IDS) {
    const old = document.getElementById(id);
    if (old) old.remove();
  }

  for (const id of DOM_IDS) {
    let el;
    if (id.startsWith('btn') || id === 'confirmOk' || id === 'confirmCancel' ||
        id === 'updateInstall' || id === 'updateSkip' || id === 'updateRemind') {
      el = document.createElement('button');
    } else if (id === 'pastePreviewCancel' || id === 'pastePreviewConfirm') {
      el = document.createElement('button');
    } else if (id === 'confirmDontShowAgain' || id === 'optTabCloseConfirm' ||
               id === 'optWindowCloseConfirm' || id === 'optGroupCloseConfirm' ||
               id === 'optSshJumpWarn' || id === 'optPastePreview' ||
               id === 'optRightClickPaste' || id === 'pastePreviewDontShow' ||
               id === 'optCheckUpdates' || id === 'optIncludePrerelease') {
      el = document.createElement('input');
      el.type = 'checkbox';
    } else if (id === 'pastePreviewText') {
      el = document.createElement('textarea');
    } else {
      el = document.createElement('div');
    }
    el.id = id;
    if (id === 'newTermDropdown' || id === 'optionsPanel') {
      el.classList.add('hidden');
    }
    if (id === 'pastePreviewDialog') {
      el.classList.add('hidden');
    }
    document.body.appendChild(el);
  }

  let style = document.getElementById('test-styles');
  if (!style) {
    style = document.createElement('style');
    style.id = 'test-styles';
    style.textContent = '.hidden { display: none !important; }';
    document.head.appendChild(style);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. Public API for tests
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Reset everything and load state.js (which builds window.App from DOM).
 * Call this in beforeEach() of every test file.
 */
export async function resetTestEnv() {
  for (const k of Object.keys(_localStore)) delete _localStore[k];
  vi.clearAllMocks();
  scaffoldDom();
  vi.resetModules();

  // Reset the spawnTerminal ID counter
  _nextApiId = 1;

  // Load i18n first so that __/ _p/ _n are available
  await import('../renderer/i18n.ts');
  // Load locale data — English is required as the fallback
  await import('../renderer/i18n-locales/en.ts');
  await import('../renderer/state.ts');
}

/**
 * Load additional renderer modules. Each IIFE registers on window.App.
 */
export async function loadModules(...names) {
  for (const name of names) {
    await import(`../renderer/${name}.ts`);
  }
}

/**
 * Shortcut: reset + load modules. Returns window.App.
 */
export async function setupTest(...names) {
  await resetTestEnv();
  if (names.length > 0) await loadModules(...names);
  return window.App;
}

export function getApp() {
  return window.App;
}

/**
 * Inject a terminal entry directly into App.state (bypasses spawnTerminal).
 */
export function injectTerminal(id, overrides = {}) {
  const App = window.App;
  const paneEl = document.createElement('div');
  paneEl.className = 'pane';
  paneEl.dataset.termId = String(id);

  const titlebar = document.createElement('div');
  titlebar.className = 'pane-titlebar';
  titlebar.innerHTML = `
    <span class="pane-label">Test</span>
    <button class="pane-paste">Paste</button>
    <label class="pane-checkbox" style="display:none">
      <input type="checkbox" /><span>Echo</span>
    </label>
    <button class="pane-close">×</button>
  `;
  paneEl.appendChild(titlebar);

  const xtermDiv = document.createElement('div');
  xtermDiv.className = 'xterm-container';
  paneEl.appendChild(xtermDiv);

  const term = new MockTerminal();
  const fitAddon = new MockFitAddon();

  const entry = { id, shell: 'powershell', term, fitAddon, paneEl, titlebar, customName: null, outBuf: '', pwPrompt: false, ...overrides };
  App.state.terminals.set(id, entry);
  App.state.paneOrder.push(id);
  App.container.appendChild(paneEl);
  return entry;
}

/**
 * Inject a group into App.state.groups.
 */
export function injectGroup(id, name, terminalIds = []) {
  const App = window.App;
  const group = { id, name, terminalIds: new Set(terminalIds) };
  App.state.groups.set(id, group);
  App.state.groupOrder.push(id);
  for (const tid of terminalIds) {
    App.state.terminalGroups.set(tid, id);
  }
  return group;
}
