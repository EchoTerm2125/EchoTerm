/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — English (en) translations
   Canonical source of all display text keys.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  window.App.i18n.registerLocale('en', {

    // ── Locale metadata ─────────────────────────────────────────────────────
    _langName: 'English',

    // ── App / Shells ─────────────────────────────────────────────────────────
    appTitle: 'EchoTerm',
    gitBashNotFound: '⚠ Git Bash not found',
    shellPowerShell: 'PowerShell',
    shellCmd: 'CMD',
    shellGitBash: 'Git Bash',
    shellSsh: 'SSH',

    // ── Toolbar ──────────────────────────────────────────────────────────────
    toolbarSidebarToggle: 'Sidebar (Ctrl+Shift+S)',
    toolbarSettings: 'Settings',
    winMinimizeTitle: 'Minimize',
    winMaximizeTitle: 'Maximize',
    winRestoreTitle: 'Restore',

    // ── New Terminal Dropdown ────────────────────────────────────────────────
    newTerminalTitle: 'New Terminal (Ctrl+N)',
    newTermDropdownTitle: 'Select terminal type',
    powershellLabel: 'PowerShell',
    cmdLabel: 'CMD',
    gitBashLabel: 'Git Bash',

    // ── Echo buttons ─────────────────────────────────────────────────────────
    echoEnableAll: 'Enable All',
    echoDisableAll: 'Disable All',
    echoToggleAll: 'Toggle All',
    echoPasteAll: 'Paste All',
    echoLabel: 'Echo',
    echoLabelOn: 'Echo ON',
    echoModeTitleOff: 'Echo Mode',
    echoEnableAllTitle: 'Enable echo on all terminals',
    echoToggleAllTitle: 'Toggle each terminal\'s echo state',
    echoPasteAllTitle: 'Paste to all echo-enabled terminals',

    // ── Group bar ────────────────────────────────────────────────────────────
    groupDefaultName: 'Group {n}',
    newGroupTitle: 'New Group (Ctrl+Shift+N)',
    closeGroupTitle: 'Close Group',

    // ── Tab ──────────────────────────────────────────────────────────────────
    tabCloseTitle: 'Close',

    // ── Pane titlebar ────────────────────────────────────────────────────────
    panePasteTitle: 'Paste',
    paneEchoTitle: 'Echo input to this terminal',
    paneEchoLabel: 'Echo',
    paneCloseTitle: 'Close',
    paneDismissTitle: 'Dismiss',

    // ── Status bar ───────────────────────────────────────────────────────────
    statusTerminalCount: '{count} terminal{plural}',
    statusTerminalPlural: 's',
    statusEchoOff: 'Echo: OFF',
    statusEchoOn: 'Echo: ON',
    statusEchoOnSelected: 'Echo: ON ({count} selected)',
    statusShell: 'Shell: {shell}',

    // ── Toast messages ───────────────────────────────────────────────────────
    toastDefaultShell: 'Default: {shell}',
    toastGitBashNotFound: 'Git Bash not found. Please locate bash.exe to open a Git Bash terminal.',
    toastTerminalExited: 'Terminal exited. Spawning a new one...',
    toastNeedTwoTerminals: 'Need at least 2 terminals in this group for Echo mode.',
    toastCannotDeleteLastGroup: 'Cannot delete the last group.',
    toastError: 'Error: {message}',
    toastSshError: 'SSH Error: {message}',
    toastSshErrorNamed: 'SSH Error ({name}): {message}',
    toastSkipped: 'Skipped {name}: {message}',
    toastImported: 'Imported {list}.',
    toastImportedNew: '{count} new',
    toastImportedUpdated: '{count} updated',
    toastSshExported: 'SSH config exported to {path}.',
    toastAlreadyRunning: 'EchoTerm is already running.',

    // ── Context menus ────────────────────────────────────────────────────────
    ctxCopy: 'Copy',
    ctxPaste: 'Paste',
    ctxPasteAll: 'Paste All',
    ctxToggleEcho: 'Toggle Echo',
    ctxClosePane: 'Close Pane',
    tabCtxRename: 'Rename Tab',
    tabCtxClose: 'Close Tab',
    tabCtxCloseSelected: 'Close Selected',
    tabCtxCloseOthers: 'Close Others',
    tabCtxMoveToGroup: 'Move to Group',
    tabCtxSubmenuArrow: '▶',
    groupCtxRename: 'Rename Group',
    groupCtxDelete: 'Close Group',
    groupCtxCloseTerminals: 'Close All Terminals',

    // ── Confirm dialogs ──────────────────────────────────────────────────────
    confirmCancel: 'Cancel',
    confirmClose: 'Close',
    confirmDelete: 'Delete',
    confirmDontShowAgain: 'Don\'t show this again',
    confirmCloseTerminal: 'Close this terminal?\nThe session will be terminated.',
    confirmCloseSelectedTerminals: 'Close {count} selected terminal{plural}?\nAll sessions will be terminated.',
    confirmCloseOtherTerminals: 'Close {count} other terminal{plural}?\nAll sessions will be terminated.',
    confirmCloseGroup: 'Close group "{name}"?',
    confirmCloseGroupWithTerminals: 'Close group "{name}"?\n{count} terminal{plural} will be closed.',
    confirmCloseApp: 'Close EchoTerm?\nAll terminal sessions will be terminated.',
    confirmCloseAllGroupTerminals: 'Close all {count} terminal{plural} in group "{name}"?\nAll sessions will be terminated.',
    confirmDeleteSshConnection: 'Delete SSH connection "{name}"?',
    confirmDeleteSshFolder: 'Delete SSH folder "{name}"?\nSubfolders will also be deleted. Connections will not be deleted.',
    confirmDeleteSshUser: 'Delete SSH user "{name}"?\nConnections using this user will need to be reassigned.',
    confirmDeleteMultiSsh: 'Delete {count} SSH {type}{plural}?',
    confirmJumpHostsMissing: 'The following jump hosts are not selected:\n\n{names}\n\nImport anyway?',

    // ── SSH Sidebar ──────────────────────────────────────────────────────────
    sshSidebarTitle: 'SSH',
    sshPasswordBtnTitle: 'Set/Change master password',
    sshImportBtnTitle: 'Import new from ~/.ssh/config',
    sshUpdateBtnTitle: 'Update existing from ~/.ssh/config',
    sshExportBtnTitle: 'Export connections to SSH config file',
    sshNewConnBtnTitle: 'New Connection',
    sshNewFolderBtnTitle: 'New Folder',
    sshNewUserBtnTitle: 'New User',
    sshMenuTitle: 'Actions',
    sshSearchPlaceholder: 'Search...',
    sshSectionConnections: 'Connections',
    sshSectionUsers: 'Users',
    sshNoConnections: 'No connections yet.\nClick + to add one.',
    sshNoUsers: 'No users yet.\nClick + to add one.',
    sshFolderOpenAllTitle: 'Open all',
    sshFolderEditTitle: 'Edit',
    sshFolderDeleteTitle: 'Delete',
    sshItemConnectTitle: 'Connect',
    sshItemEditTitle: 'Edit',
    sshItemDeleteTitle: 'Delete',
    sshItemAuthKeyfile: '🔑',
    sshItemAuthPassword: '🔒',
    sshItemConnIcon: '🖥️',

    // ── SSH Dialogs ──────────────────────────────────────────────────────────
    sshDialogTitleNewConn: 'New Connection',
    sshDialogTitleEditConn: 'Edit Connection',
    sshDialogTitleNewFolder: 'New Folder',
    sshDialogTitleEditFolder: 'Edit Folder',
    sshDialogTitleNewUser: 'New User',
    sshDialogTitleEditUser: 'Edit User',
    sshDialogSave: 'Save',
    sshDialogCancel: 'Cancel',
    sshFormName: 'Name',
    sshFormHost: 'Host',
    sshFormPort: 'Port',
    sshFormUser: 'User',
    sshFolderOptional: 'Folder (optional)',
    sshFormSelectUser: '-- Select User --',
    sshFormNone: '-- None --',
    sshFormJumpHostOptional: 'Jump Host (optional)',
    sshFormJumpType: 'Type',
    sshFormJumpNone: 'None (direct connect)',
    sshFormJumpManual: 'Enter manually',
    sshFormJumpReference: 'Select a saved connection',
    sshFormJumpHost: 'Jump Host',
    sshFormJumpPort: 'Jump Port',
    sshFormJumpUsername: 'Jump Username',
    sshFormJumpViaConnection: 'Jump via Connection',
    sshFormSelectConnection: '-- Select Connection --',
    sshFormAdvancedOptional: 'Advanced Options (optional)',
    sshFormHostKeyAlgorithms: 'Host Key Algorithms',
    sshFormKexAlgorithms: 'Key Exchange Algorithms',
    sshFormPubkeyAcceptedAlgorithms: 'Public Key Algorithms',
    sshFormUsername: 'Username',
    sshFormAuthType: 'Authentication',
    sshFormAuthPassword: 'Password',
    sshFormAuthKeyfile: 'Key File',
    sshFormPassword: 'Password',
    sshFormPasswordUnchanged: '(unchanged if blank)',
    sshFormKeyFilePath: 'Key File Path',
    sshFormKeyPassphrase: 'Key Passphrase',
    sshFormKeyPassphraseOptional: '(optional)',
    sshFolderName: 'Folder Name',
    sshFolderParent: 'Parent folder',
    sshFolderParentNone: '(none — root level)',
    sshPasswordUnlockTitle: 'Unlock SSH Connections',
    sshPasswordSetupTitle: 'Protect SSH Connections',
    sshPasswordChangeTitle: 'Change Master Password',
    sshPasswordLabel: 'Master Password',
    sshPasswordPlaceholderUnlock: 'Enter master password',
    sshPasswordPlaceholderNew: 'Enter new master password',
    sshPasswordConfirmLabel: 'Confirm Password',
    sshPasswordConfirmPlaceholder: 'Confirm master password',
    sshPasswordBtnUnlock: 'Unlock',
    sshPasswordBtnSet: 'Set Password',
    sshPasswordBtnChange: 'Change Password',
    sshPasswordBtnUseOs: 'Use OS Encryption',
    sshPasswordEmpty: 'Password cannot be empty.',
    sshPasswordMismatch: 'Passwords do not match.',
    sshPasswordIncorrect: 'Incorrect password.',
    sshPasswordDecryptFailed: 'Failed to decrypt data. File may be corrupted.',
    sshMasterPasswordRequired: 'Master password required. Data is encrypted.',
    sshPasswordLockedIcon: '🔒',
    sshPasswordUnlockedIcon: '🔓',
    sshPasswordBtnChangeTitle: 'Change master password',
    sshPasswordBtnSetTitle: 'Set master password',

    // ── SSH Import ───────────────────────────────────────────────────────────
    sshImportTitle: 'Import from ~/.ssh/config',
    sshImportUpdateTitle: 'Update from ~/.ssh/config',
    sshImportBtnImport: 'Import Selected',
    sshImportBtnUpdate: 'Update Selected',
    sshImportUpdateFieldsTitle: 'Update these fields:',
    sshImportFieldHost: 'Hostname / Port',
    sshImportFieldUser: 'User',
    sshImportFieldJump: 'Jump Host',
    sshImportFieldOptions: 'Algorithm Options',
    sshImportAuthKeyfile: 'key: {file}',
    sshImportAuthPassword: 'password',
    sshImportJumpVia: '↪ via {host}',
    sshImportJumpNotInConfig: ' (not in config)',
    sshImportNoNewHosts: 'No new hosts found. All are already imported.',
    sshImportNoExistingToUpdate: 'No existing connections found in SSH config to update.',
    sshImportNoHosts: 'No hosts found in SSH config.',

    // ── SSH Context Menu ─────────────────────────────────────────────────────
    sshCtxConnect: 'Connect',
    sshCtxEdit: 'Edit',
    sshCtxMoveToFolder: 'Move to Folder',
    sshCtxDelete: 'Delete',
    sshCtxOpenAll: 'Open All Connections',
    sshCtxConnectAll: 'Connect All ({count})',
    sshCtxDeleteSelected: 'Delete Selected ({count})',
    sshCtxOpenAllMulti: 'Open All ({count})',
    sshCtxDuplicate: 'Duplicate',
    sshCtxDuplicateSelected: 'Duplicate Selected ({count})',
    sshCtxNoOtherFolders: 'No other folders',

    // ── Settings / Options Panel ──────────────────────────────────────────────
    optionsTitleAppearance: 'Appearance',
    optionsThemeDark: 'Dark',
    optionsThemeLight: 'Light',
    optionsUiFontSize: 'UI font size',
    optionsTermFontSize: 'Terminal font size',
    optionsTitleDefaultShell: 'Default Shell',
    optionsTitleWarnings: 'Warnings',
    optionsTitleMouse: 'Mouse',
    optionsTabCloseConfirm: 'Confirm before closing a tab',
    optionsWindowCloseConfirm: 'Confirm before closing window',
    optionsGroupCloseConfirm: 'Confirm before deleting a group',
    optionsSshJumpWarn: 'Warn about unselected jump hosts on SSH import',
    optionsPastePreview: 'Confirm before pasting multi-line content',
    optionsRightClickPaste: 'Right click to copy / paste',

    // ── Danger Zone ──────────────────────────────────────────────────────────
    optionsTitleDanger: 'Danger Zone',
    optionsResetSettings: 'Reset all settings',
    optionsClearSshData: 'Clear all SSH connections',
    confirmResetSettings: 'Reset all settings to their defaults?\nThis cannot be undone.',
    confirmClearSshData: 'Delete all stored SSH connections, users and folders?\nThis cannot be undone.',
    confirmReset: 'Reset',
    toastSettingsReset: 'All settings have been reset.',
    toastSshDataCleared: 'All SSH connections have been cleared.',
    optionsClearAllData: 'Clear all data and restart',
    confirmClearAllData: 'Clear all data and restart EchoTerm?\nAll settings and SSH connections will be permanently deleted.',
    optionsClearCache: 'Clear all cache',
    confirmClearCache: 'Clear the app cache?\nThis will not affect your settings or SSH connections.',
    confirmClear: 'Clear',
    toastCacheCleared: 'App cache has been cleared.',

    // ── Paste Preview ─────────────────────────────────────────────────────────
    pastePreviewTitle: 'Paste Preview',
    pastePreviewLines: '{count} lines',
    pastePreviewDontShow: 'Don\'t show this again',
    pastePreviewCancel: 'Cancel',
    pastePreviewPaste: 'Paste',

    // ── Error messages ───────────────────────────────────────────────────────
    errorUnknownShell: 'Unknown shell: {shell}',
    errorConnectionNotFound: 'Connection not found.',
    errorGroupNotFound: 'Group not found.',
    errorConfigNotFound: 'Config file not found: {path}',
    errorNoMasterPassword: 'No master password set.',

    // ── Language ─────────────────────────────────────────────────────────────
    optionsTitleLanguage: 'Language',

    // ── About ────────────────────────────────────────────────────────────────
    optionsTitleAbout: 'About',
    aboutDescription: 'EchoTerm — split-view terminal app with echo input',
    aboutVersion: 'Version',

    // ── Dialog buttons ───────────────────────────────────────────────────────
    genericSave: 'Save',
    genericCancel: 'Cancel',

    // ── SSH Header Dropdown ─────────────────────────────────────────────────
    sshDropdownSshLabel: '.SSH',
    sshDropdownCreate: 'Create',
    sshDropdownImportBtn: 'Import',
    sshDropdownUpdateBtn: 'Update',
    sshDropdownExportBtn: 'Export',
    sshDropdownConnBtn: 'Connection',
    sshDropdownFolderBtn: 'Folder',
    sshDropdownUserBtn: 'User',

    // ── SSH Import Diff Labels ──────────────────────────────────────────────
    sshImportDiffHost: 'Host',
    sshImportDiffUser: 'User',
    sshImportDiffJump: 'Jump',
    sshImportDiffOptions: 'Options',
    sshImportDiffNone: '(none)',
    sshImportDefaultUserName: 'default',

    // ── SSH Delete Type Labels ──────────────────────────────────────────────
    sshDeleteTypeFolder: 'folder',
    sshDeleteTypeConnection: 'connection',
    sshDeleteTypeUser: 'user',
  });

})();

export {};
