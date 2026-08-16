/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Chinese (Traditional) / 中文（繁體） translations
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  window.App.i18n.registerLocale('zh-HK', {

    // ── Locale metadata ─────────────────────────────────────────────────────
    _langName: '中文（繁體）',

    // ── App / Shells ─────────────────────────────────────────────────────────
    appTitle: 'EchoTerm',
    gitBashNotFound: '⚠ 找不到 Git Bash',
    shellPowerShell: 'PowerShell',
    shellCmd: 'CMD',
    shellGitBash: 'Git Bash',
    shellSsh: 'SSH',

    // ── Toolbar ──────────────────────────────────────────────────────────────
    toolbarSidebarToggle: '側邊欄 (Ctrl+Shift+S)',
    toolbarSettings: '設定',
    winMinimizeTitle: '最小化',
    winMaximizeTitle: '最大化',
    winRestoreTitle: '還原',

    // ── New Terminal Dropdown ────────────────────────────────────────────────
    newTerminalTitle: '新增終端機 (Ctrl+N)',
    newTermDropdownTitle: '選擇終端機類型',
    powershellLabel: 'PowerShell',
    cmdLabel: 'CMD',
    gitBashLabel: 'Git Bash',

    // ── Echo buttons ─────────────────────────────────────────────────────────
    echoEnableAll: '全部啟用',
    echoDisableAll: '全部停用',
    echoToggleAll: '全部切換',
    echoPasteAll: '全部貼上',
    echoLabel: '回顯',
    echoLabelOn: '回顯 開',
    echoModeTitleOff: '回顯模式',
    echoEnableAllTitle: '在所有終端機上啟用回顯',
    echoToggleAllTitle: '切換每個終端機的回顯狀態',
    echoPasteAllTitle: '貼上到所有已啟用回顯的終端機',

    // ── Group bar ────────────────────────────────────────────────────────────
    groupDefaultName: '群組 {n}',
    newGroupTitle: '新增群組 (Ctrl+Shift+N)',
    closeGroupTitle: '關閉群組',

    // ── Tab ──────────────────────────────────────────────────────────────────
    tabCloseTitle: '關閉',

    // ── Pane titlebar ────────────────────────────────────────────────────────
    panePasteTitle: '貼上',
    paneEchoTitle: '向此終端機回顯輸入',
    paneEchoLabel: '回顯',
    paneCloseTitle: '關閉',
    paneDismissTitle: '關閉',

    // ── Status bar ───────────────────────────────────────────────────────────
    statusTerminalCount: '{count} 個終端機',
    statusTerminalPlural: '',
    statusEchoOff: '回顯: 關',
    statusEchoOn: '回顯: 開',
    statusEchoOnSelected: '回顯: 開（已選取 {count} 個）',
    statusShell: 'Shell: {shell}',

    // ── Toast messages ───────────────────────────────────────────────────────
    toastDefaultShell: '預設: {shell}',
    toastGitBashNotFound: '找不到 Git Bash。請定位 bash.exe 以開啟 Git Bash 終端機。',
    toastTerminalExited: '終端機已結束。正在產生新的...',
    toastNeedTwoTerminals: '此群組至少需要 2 個終端機才能使用回顯模式。',
    toastCannotDeleteLastGroup: '無法刪除最後一個群組。',
    toastError: '錯誤: {message}',
    toastSshError: 'SSH 錯誤: {message}',
    toastSshErrorNamed: 'SSH 錯誤 ({name}): {message}',
    toastSkipped: '已跳過 {name}: {message}',
    toastImported: '已匯入 {list}。',
    toastImportedNew: '{count} 個新增',
    toastImportedUpdated: '{count} 個已更新',
    toastSshExported: 'SSH 設定已匯出到 {path}。',
    toastAlreadyRunning: 'EchoTerm 已在執行。',

    // ── Context menus ────────────────────────────────────────────────────────
    ctxCopy: '複製',
    ctxPaste: '貼上',
    ctxPasteAll: '全部貼上',
    ctxToggleEcho: '切換回顯',
    ctxClosePane: '關閉窗格',
    tabCtxRename: '重新命名標籤',
    tabCtxClose: '關閉標籤',
    tabCtxCloseSelected: '關閉已選取',
    tabCtxCloseOthers: '關閉其他',
    tabCtxMoveToGroup: '移至群組',
    tabCtxSubmenuArrow: '▶',
    groupCtxRename: '重新命名群組',
    groupCtxDelete: '關閉群組',
    groupCtxCloseTerminals: '關閉所有終端機',

    // ── Confirm dialogs ──────────────────────────────────────────────────────
    confirmCancel: '取消',
    confirmClose: '關閉',
    confirmDelete: '刪除',
    confirmDontShowAgain: '不再顯示',
    confirmCloseTerminal: '關閉此終端機？\n工作階段將被終止。',
    confirmCloseSelectedTerminals: '關閉 {count} 個已選取的終端機？\n所有工作階段將被終止。',
    confirmCloseOtherTerminals: '關閉 {count} 個其他終端機？\n所有工作階段將被終止。',
    confirmCloseGroup: '關閉群組「{name}」？',
    confirmCloseGroupWithTerminals: '關閉群組「{name}」？\n{count} 個終端機將被關閉。',
    confirmCloseApp: '關閉 EchoTerm？\n所有終端機工作階段將被終止。',
    confirmCloseAllGroupTerminals: '關閉群組「{name}」中的 {count} 個終端機？\n所有工作階段將被終止。',
    confirmDeleteSshConnection: '刪除 SSH 連線「{name}」？',
    confirmDeleteSshFolder: '刪除 SSH 資料夾「{name}」？\n其子資料夾也會一併刪除。資料夾中的連線不會被刪除。',
    confirmDeleteSshUser: '刪除 SSH 使用者「{name}」？\n使用此使用者的連線需要重新指派。',
    confirmDeleteMultiSsh: '刪除 {count} 個 SSH {type}？',
    confirmJumpHostsMissing: '以下跳板機未被選取：\n\n{names}\n\n仍然匯入？',

    // ── SSH Sidebar ──────────────────────────────────────────────────────────
    sshSidebarTitle: 'SSH',
    sshPasswordBtnTitle: '設定/變更主密碼',
    sshImportBtnTitle: '從 ~/.ssh/config 匯入新的',
    sshUpdateBtnTitle: '從 ~/.ssh/config 更新現有的',
    sshExportBtnTitle: '匯出連線到 SSH 設定檔',
    sshNewConnBtnTitle: '新增連線',
    sshNewFolderBtnTitle: '新增資料夾',
    sshNewUserBtnTitle: '新增使用者',
    sshMenuTitle: '操作',
    sshSearchPlaceholder: '搜尋...',
    sshSectionConnections: '連線',
    sshSectionUsers: '使用者',
    sshNoConnections: '暫無連線。\n點擊 + 新增。',
    sshNoUsers: '暫無使用者。\n點擊 + 新增。',
    sshFolderOpenAllTitle: '全部開啟',
    sshFolderEditTitle: '編輯',
    sshFolderDeleteTitle: '刪除',
    sshItemConnectTitle: '連線',
    sshItemEditTitle: '編輯',
    sshItemDeleteTitle: '刪除',
    sshItemAuthKeyfile: '🔑',
    sshItemAuthPassword: '🔒',
    sshItemConnIcon: '🖥️',

    // ── SSH Dialogs ──────────────────────────────────────────────────────────
    sshDialogTitleNewConn: '新增連線',
    sshDialogTitleEditConn: '編輯連線',
    sshDialogTitleNewFolder: '新增資料夾',
    sshDialogTitleEditFolder: '編輯資料夾',
    sshDialogTitleNewUser: '新增使用者',
    sshDialogTitleEditUser: '編輯使用者',
    sshDialogSave: '儲存',
    sshDialogCancel: '取消',
    sshFormName: '名稱',
    sshFormHost: '主機',
    sshFormPort: '連接埠',
    sshFormUser: '使用者',
    sshFolderOptional: '資料夾（可選）',
    sshFormSelectUser: '-- 選擇使用者 --',
    sshFormNone: '-- 無 --',
    sshFormJumpHostOptional: '跳板機（可選）',
    sshFormJumpType: '類型',
    sshFormJumpNone: '無（直接連線）',
    sshFormJumpManual: '手動輸入',
    sshFormJumpReference: '選擇已儲存的連線',
    sshFormJumpHost: '跳板主機',
    sshFormJumpPort: '跳板連接埠',
    sshFormJumpUsername: '跳板使用者名稱',
    sshFormJumpViaConnection: '透過連線跳轉',
    sshFormSelectConnection: '-- 選擇連線 --',
    sshFormAdvancedOptional: '進階選項（選填）',
    sshFormHostKeyAlgorithms: '主機金鑰算法',
    sshFormKexAlgorithms: '金鑰交換算法',
    sshFormPubkeyAcceptedAlgorithms: '公鑰算法',
    sshFormUsername: '使用者名稱',
    sshFormAuthType: '驗證方式',
    sshFormAuthPassword: '密碼',
    sshFormAuthKeyfile: '金鑰檔案',
    sshFormPassword: '密碼',
    sshFormPasswordUnchanged: '（留空則不變更）',
    sshFormKeyFilePath: '金鑰檔案路徑',
    sshFormKeyPassphrase: '金鑰密碼',
    sshFormKeyPassphraseOptional: '（可選）',
    sshFolderName: '資料夾名稱',
    sshFolderParent: '父資料夾',
    sshFolderParentNone: '（無 — 根層級）',
    sshPasswordUnlockTitle: '解鎖 SSH 連線',
    sshPasswordSetupTitle: '保護 SSH 連線',
    sshPasswordChangeTitle: '變更主密碼',
    sshPasswordLabel: '主密碼',
    sshPasswordPlaceholderUnlock: '輸入主密碼',
    sshPasswordPlaceholderNew: '輸入新的主密碼',
    sshPasswordConfirmLabel: '確認密碼',
    sshPasswordConfirmPlaceholder: '確認主密碼',
    sshPasswordBtnUnlock: '解鎖',
    sshPasswordBtnSet: '設定密碼',
    sshPasswordBtnChange: '變更密碼',
    sshPasswordBtnUseOs: '使用作業系統加密',
    sshPasswordEmpty: '密碼不能為空白。',
    sshPasswordMismatch: '兩次密碼不相符。',
    sshPasswordIncorrect: '密碼錯誤。',
    sshPasswordDecryptFailed: '資料解密失敗，檔案可能已損毀。',
    sshMasterPasswordRequired: '需要主密碼。資料已加密。',
    sshPasswordLockedIcon: '🔒',
    sshPasswordUnlockedIcon: '🔓',
    sshPasswordBtnChangeTitle: '變更主密碼',
    sshPasswordBtnSetTitle: '設定主密碼',

    // ── SSH Import ───────────────────────────────────────────────────────────
    sshImportTitle: '從 ~/.ssh/config 匯入',
    sshImportUpdateTitle: '從 ~/.ssh/config 更新',
    sshImportBtnImport: '匯入已選取',
    sshImportBtnUpdate: '更新已選取',
    sshImportUpdateFieldsTitle: '更新以下欄位：',
    sshImportFieldHost: '主機名稱 / 連接埠',
    sshImportFieldUser: '使用者',
    sshImportFieldJump: '跳板機',
    sshImportFieldOptions: '算法選項',
    sshImportAuthKeyfile: '金鑰: {file}',
    sshImportAuthPassword: '密碼',
    sshImportJumpVia: '↪ 經由 {host}',
    sshImportJumpNotInConfig: '（不在設定中）',
    sshImportNoNewHosts: '未發現新主機。所有主機已匯入。',
    sshImportNoExistingToUpdate: '在 SSH 設定中找不到可更新的現有連線。',
    sshImportNoHosts: 'SSH 設定中找不到主機。',

    // ── SSH Context Menu ─────────────────────────────────────────────────────
    sshCtxAddConn: '新增連線',
    sshCtxAddSubFolder: '新增子資料夾',
    sshCtxConnect: '連線',
    sshCtxEdit: '編輯',
    sshCtxMoveToFolder: '移至資料夾',
    sshCtxDelete: '刪除',
    sshCtxOpenAll: '開啟所有連線',
    sshCtxConnectAll: '連線全部 ({count})',
    sshCtxDeleteSelected: '刪除已選取 ({count})',
    sshCtxOpenAllMulti: '全部開啟 ({count})',
    sshCtxDuplicate: '複製',
    sshCtxDuplicateSelected: '複製已選取 ({count})',
    sshCtxNoOtherFolders: '沒有其他資料夾',

    // ── Settings / Options Panel ─────────────────────────────────────────────
    optionsTitleAppearance: '外觀',
    optionsThemeDark: '深色',
    optionsThemeLight: '淺色',
    optionsUiFontSize: '介面字體大小',
    optionsTermFontSize: '終端機字體大小',
    optionsTitleDefaultShell: '預設 Shell',
    optionsTitleWarnings: '警告',
    optionsTitleMouse: '滑鼠',
    optionsTabCloseConfirm: '關閉標籤前確認',
    optionsWindowCloseConfirm: '關閉視窗前確認',
    optionsGroupCloseConfirm: '刪除群組前確認',
    optionsSshJumpWarn: 'SSH 匯入時警告未選取的跳板機',
    optionsPastePreview: '貼上多行內容前確認',
    optionsRightClickPaste: '右鍵複製 / 貼上',

    // ── Danger Zone ──────────────────────────────────────────────────────────
    optionsTitleDanger: '危險區域',
    optionsResetSettings: '重設所有設定',
    optionsClearSshData: '清除所有 SSH 連線',
    confirmResetSettings: '將所有設定還原為預設值？\n此操作無法復原。',
    confirmClearSshData: '刪除所有已儲存的 SSH 連線、使用者和資料夾？\n此操作無法復原。',
    confirmReset: '重設',
    toastSettingsReset: '所有設定已重設。',
    toastSshDataCleared: '所有 SSH 連線已清除。',
    optionsClearAllData: '清除所有資料並重新啟動',
    confirmClearAllData: '清除所有資料並重新啟動 EchoTerm？\n所有設定和 SSH 連線將被永久刪除。',
    optionsClearCache: '清除所有快取',
    confirmClearCache: '清除應用程式快取？\n不會影響您的設定或 SSH 連線。',
    confirmClear: '清除',
    toastCacheCleared: '應用程式快取已清除。',

    // ── Paste Preview ─────────────────────────────────────────────────────────
    pastePreviewTitle: '貼上預覽',
    pastePreviewLines: '{count} 行',
    pastePreviewDontShow: '不再顯示',
    pastePreviewCancel: '取消',
    pastePreviewPaste: '貼上',

    // ── Language ─────────────────────────────────────────────────────────────
    optionsTitleLanguage: '語言',

    // ── About ────────────────────────────────────────────────────────────────
    optionsTitleAbout: '關於',
    aboutDescription: 'EchoTerm — 支援迴聲輸入的分屏終端應用',
    aboutVersion: '版本',

    // ── Error messages ───────────────────────────────────────────────────────
    errorUnknownShell: '未知 Shell: {shell}',
    errorConnectionNotFound: '找不到連線。',
    errorGroupNotFound: '找不到群組。',
    errorConfigNotFound: '找不到設定檔: {path}',
    errorNoMasterPassword: '未設定主密碼。',

    // ── Dialog buttons ───────────────────────────────────────────────────────
    genericSave: '儲存',
    genericCancel: '取消',

    // ── SSH Header Dropdown ─────────────────────────────────────────────────
    sshDropdownSshLabel: '.SSH',
    sshDropdownCreate: '新增',
    sshDropdownImportBtn: '匯入',
    sshDropdownUpdateBtn: '更新',
    sshDropdownExportBtn: '匯出',
    sshDropdownConnBtn: '連線',
    sshDropdownFolderBtn: '資料夾',
    sshDropdownUserBtn: '使用者',

    // ── SSH Import Diff Labels ──────────────────────────────────────────────
    sshImportDiffHost: '主機',
    sshImportDiffUser: '使用者',
    sshImportDiffJump: '跳板',
    sshImportDiffOptions: '選項',
    sshImportDiffNone: '（無）',
    sshImportDefaultUserName: '預設',

    // ── SSH Delete Type Labels ──────────────────────────────────────────────
    sshDeleteTypeFolder: '資料夾',
    sshDeleteTypeConnection: '連線',
    sshDeleteTypeUser: '使用者',
  });

})();

export {};
