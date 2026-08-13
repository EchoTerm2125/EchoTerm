/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Russian / Русский translations
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  window.App.i18n.registerLocale('ru', {

    // ── Locale metadata ─────────────────────────────────────────────────────
    _langName: 'Русский',

    // ── App / Shells ─────────────────────────────────────────────────────────
    appTitle: 'EchoTerm',
    gitBashNotFound: '⚠ Git Bash не найден',
    shellPowerShell: 'PowerShell',
    shellCmd: 'CMD',
    shellGitBash: 'Git Bash',
    shellSsh: 'SSH',

    // ── Toolbar ──────────────────────────────────────────────────────────────
    toolbarSidebarToggle: 'Боковая панель (Ctrl+Shift+S)',
    toolbarSettings: 'Настройки',
    winMinimizeTitle: 'Свернуть',
    winMaximizeTitle: 'Развернуть',
    winRestoreTitle: 'Восстановить',

    // ── New Terminal Dropdown ────────────────────────────────────────────────
    newTerminalTitle: 'Новый терминал (Ctrl+Shift+N)',
    newTermDropdownTitle: 'Выберите тип терминала',
    powershellLabel: 'PowerShell',
    cmdLabel: 'CMD',
    gitBashLabel: 'Git Bash',

    // ── Echo buttons ─────────────────────────────────────────────────────────
    echoEnableAll: 'Включить все',
    echoDisableAll: 'Отключить все',
    echoToggleAll: 'Переключить все',
    echoPasteAll: 'Вставить во все',
    echoLabel: 'Эхо',
    echoLabelOn: 'Эхо ВКЛ',
    echoModeTitleOff: 'Режим эхо',
    echoEnableAllTitle: 'Включить эхо на всех терминалах',
    echoToggleAllTitle: 'Переключить состояние эхо на каждом терминале',
    echoPasteAllTitle: 'Вставить во все терминалы с включённым эхо',

    // ── Group bar ────────────────────────────────────────────────────────────
    groupDefaultName: 'Группа {n}',
    newGroupTitle: 'Новая группа',
    closeGroupTitle: 'Закрыть группу',

    // ── Tab ──────────────────────────────────────────────────────────────────
    tabCloseTitle: 'Закрыть',

    // ── Pane titlebar ────────────────────────────────────────────────────────
    panePasteTitle: 'Вставить',
    paneEchoTitle: 'Эхо ввода в этот терминал',
    paneEchoLabel: 'Эхо',
    paneCloseTitle: 'Закрыть',
    paneDismissTitle: 'Закрыть',

    // ── Status bar ───────────────────────────────────────────────────────────
    statusTerminalCount: 'Терминалов: {count}',
    statusTerminalPlural: '',
    statusEchoOff: 'Эхо: ВЫКЛ',
    statusEchoOn: 'Эхо: ВКЛ',
    statusEchoOnSelected: 'Эхо: ВКЛ (выбрано: {count})',
    statusShell: 'Оболочка: {shell}',

    // ── Toast messages ───────────────────────────────────────────────────────
    toastDefaultShell: 'По умолчанию: {shell}',
    toastGitBashNotFound: 'Git Bash не найден. Укажите путь к bash.exe, чтобы открыть терминал Git Bash.',
    toastTerminalExited: 'Терминал завершён. Запуск нового...',
    toastNeedTwoTerminals: 'Для режима эхо в этой группе нужно как минимум 2 терминала.',
    toastCannotDeleteLastGroup: 'Нельзя удалить последнюю группу.',
    toastError: 'Ошибка: {message}',
    toastSshError: 'Ошибка SSH: {message}',
    toastSshErrorNamed: 'Ошибка SSH ({name}): {message}',
    toastSkipped: 'Пропущено {name}: {message}',
    toastImported: 'Импортировано: {list}.',
    toastImportedNew: 'новых: {count}',
    toastImportedUpdated: 'обновлено: {count}',
    toastSshExported: 'Конфигурация SSH экспортирована в {path}.',
    toastAlreadyRunning: 'EchoTerm уже запущен.',

    // ── Context menus ────────────────────────────────────────────────────────
    ctxCopy: 'Копировать',
    ctxPaste: 'Вставить',
    ctxPasteAll: 'Вставить во все',
    ctxToggleEcho: 'Переключить эхо',
    ctxClosePane: 'Закрыть панель',
    tabCtxRename: 'Переименовать вкладку',
    tabCtxClose: 'Закрыть вкладку',
    tabCtxCloseSelected: 'Закрыть выбранные',
    tabCtxCloseOthers: 'Закрыть остальные',
    tabCtxMoveToGroup: 'Переместить в группу',
    tabCtxSubmenuArrow: '▶',
    groupCtxRename: 'Переименовать группу',
    groupCtxDelete: 'Закрыть группу',
    groupCtxCloseTerminals: 'Закрыть все терминалы',

    // ── Confirm dialogs ──────────────────────────────────────────────────────
    confirmCancel: 'Отмена',
    confirmClose: 'Закрыть',
    confirmDelete: 'Удалить',
    confirmDontShowAgain: 'Больше не показывать',
    confirmCloseTerminal: 'Закрыть этот терминал?\nСеанс будет завершён.',
    confirmCloseSelectedTerminals: 'Закрыть выбранные терминалы ({count})?\nВсе сеансы будут завершены.',
    confirmCloseOtherTerminals: 'Закрыть остальные терминалы ({count})?\nВсе сеансы будут завершены.',
    confirmCloseGroup: 'Закрыть группу «{name}»?',
    confirmCloseGroupWithTerminals: 'Закрыть группу «{name}»?\nБудет закрыто терминалов: {count}.',
    confirmCloseApp: 'Закрыть EchoTerm?\nВсе терминальные сеансы будут завершены.',
    confirmCloseAllGroupTerminals: 'Закрыть все терминалы ({count}) в группе «{name}»?\nВсе сеансы будут завершены.',
    confirmDeleteSshConnection: 'Удалить SSH-подключение «{name}»?',
    confirmDeleteSshFolder: 'Удалить SSH-папку «{name}»?\nВложенные папки также будут удалены. Подключения не будут удалены.',
    confirmDeleteSshUser: 'Удалить SSH-пользователя «{name}»?\nПодключения, использующие этого пользователя, потребуется переназначить.',
    confirmDeleteMultiSsh: 'Удалить SSH-элементы ({count})?',
    confirmJumpHostsMissing: 'Следующие хосты перехода не выбраны:\n\n{names}\n\nВсё равно импортировать?',

    // ── SSH Sidebar ──────────────────────────────────────────────────────────
    sshSidebarTitle: 'SSH',
    sshPasswordBtnTitle: 'Задать/Изменить мастер-пароль',
    sshImportBtnTitle: 'Импортировать новые из ~/.ssh/config',
    sshUpdateBtnTitle: 'Обновить существующие из ~/.ssh/config',
    sshExportBtnTitle: 'Экспортировать подключения в файл конфигурации SSH',
    sshNewConnBtnTitle: 'Новое подключение',
    sshNewFolderBtnTitle: 'Новая папка',
    sshNewUserBtnTitle: 'Новый пользователь',
    sshMenuTitle: 'Действия',
    sshSearchPlaceholder: 'Поиск...',
    sshSectionConnections: 'Подключения',
    sshSectionUsers: 'Пользователи',
    sshNoConnections: 'Подключений пока нет.\nНажмите +, чтобы добавить.',
    sshNoUsers: 'Пользователей пока нет.\nНажмите +, чтобы добавить.',
    sshFolderOpenAllTitle: 'Открыть все',
    sshFolderEditTitle: 'Изменить',
    sshFolderDeleteTitle: 'Удалить',
    sshItemConnectTitle: 'Подключиться',
    sshItemEditTitle: 'Изменить',
    sshItemDeleteTitle: 'Удалить',
    sshItemAuthKeyfile: '🔑',
    sshItemAuthPassword: '🔒',
    sshItemConnIcon: '🖥️',

    // ── SSH Dialogs ──────────────────────────────────────────────────────────
    sshDialogTitleNewConn: 'Новое подключение',
    sshDialogTitleEditConn: 'Изменить подключение',
    sshDialogTitleNewFolder: 'Новая папка',
    sshDialogTitleEditFolder: 'Изменить папку',
    sshDialogTitleNewUser: 'Новый пользователь',
    sshDialogTitleEditUser: 'Изменить пользователя',
    sshDialogSave: 'Сохранить',
    sshDialogCancel: 'Отмена',
    sshFormName: 'Имя',
    sshFormHost: 'Хост',
    sshFormPort: 'Порт',
    sshFormUser: 'Пользователь',
    sshFolderOptional: 'Папка (необязательно)',
    sshFormSelectUser: '-- Выберите пользователя --',
    sshFormNone: '-- Нет --',
    sshFormJumpHostOptional: 'Хост перехода (необязательно)',
    sshFormJumpType: 'Тип',
    sshFormJumpNone: 'Нет (прямое подключение)',
    sshFormJumpManual: 'Ввести вручную',
    sshFormJumpReference: 'Выбрать сохранённое подключение',
    sshFormJumpHost: 'Хост перехода',
    sshFormJumpPort: 'Порт перехода',
    sshFormJumpUsername: 'Пользователь перехода',
    sshFormJumpViaConnection: 'Переход через подключение',
    sshFormSelectConnection: '-- Выберите подключение --',
    sshFormAdvancedOptional: 'Дополнительные параметры (необязательно)',
    sshFormHostKeyAlgorithms: 'Алгоритмы ключей хоста',
    sshFormKexAlgorithms: 'Алгоритмы обмена ключами',
    sshFormPubkeyAcceptedAlgorithms: 'Алгоритмы открытых ключей',
    sshFormUsername: 'Имя пользователя',
    sshFormAuthType: 'Аутентификация',
    sshFormAuthPassword: 'Пароль',
    sshFormAuthKeyfile: 'Файл ключа',
    sshFormPassword: 'Пароль',
    sshFormPasswordUnchanged: '(не изменится, если оставить пустым)',
    sshFormKeyFilePath: 'Путь к файлу ключа',
    sshFormKeyPassphrase: 'Парольная фраза ключа',
    sshFormKeyPassphraseOptional: '(необязательно)',
    sshFolderName: 'Имя папки',
    sshFolderParent: 'Родительская папка',
    sshFolderParentNone: '(нет — корневой уровень)',
    sshPasswordUnlockTitle: 'Разблокировать SSH-подключения',
    sshPasswordSetupTitle: 'Защитить SSH-подключения',
    sshPasswordChangeTitle: 'Изменить мастер-пароль',
    sshPasswordLabel: 'Мастер-пароль',
    sshPasswordPlaceholderUnlock: 'Введите мастер-пароль',
    sshPasswordPlaceholderNew: 'Введите новый мастер-пароль',
    sshPasswordConfirmLabel: 'Подтвердите пароль',
    sshPasswordConfirmPlaceholder: 'Подтвердите мастер-пароль',
    sshPasswordBtnUnlock: 'Разблокировать',
    sshPasswordBtnSet: 'Задать пароль',
    sshPasswordBtnChange: 'Изменить пароль',
    sshPasswordBtnUseOs: 'Использовать шифрование ОС',
    sshPasswordEmpty: 'Пароль не может быть пустым.',
    sshPasswordMismatch: 'Пароли не совпадают.',
    sshPasswordIncorrect: 'Неверный пароль.',
    sshPasswordDecryptFailed: 'Не удалось расшифровать данные. Возможно, файл повреждён.',
    sshMasterPasswordRequired: 'Требуется мастер-пароль. Данные зашифрованы.',
    sshPasswordLockedIcon: '🔒',
    sshPasswordUnlockedIcon: '🔓',
    sshPasswordBtnChangeTitle: 'Изменить мастер-пароль',
    sshPasswordBtnSetTitle: 'Задать мастер-пароль',

    // ── SSH Import ───────────────────────────────────────────────────────────
    sshImportTitle: 'Импорт из ~/.ssh/config',
    sshImportUpdateTitle: 'Обновить из ~/.ssh/config',
    sshImportBtnImport: 'Импортировать выбранные',
    sshImportBtnUpdate: 'Обновить выбранные',
    sshImportUpdateFieldsTitle: 'Обновить эти поля:',
    sshImportFieldHost: 'Имя хоста / Порт',
    sshImportFieldUser: 'Пользователь',
    sshImportFieldJump: 'Хост перехода',
    sshImportFieldOptions: 'Параметры алгоритмов',
    sshImportAuthKeyfile: 'ключ: {file}',
    sshImportAuthPassword: 'пароль',
    sshImportJumpVia: '↪ через {host}',
    sshImportJumpNotInConfig: ' (нет в конфигурации)',
    sshImportNoNewHosts: 'Новые хосты не найдены. Все уже импортированы.',
    sshImportNoExistingToUpdate: 'В конфигурации SSH не найдено существующих подключений для обновления.',
    sshImportNoHosts: 'В конфигурации SSH не найдено хостов.',

    // ── SSH Context Menu ─────────────────────────────────────────────────────
    sshCtxConnect: 'Подключиться',
    sshCtxEdit: 'Изменить',
    sshCtxMoveToFolder: 'Переместить в папку',
    sshCtxDelete: 'Удалить',
    sshCtxOpenAll: 'Открыть все подключения',
    sshCtxConnectAll: 'Подключить все ({count})',
    sshCtxDeleteSelected: 'Удалить выбранные ({count})',
    sshCtxOpenAllMulti: 'Открыть все ({count})',
    sshCtxDuplicate: 'Дублировать',
    sshCtxDuplicateSelected: 'Дублировать выбранные ({count})',
    sshCtxNoOtherFolders: 'Других папок нет',

    // ── Settings / Options Panel ──────────────────────────────────────────────
    optionsTitleAppearance: 'Внешний вид',
    optionsThemeDark: 'Тёмная',
    optionsThemeLight: 'Светлая',
    optionsUiFontSize: 'Размер шрифта интерфейса',
    optionsTermFontSize: 'Размер шрифта терминала',
    optionsTitleDefaultShell: 'Оболочка по умолчанию',
    optionsTitleWarnings: 'Предупреждения',
    optionsTitleMouse: 'Мышь',
    optionsTabCloseConfirm: 'Подтверждать закрытие вкладки',
    optionsWindowCloseConfirm: 'Подтверждать закрытие окна',
    optionsGroupCloseConfirm: 'Подтверждать удаление группы',
    optionsSshJumpWarn: 'Предупреждать о невыбранных хостах перехода при импорте SSH',
    optionsPastePreview: 'Подтверждать вставку многострочного содержимого',
    optionsRightClickPaste: 'Правый клик для копирования / вставки',

    // ── Danger Zone ──────────────────────────────────────────────────────────
    optionsTitleDanger: 'Опасная зона',
    optionsResetSettings: 'Сбросить все настройки',
    optionsClearSshData: 'Очистить все SSH-соединения',
    confirmResetSettings: 'Сбросить все настройки к значениям по умолчанию?\nЭто действие нельзя отменить.',
    confirmClearSshData: 'Удалить все сохранённые SSH-соединения, пользователей и папки?\nЭто действие нельзя отменить.',
    confirmReset: 'Сбросить',
    toastSettingsReset: 'Все настройки сброшены.',
    toastSshDataCleared: 'Все SSH-соединения очищены.',
    optionsClearAllData: 'Очистить все данные и перезапустить',
    confirmClearAllData: 'Очистить все данные и перезапустить EchoTerm?\nВсе настройки и SSH-соединения будут безвозвратно удалены.',
    optionsClearCache: 'Очистить весь кэш',
    confirmClearCache: 'Очистить кэш приложения?\nЭто не повлияет на ваши настройки или SSH-соединения.',
    confirmClear: 'Очистить',
    toastCacheCleared: 'Кэш приложения очищен.',

    // ── Paste Preview ─────────────────────────────────────────────────────────
    pastePreviewTitle: 'Предпросмотр вставки',
    pastePreviewLines: 'строк: {count}',
    pastePreviewDontShow: 'Больше не показывать',
    pastePreviewCancel: 'Отмена',
    pastePreviewPaste: 'Вставить',

    // ── Error messages ───────────────────────────────────────────────────────
    errorUnknownShell: 'Неизвестная оболочка: {shell}',
    errorConnectionNotFound: 'Подключение не найдено.',
    errorGroupNotFound: 'Группа не найдена.',
    errorConfigNotFound: 'Файл конфигурации не найден: {path}',
    errorNoMasterPassword: 'Мастер-пароль не задан.',

    // ── Language ─────────────────────────────────────────────────────────────
    optionsTitleLanguage: 'Язык',

    // ── About ────────────────────────────────────────────────────────────────
    optionsTitleAbout: 'О программе',
    aboutDescription: 'EchoTerm — терминальное приложение с разделённым видом и эхо-вводом',
    aboutVersion: 'Версия',

    // ── Dialog buttons ───────────────────────────────────────────────────────
    genericSave: 'Сохранить',
    genericCancel: 'Отмена',

    // ── SSH Header Dropdown ─────────────────────────────────────────────────
    sshDropdownSshLabel: '.SSH',
    sshDropdownCreate: 'Создать',
    sshDropdownImportBtn: 'Импорт',
    sshDropdownUpdateBtn: 'Обновить',
    sshDropdownExportBtn: 'Экспорт',
    sshDropdownConnBtn: 'Подключение',
    sshDropdownFolderBtn: 'Папка',
    sshDropdownUserBtn: 'Пользователь',

    // ── SSH Import Diff Labels ──────────────────────────────────────────────
    sshImportDiffHost: 'Хост',
    sshImportDiffUser: 'Пользователь',
    sshImportDiffJump: 'Переход',
    sshImportDiffOptions: 'Параметры',
    sshImportDiffNone: '(нет)',
    sshImportDefaultUserName: 'по умолчанию',

    // ── SSH Delete Type Labels ──────────────────────────────────────────────
    sshDeleteTypeFolder: 'папка',
    sshDeleteTypeConnection: 'подключение',
    sshDeleteTypeUser: 'пользователь',
  });

})();

export {};
