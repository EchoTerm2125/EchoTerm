/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — German / Deutsch translations
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  window.App.i18n.registerLocale('de', {

    // ── Locale metadata ─────────────────────────────────────────────────────
    _langName: 'Deutsch',

    // ── App / Shells ─────────────────────────────────────────────────────────
    appTitle: 'EchoTerm',
    gitBashNotFound: '⚠ Git Bash nicht gefunden',
    shellPowerShell: 'PowerShell',
    shellCmd: 'CMD',
    shellGitBash: 'Git Bash',
    shellSsh: 'SSH',

    // ── Toolbar ──────────────────────────────────────────────────────────────
    toolbarSidebarToggle: 'Seitenleiste (Ctrl+Shift+S)',
    toolbarSettings: 'Einstellungen',
    winMinimizeTitle: 'Minimieren',
    winMaximizeTitle: 'Maximieren',
    winRestoreTitle: 'Wiederherstellen',

    // ── New Terminal Dropdown ────────────────────────────────────────────────
    newTerminalTitle: 'Neues Terminal (Ctrl+N)',
    newTermDropdownTitle: 'Terminaltyp auswählen',
    powershellLabel: 'PowerShell',
    cmdLabel: 'CMD',
    gitBashLabel: 'Git Bash',

    // ── Echo buttons ─────────────────────────────────────────────────────────
    echoEnableAll: 'Alle aktivieren',
    echoDisableAll: 'Alle deaktivieren',
    echoToggleAll: 'Alle umschalten',
    echoPasteAll: 'In alle einfügen',
    echoLabel: 'Echo',
    echoLabelOn: 'Echo EIN',
    echoModeTitleOff: 'Echo-Modus',
    echoEnableAllTitle: 'Echo auf allen Terminals aktivieren',
    echoToggleAllTitle: 'Echo-Zustand jedes Terminals umschalten',
    echoPasteAllTitle: 'In alle Terminals mit aktiviertem Echo einfügen',

    // ── Group bar ────────────────────────────────────────────────────────────
    groupDefaultName: 'Gruppe {n}',
    newGroupTitle: 'Neue Gruppe (Ctrl+Shift+N)',
    closeGroupTitle: 'Gruppe schließen',

    // ── Tab ──────────────────────────────────────────────────────────────────
    tabCloseTitle: 'Schließen',

    // ── Pane titlebar ────────────────────────────────────────────────────────
    panePasteTitle: 'Einfügen',
    paneEchoTitle: 'Echo-Eingabe in dieses Terminal',
    paneEchoLabel: 'Echo',
    paneCloseTitle: 'Schließen',
    paneDismissTitle: 'Schließen',

    // ── Status bar ───────────────────────────────────────────────────────────
    statusTerminalCount: 'Terminals: {count}',
    statusTerminalPlural: '',
    statusEchoOff: 'Echo: AUS',
    statusEchoOn: 'Echo: EIN',
    statusEchoOnSelected: 'Echo: EIN ({count} ausgewählt)',
    statusShell: 'Shell: {shell}',

    // ── Toast messages ───────────────────────────────────────────────────────
    toastDefaultShell: 'Standard: {shell}',
    toastGitBashNotFound: 'Git Bash nicht gefunden. Bitte geben Sie den Pfad zu bash.exe an, um ein Git-Bash-Terminal zu öffnen.',
    toastTerminalExited: 'Terminal beendet. Ein neues wird gestartet...',
    toastNeedTwoTerminals: 'Für den Echo-Modus werden mindestens 2 Terminals in dieser Gruppe benötigt.',
    toastCannotDeleteLastGroup: 'Die letzte Gruppe kann nicht gelöscht werden.',
    toastError: 'Fehler: {message}',
    toastSshError: 'SSH-Fehler: {message}',
    toastSshErrorNamed: 'SSH-Fehler ({name}): {message}',
    toastSkipped: '{name} übersprungen: {message}',
    toastImported: '{list} importiert.',
    toastImportedNew: '{count} neu',
    toastImportedUpdated: '{count} aktualisiert',
    toastSshExported: 'SSH-Konfiguration nach {path} exportiert.',
    toastAlreadyRunning: 'EchoTerm läuft bereits.',

    // ── Context menus ────────────────────────────────────────────────────────
    ctxCopy: 'Kopieren',
    ctxPaste: 'Einfügen',
    ctxPasteAll: 'In alle einfügen',
    ctxToggleEcho: 'Echo umschalten',
    ctxClosePane: 'Bereich schließen',
    tabCtxRename: 'Tab umbenennen',
    tabCtxClose: 'Tab schließen',
    tabCtxCloseSelected: 'Ausgewählte schließen',
    tabCtxCloseOthers: 'Andere schließen',
    tabCtxMoveToGroup: 'In Gruppe verschieben',
    tabCtxSubmenuArrow: '▶',
    groupCtxRename: 'Gruppe umbenennen',
    groupCtxDelete: 'Gruppe schließen',
    groupCtxCloseTerminals: 'Alle Terminals schließen',

    // ── Confirm dialogs ──────────────────────────────────────────────────────
    confirmCancel: 'Abbrechen',
    confirmClose: 'Schließen',
    confirmDelete: 'Löschen',
    confirmDontShowAgain: 'Nicht erneut anzeigen',
    confirmCloseTerminal: 'Dieses Terminal schließen?\nDie Sitzung wird beendet.',
    confirmCloseSelectedTerminals: 'Ausgewählte Terminals schließen ({count})?\nAlle Sitzungen werden beendet.',
    confirmCloseOtherTerminals: 'Andere Terminals schließen ({count})?\nAlle Sitzungen werden beendet.',
    confirmCloseGroup: 'Gruppe „{name}“ schließen?',
    confirmCloseGroupWithTerminals: 'Gruppe „{name}“ schließen?\n{count} Terminals werden geschlossen.',
    confirmCloseApp: 'EchoTerm schließen?\nAlle Terminalsitzungen werden beendet.',
    confirmCloseAllGroupTerminals: 'Alle {count} Terminals in Gruppe „{name}“ schließen?\nAlle Sitzungen werden beendet.',
    confirmDeleteSshConnection: 'SSH-Verbindung „{name}“ löschen?',
    confirmDeleteSshFolder: 'SSH-Ordner „{name}“ löschen?\nUnterordner werden ebenfalls gelöscht. Verbindungen werden nicht gelöscht.',
    confirmDeleteSshUser: 'SSH-Benutzer „{name}“ löschen?\nVerbindungen, die diesen Benutzer verwenden, müssen neu zugewiesen werden.',
    confirmDeleteMultiSsh: '{count} SSH-Elemente löschen?',
    confirmJumpHostsMissing: 'Die folgenden Sprunghosts sind nicht ausgewählt:\n\n{names}\n\nTrotzdem importieren?',

    // ── SSH Sidebar ──────────────────────────────────────────────────────────
    sshSidebarTitle: 'SSH',
    sshPasswordBtnTitle: 'Master-Passwort festlegen/ändern',
    sshImportBtnTitle: 'Neue aus ~/.ssh/config importieren',
    sshUpdateBtnTitle: 'Vorhandene aus ~/.ssh/config aktualisieren',
    sshExportBtnTitle: 'Verbindungen in SSH-Konfigurationsdatei exportieren',
    sshNewConnBtnTitle: 'Neue Verbindung',
    sshNewFolderBtnTitle: 'Neuer Ordner',
    sshNewUserBtnTitle: 'Neuer Benutzer',
    sshMenuTitle: 'Aktionen',
    sshSearchPlaceholder: 'Suchen...',
    sshSectionConnections: 'Verbindungen',
    sshSectionUsers: 'Benutzer',
    sshNoConnections: 'Noch keine Verbindungen.\nKlicken Sie auf +, um eine hinzuzufügen.',
    sshNoUsers: 'Noch keine Benutzer.\nKlicken Sie auf +, um einen hinzuzufügen.',
    sshFolderOpenAllTitle: 'Alle öffnen',
    sshFolderEditTitle: 'Bearbeiten',
    sshFolderDeleteTitle: 'Löschen',
    sshItemConnectTitle: 'Verbinden',
    sshItemEditTitle: 'Bearbeiten',
    sshItemDeleteTitle: 'Löschen',
    sshItemAuthKeyfile: '🔑',
    sshItemAuthPassword: '🔒',
    sshItemConnIcon: '🖥️',

    // ── SSH Dialogs ──────────────────────────────────────────────────────────
    sshDialogTitleNewConn: 'Neue Verbindung',
    sshDialogTitleEditConn: 'Verbindung bearbeiten',
    sshDialogTitleNewFolder: 'Neuer Ordner',
    sshDialogTitleEditFolder: 'Ordner bearbeiten',
    sshDialogTitleNewUser: 'Neuer Benutzer',
    sshDialogTitleEditUser: 'Benutzer bearbeiten',
    sshDialogSave: 'Speichern',
    sshDialogCancel: 'Abbrechen',
    sshFormName: 'Name',
    sshFormHost: 'Host',
    sshFormPort: 'Port',
    sshFormUser: 'Benutzer',
    sshFolderOptional: 'Ordner (optional)',
    sshFormSelectUser: '-- Benutzer auswählen --',
    sshFormNone: '-- Keine --',
    sshFormJumpHostOptional: 'Sprunghost (optional)',
    sshFormJumpType: 'Typ',
    sshFormJumpNone: 'Keine (direkte Verbindung)',
    sshFormJumpManual: 'Manuell eingeben',
    sshFormJumpReference: 'Gespeicherte Verbindung auswählen',
    sshFormJumpHost: 'Sprunghost',
    sshFormJumpPort: 'Sprungport',
    sshFormJumpUsername: 'Sprungbenutzername',
    sshFormJumpViaConnection: 'Über Verbindung springen',
    sshFormSelectConnection: '-- Verbindung auswählen --',
    sshFormAdvancedOptional: 'Erweiterte Optionen (optional)',
    sshFormHostKeyAlgorithms: 'Hostschlüssel-Algorithmen',
    sshFormKexAlgorithms: 'Schlüsselaustausch-Algorithmen',
    sshFormPubkeyAcceptedAlgorithms: 'Öffentliche-Schlüssel-Algorithmen',
    sshFormUsername: 'Benutzername',
    sshFormAuthType: 'Authentifizierung',
    sshFormAuthPassword: 'Passwort',
    sshFormAuthKeyfile: 'Schlüsseldatei',
    sshFormPassword: 'Passwort',
    sshFormPasswordUnchanged: '(bei leerem Feld unverändert)',
    sshFormKeyFilePath: 'Pfad der Schlüsseldatei',
    sshFormKeyPassphrase: 'Passphrase der Schlüsseldatei',
    sshFormKeyPassphraseOptional: '(optional)',
    sshFolderName: 'Ordnername',
    sshFolderParent: 'Übergeordneter Ordner',
    sshFolderParentNone: '(keine — Stammebene)',
    sshPasswordUnlockTitle: 'SSH-Verbindungen entsperren',
    sshPasswordSetupTitle: 'SSH-Verbindungen schützen',
    sshPasswordChangeTitle: 'Master-Passwort ändern',
    sshPasswordLabel: 'Master-Passwort',
    sshPasswordPlaceholderUnlock: 'Master-Passwort eingeben',
    sshPasswordPlaceholderNew: 'Neues Master-Passwort eingeben',
    sshPasswordConfirmLabel: 'Passwort bestätigen',
    sshPasswordConfirmPlaceholder: 'Master-Passwort bestätigen',
    sshPasswordBtnUnlock: 'Entsperren',
    sshPasswordBtnSet: 'Passwort festlegen',
    sshPasswordBtnChange: 'Passwort ändern',
    sshPasswordBtnUseOs: 'Standardverschlüsselung (kein Passwort)',
    sshPasswordEmpty: 'Das Passwort darf nicht leer sein.',
    sshPasswordMismatch: 'Die Passwörter stimmen nicht überein.',
    sshPasswordIncorrect: 'Falsches Passwort.',
    sshPasswordDecryptFailed: 'Daten konnten nicht entschlüsselt werden. Die Datei ist möglicherweise beschädigt.',
    sshMasterPasswordRequired: 'Master-Passwort erforderlich. Die Daten sind verschlüsselt.',
    sshPasswordLockedIcon: '🔒',
    sshPasswordUnlockedIcon: '🔓',
    sshPasswordBtnChangeTitle: 'Master-Passwort ändern',
    sshPasswordBtnSetTitle: 'Master-Passwort festlegen',

    // ── SSH Import ───────────────────────────────────────────────────────────
    sshImportTitle: 'Aus ~/.ssh/config importieren',
    sshImportUpdateTitle: 'Aus ~/.ssh/config aktualisieren',
    sshImportBtnImport: 'Ausgewählte importieren',
    sshImportBtnUpdate: 'Ausgewählte aktualisieren',
    sshImportUpdateFieldsTitle: 'Diese Felder aktualisieren:',
    sshImportFieldHost: 'Hostname / Port',
    sshImportFieldUser: 'Benutzer',
    sshImportFieldJump: 'Sprunghost',
    sshImportFieldOptions: 'Algorithmus-Optionen',
    sshImportAuthKeyfile: 'Schlüssel: {file}',
    sshImportAuthPassword: 'Passwort',
    sshImportJumpVia: '↪ über {host}',
    sshImportJumpNotInConfig: ' (nicht in der Konfiguration)',
    sshImportNoNewHosts: 'Keine neuen Hosts gefunden. Alle sind bereits importiert.',
    sshImportNoExistingToUpdate: 'Keine vorhandenen Verbindungen in der SSH-Konfiguration zum Aktualisieren gefunden.',
    sshImportNoHosts: 'Keine Hosts in der SSH-Konfiguration gefunden.',

    // ── SSH Context Menu ─────────────────────────────────────────────────────
    sshCtxAddConn: 'Verbindung hinzufügen',
    sshCtxAddSubFolder: 'Unterordner hinzufügen',
    sshCtxAddParentFolder: 'Übergeordneten Ordner hinzufügen',
    sshCtxConnect: 'Verbinden',
    sshCtxEdit: 'Bearbeiten',
    sshCtxMoveToFolder: 'In Ordner verschieben',
    sshCtxDelete: 'Löschen',
    sshCtxOpenAll: 'Alle Verbindungen öffnen',
    sshCtxConnectAll: 'Alle verbinden ({count})',
    sshCtxDeleteSelected: 'Ausgewählte löschen ({count})',
    sshCtxOpenAllMulti: 'Alle öffnen ({count})',
    sshCtxDuplicate: 'Duplizieren',
    sshCtxDuplicateSelected: 'Ausgewählte duplizieren ({count})',
    sshCtxNoOtherFolders: 'Keine anderen Ordner',

    // ── Settings / Options Panel ──────────────────────────────────────────────
    optionsTitleAppearance: 'Darstellung',
    optionsThemeDark: 'Dunkel',
    optionsThemeLight: 'Hell',
    optionsUiFontSize: 'Schriftgröße der Oberfläche',
    optionsTermFontSize: 'Schriftgröße des Terminals',
    optionsTitleDefaultShell: 'Standard-Shell',
    optionsTitleWarnings: 'Warnungen',
    optionsTitleMouse: 'Maus',
    optionsTabCloseConfirm: 'Vor dem Schließen eines Tabs bestätigen',
    optionsWindowCloseConfirm: 'Vor dem Schließen des Fensters bestätigen',
    optionsGroupCloseConfirm: 'Vor dem Löschen einer Gruppe bestätigen',
    optionsSshJumpWarn: 'Vor nicht ausgewählten Sprunghosts beim SSH-Import warnen',
    optionsPastePreview: 'Vor dem Einfügen mehrzeiliger Inhalte bestätigen',
    optionsRightClickPaste: 'Rechtsklick zum Kopieren / Einfügen',

    // ── Danger Zone ──────────────────────────────────────────────────────────
    optionsTitleDanger: 'Gefahrenzone',
    optionsResetSettings: 'Alle Einstellungen zurücksetzen',
    optionsClearSshData: 'Alle SSH-Verbindungen löschen',
    confirmResetSettings: 'Alle Einstellungen auf die Standardwerte zurücksetzen?\nDiese Aktion kann nicht rückgängig gemacht werden.',
    confirmClearSshData: 'Alle gespeicherten SSH-Verbindungen, Benutzer und Ordner löschen?\nDiese Aktion kann nicht rückgängig gemacht werden.',
    confirmReset: 'Zurücksetzen',
    toastSettingsReset: 'Alle Einstellungen wurden zurückgesetzt.',
    toastSshDataCleared: 'Alle SSH-Verbindungen wurden gelöscht.',
    optionsClearAllData: 'Alle Daten löschen und neu starten',
    confirmClearAllData: 'Alle Daten löschen und EchoTerm neu starten?\nAlle Einstellungen und SSH-Verbindungen werden dauerhaft gelöscht.',
    optionsClearCache: 'Gesamten Cache leeren',
    confirmClearCache: 'Den Cache der App leeren?\nDies wirkt sich nicht auf Ihre Einstellungen oder SSH-Verbindungen aus.',
    confirmClear: 'Leeren',
    toastCacheCleared: 'Der Cache der App wurde geleert.',

    // ── Paste Preview ─────────────────────────────────────────────────────────
    pastePreviewTitle: 'Einfügen-Vorschau',
    pastePreviewLines: '{count} Zeilen',
    pastePreviewDontShow: 'Nicht erneut anzeigen',
    pastePreviewCancel: 'Abbrechen',
    pastePreviewPaste: 'Einfügen',

    // ── Error messages ───────────────────────────────────────────────────────
    errorUnknownShell: 'Unbekannte Shell: {shell}',
    errorConnectionNotFound: 'Verbindung nicht gefunden.',
    errorGroupNotFound: 'Gruppe nicht gefunden.',
    errorConfigNotFound: 'Konfigurationsdatei nicht gefunden: {path}',
    errorNoMasterPassword: 'Kein Master-Passwort festgelegt.',

    // ── Language ─────────────────────────────────────────────────────────────
    optionsTitleLanguage: 'Sprache',

    // ── About ────────────────────────────────────────────────────────────────
    optionsTitleAbout: 'Über',
    aboutDescription: 'EchoTerm — Terminal-App mit geteilter Ansicht und Echo-Eingabe',
    aboutVersion: 'Version',

    // ── Dialog buttons ───────────────────────────────────────────────────────
    genericSave: 'Speichern',
    genericCancel: 'Abbrechen',

    // ── SSH Header Dropdown ─────────────────────────────────────────────────
    sshDropdownSshLabel: '.SSH',
    sshDropdownCreate: 'Erstellen',
    sshDropdownImportBtn: 'Importieren',
    sshDropdownUpdateBtn: 'Aktualisieren',
    sshDropdownExportBtn: 'Exportieren',
    sshDropdownConnBtn: 'Verbindung',
    sshDropdownFolderBtn: 'Ordner',
    sshDropdownUserBtn: 'Benutzer',

    // ── SSH Import Diff Labels ──────────────────────────────────────────────
    sshImportDiffHost: 'Host',
    sshImportDiffUser: 'Benutzer',
    sshImportDiffJump: 'Sprung',
    sshImportDiffOptions: 'Optionen',
    sshImportDiffNone: '(keine)',
    sshImportDefaultUserName: 'Standard',

    // ── SSH Delete Type Labels ──────────────────────────────────────────────
    sshDeleteTypeFolder: 'Ordner',
    sshDeleteTypeConnection: 'Verbindung',
    sshDeleteTypeUser: 'Benutzer',
  });

})();

export {};
