/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Vietnamese / Tiếng Việt translations
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  window.App.i18n.registerLocale('vi', {

    // ── Locale metadata ─────────────────────────────────────────────────────
    _langName: 'Tiếng Việt',

    // ── App / Shells ─────────────────────────────────────────────────────────
    appTitle: 'EchoTerm',
    gitBashNotFound: '⚠ Không tìm thấy Git Bash',
    shellPowerShell: 'PowerShell',
    shellCmd: 'CMD',
    shellGitBash: 'Git Bash',
    shellSsh: 'SSH',

    // ── Toolbar ──────────────────────────────────────────────────────────────
    toolbarSidebarToggle: 'Thanh bên (Ctrl+Shift+S)',
    toolbarSettings: 'Cài đặt',
    winMinimizeTitle: 'Thu nhỏ',
    winMaximizeTitle: 'Phóng to',
    winRestoreTitle: 'Khôi phục',

    // ── New Terminal Dropdown ────────────────────────────────────────────────
    newTerminalTitle: 'Terminal mới (Ctrl+N)',
    newTermDropdownTitle: 'Chọn loại terminal',
    powershellLabel: 'PowerShell',
    cmdLabel: 'CMD',
    gitBashLabel: 'Git Bash',

    // ── Echo buttons ─────────────────────────────────────────────────────────
    echoEnableAll: 'Bật tất cả',
    echoDisableAll: 'Tắt tất cả',
    echoToggleAll: 'Chuyển đổi tất cả',
    echoPasteAll: 'Dán vào tất cả',
    echoLabel: 'Tiếng vọng',
    echoLabelOn: 'Tiếng vọng: BẬT',
    echoModeTitleOff: 'Chế độ tiếng vọng',
    echoEnableAllTitle: 'Bật tiếng vọng trên tất cả terminal',
    echoToggleAllTitle: 'Chuyển đổi trạng thái tiếng vọng của từng terminal',
    echoPasteAllTitle: 'Dán vào tất cả terminal đã bật tiếng vọng',

    // ── Group bar ────────────────────────────────────────────────────────────
    groupDefaultName: 'Nhóm {n}',
    newGroupTitle: 'Nhóm mới (Ctrl+Shift+N)',
    closeGroupTitle: 'Đóng nhóm',

    // ── Tab ──────────────────────────────────────────────────────────────────
    tabCloseTitle: 'Đóng',

    // ── Pane titlebar ────────────────────────────────────────────────────────
    panePasteTitle: 'Dán',
    paneEchoTitle: 'Tiếng vọng đầu vào tới terminal này',
    paneEchoLabel: 'Tiếng vọng',
    paneCloseTitle: 'Đóng',
    paneDismissTitle: 'Đóng',

    // ── Status bar ───────────────────────────────────────────────────────────
    statusTerminalCount: 'Terminal: {count}',
    statusTerminalPlural: '',
    statusEchoOff: 'Tiếng vọng: TẮT',
    statusEchoOn: 'Tiếng vọng: BẬT',
    statusEchoOnSelected: 'Tiếng vọng: BẬT ({count} đã chọn)',
    statusShell: 'Shell: {shell}',

    // ── Toast messages ───────────────────────────────────────────────────────
    toastDefaultShell: 'Mặc định: {shell}',
    toastGitBashNotFound: 'Không tìm thấy Git Bash. Vui lòng định vị bash.exe để mở terminal Git Bash.',
    toastTerminalExited: 'Terminal đã thoát. Đang mở terminal mới...',
    toastNeedTwoTerminals: 'Cần ít nhất 2 terminal trong nhóm này để dùng chế độ tiếng vọng.',
    toastCannotDeleteLastGroup: 'Không thể xóa nhóm cuối cùng.',
    toastError: 'Lỗi: {message}',
    toastSshError: 'Lỗi SSH: {message}',
    toastSshErrorNamed: 'Lỗi SSH ({name}): {message}',
    toastSkipped: 'Đã bỏ qua {name}: {message}',
    toastImported: 'Đã nhập {list}.',
    toastImportedNew: '{count} mới',
    toastImportedUpdated: '{count} đã cập nhật',
    toastSshExported: 'Đã xuất cấu hình SSH tới {path}.',
    toastAlreadyRunning: 'EchoTerm đang chạy.',

    // ── Context menus ────────────────────────────────────────────────────────
    ctxCopy: 'Sao chép',
    ctxPaste: 'Dán',
    ctxPasteAll: 'Dán vào tất cả',
    ctxToggleEcho: 'Chuyển đổi tiếng vọng',
    ctxClosePane: 'Đóng khung',
    tabCtxRename: 'Đổi tên tab',
    tabCtxClose: 'Đóng tab',
    tabCtxCloseSelected: 'Đóng các tab đã chọn',
    tabCtxCloseOthers: 'Đóng các tab khác',
    tabCtxMoveToGroup: 'Chuyển tới nhóm',
    tabCtxSubmenuArrow: '▶',
    groupCtxRename: 'Đổi tên nhóm',
    groupCtxDelete: 'Đóng nhóm',
    groupCtxCloseTerminals: 'Đóng tất cả terminal',

    // ── Confirm dialogs ──────────────────────────────────────────────────────
    confirmCancel: 'Hủy',
    confirmClose: 'Đóng',
    confirmDelete: 'Xóa',
    confirmDontShowAgain: 'Không hiển thị lại',
    confirmCloseTerminal: 'Đóng terminal này?\nPhiên sẽ bị chấm dứt.',
    confirmCloseSelectedTerminals: 'Đóng {count} terminal đã chọn?\nTất cả phiên sẽ bị chấm dứt.',
    confirmCloseOtherTerminals: 'Đóng {count} terminal khác?\nTất cả phiên sẽ bị chấm dứt.',
    confirmCloseGroup: 'Đóng nhóm "{name}"?',
    confirmCloseGroupWithTerminals: 'Đóng nhóm "{name}"?\n{count} terminal sẽ được đóng.',
    confirmCloseApp: 'Đóng EchoTerm?\nTất cả phiên terminal sẽ bị chấm dứt.',
    confirmCloseAllGroupTerminals: 'Đóng tất cả {count} terminal trong nhóm "{name}"?\nTất cả phiên sẽ bị chấm dứt.',
    confirmDeleteSshConnection: 'Xóa kết nối SSH "{name}"?',
    confirmDeleteSshFolder: 'Xóa thư mục SSH "{name}"?\nCác thư mục con cũng sẽ bị xóa. Các kết nối sẽ không bị xóa.',
    confirmDeleteSshUser: 'Xóa người dùng SSH "{name}"?\nCác kết nối dùng người dùng này sẽ cần được gán lại.',
    confirmDeleteMultiSsh: 'Xóa {count} mục SSH?',
    confirmJumpHostsMissing: 'Các máy chủ trung gian sau chưa được chọn:\n\n{names}\n\nVẫn nhập?',

    // ── SSH Sidebar ──────────────────────────────────────────────────────────
    sshSidebarTitle: 'SSH',
    sshPasswordBtnTitle: 'Đặt/Đổi mật khẩu chính',
    sshImportBtnTitle: 'Nhập mới từ ~/.ssh/config',
    sshUpdateBtnTitle: 'Cập nhật các mục hiện có từ ~/.ssh/config',
    sshExportBtnTitle: 'Xuất kết nối tới tệp cấu hình SSH',
    sshNewConnBtnTitle: 'Kết nối mới',
    sshNewFolderBtnTitle: 'Thư mục mới',
    sshNewUserBtnTitle: 'Người dùng mới',
    sshMenuTitle: 'Thao tác',
    sshSearchPlaceholder: 'Tìm kiếm...',
    sshSectionConnections: 'Kết nối',
    sshSectionUsers: 'Người dùng',
    sshNoConnections: 'Chưa có kết nối nào.\nNhấn + để thêm.',
    sshNoUsers: 'Chưa có người dùng nào.\nNhấn + để thêm.',
    sshFolderOpenAllTitle: 'Mở tất cả',
    sshFolderEditTitle: 'Sửa',
    sshFolderDeleteTitle: 'Xóa',
    sshItemConnectTitle: 'Kết nối',
    sshItemEditTitle: 'Sửa',
    sshItemDeleteTitle: 'Xóa',
    sshItemAuthKeyfile: '🔑',
    sshItemAuthPassword: '🔒',
    sshItemConnIcon: '🖥️',

    // ── SSH Dialogs ──────────────────────────────────────────────────────────
    sshDialogTitleNewConn: 'Kết nối mới',
    sshDialogTitleEditConn: 'Sửa kết nối',
    sshDialogTitleNewFolder: 'Thư mục mới',
    sshDialogTitleEditFolder: 'Sửa thư mục',
    sshDialogTitleNewUser: 'Người dùng mới',
    sshDialogTitleEditUser: 'Sửa người dùng',
    sshDialogSave: 'Lưu',
    sshDialogCancel: 'Hủy',
    sshFormName: 'Tên',
    sshFormHost: 'Máy chủ',
    sshFormPort: 'Cổng',
    sshFormUser: 'Người dùng',
    sshFolderOptional: 'Thư mục (tùy chọn)',
    sshFormSelectUser: '-- Chọn người dùng --',
    sshFormNone: '-- Không có --',
    sshFormJumpHostOptional: 'Máy chủ trung gian (tùy chọn)',
    sshFormJumpType: 'Loại',
    sshFormJumpNone: 'Không (kết nối trực tiếp)',
    sshFormJumpManual: 'Nhập thủ công',
    sshFormJumpReference: 'Chọn kết nối đã lưu',
    sshFormJumpHost: 'Máy chủ trung gian',
    sshFormJumpPort: 'Cổng trung gian',
    sshFormJumpUsername: 'Tên người dùng trung gian',
    sshFormJumpViaConnection: 'Nhảy qua kết nối',
    sshFormSelectConnection: '-- Chọn kết nối --',
    sshFormAdvancedOptional: 'Tùy chọn nâng cao (tùy chọn)',
    sshFormHostKeyAlgorithms: 'Thuật toán khóa máy chủ',
    sshFormKexAlgorithms: 'Thuật toán trao đổi khóa',
    sshFormPubkeyAcceptedAlgorithms: 'Thuật toán khóa công khai',
    sshFormUsername: 'Tên người dùng',
    sshFormAuthType: 'Xác thực',
    sshFormAuthPassword: 'Mật khẩu',
    sshFormAuthKeyfile: 'Tệp khóa',
    sshFormPassword: 'Mật khẩu',
    sshFormPasswordUnchanged: '(không đổi nếu để trống)',
    sshFormKeyFilePath: 'Đường dẫn tệp khóa',
    sshFormKeyPassphrase: 'Cụm mật khẩu khóa',
    sshFormKeyPassphraseOptional: '(tùy chọn)',
    sshFolderName: 'Tên thư mục',
    sshFolderParent: 'Thư mục cha',
    sshFolderParentNone: '(không có — cấp gốc)',
    sshPasswordUnlockTitle: 'Mở khóa kết nối SSH',
    sshPasswordSetupTitle: 'Bảo vệ kết nối SSH',
    sshPasswordChangeTitle: 'Đổi mật khẩu chính',
    sshPasswordLabel: 'Mật khẩu chính',
    sshPasswordPlaceholderUnlock: 'Nhập mật khẩu chính',
    sshPasswordPlaceholderNew: 'Nhập mật khẩu chính mới',
    sshPasswordConfirmLabel: 'Xác nhận mật khẩu',
    sshPasswordConfirmPlaceholder: 'Xác nhận mật khẩu chính',
    sshPasswordBtnUnlock: 'Mở khóa',
    sshPasswordBtnSet: 'Đặt mật khẩu',
    sshPasswordBtnChange: 'Đổi mật khẩu',
    sshPasswordBtnUseOs: 'Dùng mã hóa hệ điều hành',
    sshPasswordEmpty: 'Mật khẩu không được để trống.',
    sshPasswordMismatch: 'Mật khẩu không khớp.',
    sshPasswordIncorrect: 'Sai mật khẩu.',
    sshPasswordDecryptFailed: 'Không giải mã được dữ liệu. Tệp có thể đã bị hỏng.',
    sshMasterPasswordRequired: 'Cần mật khẩu chính. Dữ liệu đang được mã hóa.',
    sshPasswordLockedIcon: '🔒',
    sshPasswordUnlockedIcon: '🔓',
    sshPasswordBtnChangeTitle: 'Đổi mật khẩu chính',
    sshPasswordBtnSetTitle: 'Đặt mật khẩu chính',

    // ── SSH Import ───────────────────────────────────────────────────────────
    sshImportTitle: 'Nhập từ ~/.ssh/config',
    sshImportUpdateTitle: 'Cập nhật từ ~/.ssh/config',
    sshImportBtnImport: 'Nhập các mục đã chọn',
    sshImportBtnUpdate: 'Cập nhật các mục đã chọn',
    sshImportUpdateFieldsTitle: 'Cập nhật các trường này:',
    sshImportFieldHost: 'Tên máy chủ / Cổng',
    sshImportFieldUser: 'Người dùng',
    sshImportFieldJump: 'Máy chủ trung gian',
    sshImportFieldOptions: 'Tùy chọn thuật toán',
    sshImportAuthKeyfile: 'khóa: {file}',
    sshImportAuthPassword: 'mật khẩu',
    sshImportJumpVia: '↪ qua {host}',
    sshImportJumpNotInConfig: ' (không có trong cấu hình)',
    sshImportNoNewHosts: 'Không tìm thấy máy chủ mới. Tất cả đã được nhập.',
    sshImportNoExistingToUpdate: 'Không tìm thấy kết nối hiện có trong cấu hình SSH để cập nhật.',
    sshImportNoHosts: 'Không tìm thấy máy chủ nào trong cấu hình SSH.',

    // ── SSH Context Menu ─────────────────────────────────────────────────────
    sshCtxAddConn: 'Thêm kết nối',
    sshCtxAddSubFolder: 'Thêm thư mục con',
    sshCtxAddParentFolder: 'Thêm thư mục cha',
    sshCtxConnect: 'Kết nối',
    sshCtxEdit: 'Sửa',
    sshCtxMoveToFolder: 'Chuyển tới thư mục',
    sshCtxDelete: 'Xóa',
    sshCtxOpenAll: 'Mở tất cả kết nối',
    sshCtxConnectAll: 'Kết nối tất cả ({count})',
    sshCtxDeleteSelected: 'Xóa các mục đã chọn ({count})',
    sshCtxOpenAllMulti: 'Mở tất cả ({count})',
    sshCtxDuplicate: 'Nhân bản',
    sshCtxDuplicateSelected: 'Nhân bản các mục đã chọn ({count})',
    sshCtxNoOtherFolders: 'Không có thư mục khác',

    // ── Settings / Options Panel ──────────────────────────────────────────────
    optionsTitleAppearance: 'Giao diện',
    optionsThemeDark: 'Tối',
    optionsThemeLight: 'Sáng',
    optionsUiFontSize: 'Cỡ chữ giao diện',
    optionsTermFontSize: 'Cỡ chữ terminal',
    optionsTitleDefaultShell: 'Shell mặc định',
    optionsTitleWarnings: 'Cảnh báo',
    optionsTitleMouse: 'Chuột',
    optionsTabCloseConfirm: 'Xác nhận trước khi đóng tab',
    optionsWindowCloseConfirm: 'Xác nhận trước khi đóng cửa sổ',
    optionsGroupCloseConfirm: 'Xác nhận trước khi xóa nhóm',
    optionsSshJumpWarn: 'Cảnh báo về máy chủ trung gian chưa chọn khi nhập SSH',
    optionsPastePreview: 'Xác nhận trước khi dán nội dung nhiều dòng',
    optionsRightClickPaste: 'Nhấp chuột phải để sao chép / dán',

    // ── Danger Zone ──────────────────────────────────────────────────────────
    optionsTitleDanger: 'Vùng nguy hiểm',
    optionsResetSettings: 'Đặt lại tất cả cài đặt',
    optionsClearSshData: 'Xóa tất cả kết nối SSH',
    confirmResetSettings: 'Đặt lại tất cả cài đặt về mặc định?\nHành động này không thể hoàn tác.',
    confirmClearSshData: 'Xóa tất cả kết nối, người dùng và thư mục SSH đã lưu?\nHành động này không thể hoàn tác.',
    confirmReset: 'Đặt lại',
    toastSettingsReset: 'Đã đặt lại tất cả cài đặt.',
    toastSshDataCleared: 'Đã xóa tất cả kết nối SSH.',
    optionsClearAllData: 'Xóa tất cả dữ liệu và khởi động lại',
    confirmClearAllData: 'Xóa tất cả dữ liệu và khởi động lại EchoTerm?\nTất cả cài đặt và kết nối SSH sẽ bị xóa vĩnh viễn.',
    optionsClearCache: 'Xóa tất cả bộ nhớ đệm',
    confirmClearCache: 'Xóa bộ nhớ đệm của ứng dụng?\nThao tác này không ảnh hưởng đến cài đặt hoặc kết nối SSH của bạn.',
    confirmClear: 'Xóa',
    toastCacheCleared: 'Đã xóa bộ nhớ đệm của ứng dụng.',

    // ── Paste Preview ─────────────────────────────────────────────────────────
    pastePreviewTitle: 'Xem trước khi dán',
    pastePreviewLines: '{count} dòng',
    pastePreviewDontShow: 'Không hiển thị lại',
    pastePreviewCancel: 'Hủy',
    pastePreviewPaste: 'Dán',

    // ── Error messages ───────────────────────────────────────────────────────
    errorUnknownShell: 'Shell không xác định: {shell}',
    errorConnectionNotFound: 'Không tìm thấy kết nối.',
    errorGroupNotFound: 'Không tìm thấy nhóm.',
    errorConfigNotFound: 'Không tìm thấy tệp cấu hình: {path}',
    errorNoMasterPassword: 'Chưa đặt mật khẩu chính.',

    // ── Language ─────────────────────────────────────────────────────────────
    optionsTitleLanguage: 'Ngôn ngữ',

    // ── About ────────────────────────────────────────────────────────────────
    optionsTitleAbout: 'Giới thiệu',
    aboutDescription: 'EchoTerm — ứng dụng terminal chia màn hình với nhập echo',
    aboutVersion: 'Phiên bản',

    // ── Dialog buttons ───────────────────────────────────────────────────────
    genericSave: 'Lưu',
    genericCancel: 'Hủy',

    // ── SSH Header Dropdown ─────────────────────────────────────────────────
    sshDropdownSshLabel: '.SSH',
    sshDropdownCreate: 'Tạo',
    sshDropdownImportBtn: 'Nhập',
    sshDropdownUpdateBtn: 'Cập nhật',
    sshDropdownExportBtn: 'Xuất',
    sshDropdownConnBtn: 'Kết nối',
    sshDropdownFolderBtn: 'Thư mục',
    sshDropdownUserBtn: 'Người dùng',

    // ── SSH Import Diff Labels ──────────────────────────────────────────────
    sshImportDiffHost: 'Máy chủ',
    sshImportDiffUser: 'Người dùng',
    sshImportDiffJump: 'Trung gian',
    sshImportDiffOptions: 'Tùy chọn',
    sshImportDiffNone: '(không có)',
    sshImportDefaultUserName: 'mặc định',

    // ── SSH Delete Type Labels ──────────────────────────────────────────────
    sshDeleteTypeFolder: 'thư mục',
    sshDeleteTypeConnection: 'kết nối',
    sshDeleteTypeUser: 'người dùng',
  });

})();

export {};
