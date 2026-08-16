/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Korean / 한국어 translations
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  window.App.i18n.registerLocale('ko', {

    // ── Locale metadata ─────────────────────────────────────────────────────
    _langName: '한국어',

    // ── App / Shells ─────────────────────────────────────────────────────────
    appTitle: 'EchoTerm',
    gitBashNotFound: '⚠ Git Bash를 찾을 수 없음',
    shellPowerShell: 'PowerShell',
    shellCmd: 'CMD',
    shellGitBash: 'Git Bash',
    shellSsh: 'SSH',

    // ── Toolbar ──────────────────────────────────────────────────────────────
    toolbarSidebarToggle: '사이드바 (Ctrl+Shift+S)',
    toolbarSettings: '설정',
    winMinimizeTitle: '최소화',
    winMaximizeTitle: '최대화',
    winRestoreTitle: '복원',

    // ── New Terminal Dropdown ────────────────────────────────────────────────
    newTerminalTitle: '새 터미널 (Ctrl+N)',
    newTermDropdownTitle: '터미널 유형 선택',
    powershellLabel: 'PowerShell',
    cmdLabel: 'CMD',
    gitBashLabel: 'Git Bash',

    // ── Echo buttons ─────────────────────────────────────────────────────────
    echoEnableAll: '모두 활성화',
    echoDisableAll: '모두 비활성화',
    echoToggleAll: '모두 전환',
    echoPasteAll: '모두 붙여넣기',
    echoLabel: '에코',
    echoLabelOn: '에코 켜짐',
    echoModeTitleOff: '에코 모드',
    echoEnableAllTitle: '모든 터미널에서 에코 활성화',
    echoToggleAllTitle: '각 터미널의 에코 상태 전환',
    echoPasteAllTitle: '에코가 활성화된 모든 터미널에 붙여넣기',

    // ── Group bar ────────────────────────────────────────────────────────────
    groupDefaultName: '그룹 {n}',
    newGroupTitle: '새 그룹 (Ctrl+Shift+N)',
    closeGroupTitle: '그룹 닫기',

    // ── Tab ──────────────────────────────────────────────────────────────────
    tabCloseTitle: '닫기',

    // ── Pane titlebar ────────────────────────────────────────────────────────
    panePasteTitle: '붙여넣기',
    paneEchoTitle: '이 터미널에 입력 에코',
    paneEchoLabel: '에코',
    paneCloseTitle: '닫기',
    paneDismissTitle: '닫기',

    // ── Status bar ───────────────────────────────────────────────────────────
    statusTerminalCount: '터미널 {count}개',
    statusTerminalPlural: '',
    statusEchoOff: '에코: 끔',
    statusEchoOn: '에코: 켬',
    statusEchoOnSelected: '에코: 켬 ({count}개 선택됨)',
    statusShell: '셸: {shell}',

    // ── Toast messages ───────────────────────────────────────────────────────
    toastDefaultShell: '기본: {shell}',
    toastGitBashNotFound: 'Git Bash를 찾을 수 없습니다. Git Bash 터미널을 열려면 bash.exe의 위치를 지정하세요.',
    toastTerminalExited: '터미널이 종료되었습니다. 새 터미널을 시작하는 중...',
    toastNeedTwoTerminals: '에코 모드를 사용하려면 이 그룹에 터미널이 2개 이상 필요합니다.',
    toastCannotDeleteLastGroup: '마지막 그룹은 삭제할 수 없습니다.',
    toastError: '오류: {message}',
    toastSshError: 'SSH 오류: {message}',
    toastSshErrorNamed: 'SSH 오류 ({name}): {message}',
    toastSkipped: '{name} 건너뜀: {message}',
    toastImported: '{list}을(를) 가져왔습니다.',
    toastImportedNew: '새로 {count}개',
    toastImportedUpdated: '{count}개 업데이트됨',
    toastSshExported: 'SSH 설정을 {path}에 내보냈습니다.',
    toastAlreadyRunning: 'EchoTerm이 이미 실행 중입니다.',

    // ── Context menus ────────────────────────────────────────────────────────
    ctxCopy: '복사',
    ctxPaste: '붙여넣기',
    ctxPasteAll: '모두 붙여넣기',
    ctxToggleEcho: '에코 전환',
    ctxClosePane: '패널 닫기',
    tabCtxRename: '탭 이름 바꾸기',
    tabCtxClose: '탭 닫기',
    tabCtxCloseSelected: '선택한 탭 닫기',
    tabCtxCloseOthers: '다른 탭 닫기',
    tabCtxMoveToGroup: '그룹으로 이동',
    tabCtxSubmenuArrow: '▶',
    groupCtxRename: '그룹 이름 바꾸기',
    groupCtxDelete: '그룹 닫기',
    groupCtxCloseTerminals: '모든 터미널 닫기',

    // ── Confirm dialogs ──────────────────────────────────────────────────────
    confirmCancel: '취소',
    confirmClose: '닫기',
    confirmDelete: '삭제',
    confirmDontShowAgain: '다시 표시하지 않음',
    confirmCloseTerminal: '이 터미널을 닫을까요?\n세션이 종료됩니다.',
    confirmCloseSelectedTerminals: '선택한 터미널 {count}개를 닫을까요?\n모든 세션이 종료됩니다.',
    confirmCloseOtherTerminals: '다른 터미널 {count}개를 닫을까요?\n모든 세션이 종료됩니다.',
    confirmCloseGroup: '그룹 "{name}"을(를) 닫을까요?',
    confirmCloseGroupWithTerminals: '그룹 "{name}"을(를) 닫을까요?\n터미널 {count}개가 닫힙니다.',
    confirmCloseApp: 'EchoTerm을 닫을까요?\n모든 터미널 세션이 종료됩니다.',
    confirmCloseAllGroupTerminals: '그룹 "{name}"의 터미널 {count}개를 모두 닫을까요?\n모든 세션이 종료됩니다.',
    confirmDeleteSshConnection: 'SSH 연결 "{name}"을(를) 삭제할까요?',
    confirmDeleteSshFolder: 'SSH 폴더 "{name}"을(를) 삭제할까요?\n하위 폴더도 삭제됩니다. 연결은 삭제되지 않습니다.',
    confirmDeleteSshUser: 'SSH 사용자 "{name}"을(를) 삭제할까요?\n이 사용자를 사용하는 연결은 다시 지정해야 합니다.',
    confirmDeleteMultiSsh: 'SSH {type} {count}개를 삭제할까요?',
    confirmJumpHostsMissing: '다음 점프 호스트가 선택되지 않았습니다:\n\n{names}\n\n그래도 가져올까요?',

    // ── SSH Sidebar ──────────────────────────────────────────────────────────
    sshSidebarTitle: 'SSH',
    sshPasswordBtnTitle: '마스터 암호 설정/변경',
    sshImportBtnTitle: '~/.ssh/config에서 새로 가져오기',
    sshUpdateBtnTitle: '~/.ssh/config에서 기존 항목 업데이트',
    sshExportBtnTitle: '연결을 SSH 설정 파일로 내보내기',
    sshNewConnBtnTitle: '새 연결',
    sshNewFolderBtnTitle: '새 폴더',
    sshNewUserBtnTitle: '새 사용자',
    sshMenuTitle: '작업',
    sshSearchPlaceholder: '검색...',
    sshSectionConnections: '연결',
    sshSectionUsers: '사용자',
    sshNoConnections: '아직 연결이 없습니다.\n+를 클릭하여 추가하세요.',
    sshNoUsers: '아직 사용자가 없습니다.\n+를 클릭하여 추가하세요.',
    sshFolderOpenAllTitle: '모두 열기',
    sshFolderEditTitle: '편집',
    sshFolderDeleteTitle: '삭제',
    sshItemConnectTitle: '연결',
    sshItemEditTitle: '편집',
    sshItemDeleteTitle: '삭제',
    sshItemAuthKeyfile: '🔑',
    sshItemAuthPassword: '🔒',
    sshItemConnIcon: '🖥️',

    // ── SSH Dialogs ──────────────────────────────────────────────────────────
    sshDialogTitleNewConn: '새 연결',
    sshDialogTitleEditConn: '연결 편집',
    sshDialogTitleNewFolder: '새 폴더',
    sshDialogTitleEditFolder: '폴더 편집',
    sshDialogTitleNewUser: '새 사용자',
    sshDialogTitleEditUser: '사용자 편집',
    sshDialogSave: '저장',
    sshDialogCancel: '취소',
    sshFormName: '이름',
    sshFormHost: '호스트',
    sshFormPort: '포트',
    sshFormUser: '사용자',
    sshFolderOptional: '폴더 (선택 사항)',
    sshFormSelectUser: '-- 사용자 선택 --',
    sshFormNone: '-- 없음 --',
    sshFormJumpHostOptional: '점프 호스트 (선택 사항)',
    sshFormJumpType: '유형',
    sshFormJumpNone: '없음 (직접 연결)',
    sshFormJumpManual: '직접 입력',
    sshFormJumpReference: '저장된 연결 선택',
    sshFormJumpHost: '점프 호스트',
    sshFormJumpPort: '점프 포트',
    sshFormJumpUsername: '점프 사용자 이름',
    sshFormJumpViaConnection: '연결을 통해 점프',
    sshFormSelectConnection: '-- 연결 선택 --',
    sshFormAdvancedOptional: '고급 옵션 (선택 사항)',
    sshFormHostKeyAlgorithms: '호스트 키 알고리즘',
    sshFormKexAlgorithms: '키 교환 알고리즘',
    sshFormPubkeyAcceptedAlgorithms: '공개 키 알고리즘',
    sshFormUsername: '사용자 이름',
    sshFormAuthType: '인증',
    sshFormAuthPassword: '암호',
    sshFormAuthKeyfile: '키 파일',
    sshFormPassword: '암호',
    sshFormPasswordUnchanged: '(비워두면 변경되지 않음)',
    sshFormKeyFilePath: '키 파일 경로',
    sshFormKeyPassphrase: '키 암호 구문',
    sshFormKeyPassphraseOptional: '(선택 사항)',
    sshFolderName: '폴더 이름',
    sshFolderParent: '상위 폴더',
    sshFolderParentNone: '(없음 — 루트 수준)',
    sshPasswordUnlockTitle: 'SSH 연결 잠금 해제',
    sshPasswordSetupTitle: 'SSH 연결 보호',
    sshPasswordChangeTitle: '마스터 암호 변경',
    sshPasswordLabel: '마스터 암호',
    sshPasswordPlaceholderUnlock: '마스터 암호 입력',
    sshPasswordPlaceholderNew: '새 마스터 암호 입력',
    sshPasswordConfirmLabel: '암호 확인',
    sshPasswordConfirmPlaceholder: '마스터 암호 확인',
    sshPasswordBtnUnlock: '잠금 해제',
    sshPasswordBtnSet: '암호 설정',
    sshPasswordBtnChange: '암호 변경',
    sshPasswordBtnUseOs: 'OS 암호화 사용',
    sshPasswordEmpty: '암호는 비워둘 수 없습니다.',
    sshPasswordMismatch: '암호가 일치하지 않습니다.',
    sshPasswordIncorrect: '암호가 올바르지 않습니다.',
    sshPasswordDecryptFailed: '데이터를 복호화하지 못했습니다. 파일이 손상되었을 수 있습니다.',
    sshMasterPasswordRequired: '마스터 암호가 필요합니다. 데이터가 암호화되어 있습니다.',
    sshPasswordLockedIcon: '🔒',
    sshPasswordUnlockedIcon: '🔓',
    sshPasswordBtnChangeTitle: '마스터 암호 변경',
    sshPasswordBtnSetTitle: '마스터 암호 설정',

    // ── SSH Import ───────────────────────────────────────────────────────────
    sshImportTitle: '~/.ssh/config에서 가져오기',
    sshImportUpdateTitle: '~/.ssh/config에서 업데이트',
    sshImportBtnImport: '선택 항목 가져오기',
    sshImportBtnUpdate: '선택 항목 업데이트',
    sshImportUpdateFieldsTitle: '다음 필드를 업데이트합니다:',
    sshImportFieldHost: '호스트 이름 / 포트',
    sshImportFieldUser: '사용자',
    sshImportFieldJump: '점프 호스트',
    sshImportFieldOptions: '알고리즘 옵션',
    sshImportAuthKeyfile: '키: {file}',
    sshImportAuthPassword: '암호',
    sshImportJumpVia: '↪ {host} 경유',
    sshImportJumpNotInConfig: ' (설정에 없음)',
    sshImportNoNewHosts: '새 호스트가 없습니다. 모두 이미 가져왔습니다.',
    sshImportNoExistingToUpdate: '업데이트할 기존 연결이 SSH 설정에 없습니다.',
    sshImportNoHosts: 'SSH 설정에서 호스트를 찾을 수 없습니다.',

    // ── SSH Context Menu ─────────────────────────────────────────────────────
    sshCtxAddConn: '연결 추가',
    sshCtxAddSubFolder: '하위 폴더 추가',
    sshCtxConnect: '연결',
    sshCtxEdit: '편집',
    sshCtxMoveToFolder: '폴더로 이동',
    sshCtxDelete: '삭제',
    sshCtxOpenAll: '모든 연결 열기',
    sshCtxConnectAll: '모두 연결 ({count})',
    sshCtxDeleteSelected: '선택 항목 삭제 ({count})',
    sshCtxOpenAllMulti: '모두 열기 ({count})',
    sshCtxDuplicate: '복제',
    sshCtxDuplicateSelected: '선택 항목 복제 ({count})',
    sshCtxNoOtherFolders: '다른 폴더가 없습니다',

    // ── Settings / Options Panel ──────────────────────────────────────────────
    optionsTitleAppearance: '모양',
    optionsThemeDark: '다크',
    optionsThemeLight: '라이트',
    optionsUiFontSize: 'UI 글꼴 크기',
    optionsTermFontSize: '터미널 글꼴 크기',
    optionsTitleDefaultShell: '기본 셸',
    optionsTitleWarnings: '경고',
    optionsTitleMouse: '마우스',
    optionsTabCloseConfirm: '탭을 닫기 전에 확인',
    optionsWindowCloseConfirm: '창을 닫기 전에 확인',
    optionsGroupCloseConfirm: '그룹을 삭제하기 전에 확인',
    optionsSshJumpWarn: 'SSH 가져오기 시 선택되지 않은 점프 호스트 경고',
    optionsPastePreview: '여러 줄 내용을 붙여넣기 전에 확인',
    optionsRightClickPaste: '오른쪽 클릭으로 복사 / 붙여넣기',

    // ── Danger Zone ──────────────────────────────────────────────────────────
    optionsTitleDanger: '위험 구역',
    optionsResetSettings: '모든 설정 초기화',
    optionsClearSshData: '모든 SSH 연결 삭제',
    confirmResetSettings: '모든 설정을 기본값으로 초기화할까요?\n이 작업은 되돌릴 수 없습니다.',
    confirmClearSshData: '저장된 모든 SSH 연결, 사용자, 폴더를 삭제할까요?\n이 작업은 되돌릴 수 없습니다.',
    confirmReset: '초기화',
    toastSettingsReset: '모든 설정이 초기화되었습니다.',
    toastSshDataCleared: '모든 SSH 연결이 삭제되었습니다.',
    optionsClearAllData: '모든 데이터 삭제 후 다시 시작',
    confirmClearAllData: '모든 데이터를 삭제하고 EchoTerm을 다시 시작할까요?\n모든 설정과 SSH 연결이 영구적으로 삭제됩니다.',
    optionsClearCache: '모든 캐시 지우기',
    confirmClearCache: '앱 캐시를 지울까요?\n설정이나 SSH 연결에는 영향이 없습니다.',
    confirmClear: '지우기',
    toastCacheCleared: '앱 캐시가 지워졌습니다.',

    // ── Paste Preview ─────────────────────────────────────────────────────────
    pastePreviewTitle: '붙여넣기 미리 보기',
    pastePreviewLines: '{count}줄',
    pastePreviewDontShow: '다시 표시하지 않음',
    pastePreviewCancel: '취소',
    pastePreviewPaste: '붙여넣기',

    // ── Error messages ───────────────────────────────────────────────────────
    errorUnknownShell: '알 수 없는 셸: {shell}',
    errorConnectionNotFound: '연결을 찾을 수 없습니다.',
    errorGroupNotFound: '그룹을 찾을 수 없습니다.',
    errorConfigNotFound: '설정 파일을 찾을 수 없습니다: {path}',
    errorNoMasterPassword: '마스터 암호가 설정되지 않았습니다.',

    // ── Language ─────────────────────────────────────────────────────────────
    optionsTitleLanguage: '언어',

    // ── About ────────────────────────────────────────────────────────────────
    optionsTitleAbout: '정보',
    aboutDescription: 'EchoTerm — 에코 입력을 지원하는 분할 보기 터미널 앱',
    aboutVersion: '버전',

    // ── Dialog buttons ───────────────────────────────────────────────────────
    genericSave: '저장',
    genericCancel: '취소',

    // ── SSH Header Dropdown ─────────────────────────────────────────────────
    sshDropdownSshLabel: '.SSH',
    sshDropdownCreate: '만들기',
    sshDropdownImportBtn: '가져오기',
    sshDropdownUpdateBtn: '업데이트',
    sshDropdownExportBtn: '내보내기',
    sshDropdownConnBtn: '연결',
    sshDropdownFolderBtn: '폴더',
    sshDropdownUserBtn: '사용자',

    // ── SSH Import Diff Labels ──────────────────────────────────────────────
    sshImportDiffHost: '호스트',
    sshImportDiffUser: '사용자',
    sshImportDiffJump: '점프',
    sshImportDiffOptions: '옵션',
    sshImportDiffNone: '(없음)',
    sshImportDefaultUserName: '기본값',

    // ── SSH Delete Type Labels ──────────────────────────────────────────────
    sshDeleteTypeFolder: '폴더',
    sshDeleteTypeConnection: '연결',
    sshDeleteTypeUser: '사용자',
  });

})();

export {};
