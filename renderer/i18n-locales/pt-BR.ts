/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Portuguese (Brazil) / Português (Brasil) translations
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  window.App.i18n.registerLocale('pt-BR', {

    // ── Locale metadata ─────────────────────────────────────────────────────
    _langName: 'Português (Brasil)',

    // ── App / Shells ─────────────────────────────────────────────────────────
    appTitle: 'EchoTerm',
    gitBashNotFound: '⚠ Git Bash não encontrado',
    shellPowerShell: 'PowerShell',
    shellCmd: 'CMD',
    shellGitBash: 'Git Bash',
    shellSsh: 'SSH',

    // ── Toolbar ──────────────────────────────────────────────────────────────
    toolbarSidebarToggle: 'Barra lateral (Ctrl+Shift+S)',
    toolbarSettings: 'Configurações',
    winMinimizeTitle: 'Minimizar',
    winMaximizeTitle: 'Maximizar',
    winRestoreTitle: 'Restaurar',

    // ── New Terminal Dropdown ────────────────────────────────────────────────
    newTerminalTitle: 'Nova terminal (Ctrl+Shift+N)',
    newTermDropdownTitle: 'Selecionar tipo de terminal',
    powershellLabel: 'PowerShell',
    cmdLabel: 'CMD',
    gitBashLabel: 'Git Bash',

    // ── Echo buttons ─────────────────────────────────────────────────────────
    echoEnableAll: 'Habilitar todas',
    echoDisableAll: 'Desabilitar todas',
    echoToggleAll: 'Alternar todas',
    echoPasteAll: 'Colar em todas',
    echoLabel: 'Eco',
    echoLabelOn: 'Eco ATIVADO',
    echoModeTitleOff: 'Modo eco',
    echoEnableAllTitle: 'Habilitar eco em todas as terminais',
    echoToggleAllTitle: 'Alternar o estado de eco de cada terminal',
    echoPasteAllTitle: 'Colar em todas as terminais com eco habilitado',

    // ── Group bar ────────────────────────────────────────────────────────────
    groupDefaultName: 'Grupo {n}',
    newGroupTitle: 'Novo grupo',
    closeGroupTitle: 'Fechar grupo',

    // ── Tab ──────────────────────────────────────────────────────────────────
    tabCloseTitle: 'Fechar',

    // ── Pane titlebar ────────────────────────────────────────────────────────
    panePasteTitle: 'Colar',
    paneEchoTitle: 'Eco de entrada nesta terminal',
    paneEchoLabel: 'Eco',
    paneCloseTitle: 'Fechar',
    paneDismissTitle: 'Fechar',

    // ── Status bar ───────────────────────────────────────────────────────────
    statusTerminalCount: 'Terminais: {count}',
    statusTerminalPlural: '',
    statusEchoOff: 'Eco: DESATIVADO',
    statusEchoOn: 'Eco: ATIVADO',
    statusEchoOnSelected: 'Eco: ATIVADO ({count} selecionadas)',
    statusShell: 'Shell: {shell}',

    // ── Toast messages ───────────────────────────────────────────────────────
    toastDefaultShell: 'Padrão: {shell}',
    toastGitBashNotFound: 'Git Bash não encontrado. Localize o bash.exe para abrir uma terminal do Git Bash.',
    toastTerminalExited: 'A terminal terminou. Abrindo uma nova...',
    toastNeedTwoTerminals: 'São necessárias pelo menos 2 terminais neste grupo para o modo eco.',
    toastCannotDeleteLastGroup: 'Não é possível excluir o último grupo.',
    toastError: 'Erro: {message}',
    toastSshError: 'Erro de SSH: {message}',
    toastSshErrorNamed: 'Erro de SSH ({name}): {message}',
    toastSkipped: 'Ignorado {name}: {message}',
    toastImported: 'Importado {list}.',
    toastImportedNew: '{count} novos',
    toastImportedUpdated: '{count} atualizados',
    toastSshExported: 'Configuração SSH exportada para {path}.',
    toastAlreadyRunning: 'O EchoTerm já está em execução.',

    // ── Context menus ────────────────────────────────────────────────────────
    ctxCopy: 'Copiar',
    ctxPaste: 'Colar',
    ctxPasteAll: 'Colar em todas',
    ctxToggleEcho: 'Alternar eco',
    ctxClosePane: 'Fechar painel',
    tabCtxRename: 'Renomear guia',
    tabCtxClose: 'Fechar guia',
    tabCtxCloseSelected: 'Fechar selecionadas',
    tabCtxCloseOthers: 'Fechar outras',
    tabCtxMoveToGroup: 'Mover para o grupo',
    tabCtxSubmenuArrow: '▶',
    groupCtxRename: 'Renomear grupo',
    groupCtxDelete: 'Fechar grupo',
    groupCtxCloseTerminals: 'Fechar todas as terminais',

    // ── Confirm dialogs ──────────────────────────────────────────────────────
    confirmCancel: 'Cancelar',
    confirmClose: 'Fechar',
    confirmDelete: 'Excluir',
    confirmDontShowAgain: 'Não mostrar novamente',
    confirmCloseTerminal: 'Fechar esta terminal?\nA sessão será encerrada.',
    confirmCloseSelectedTerminals: 'Fechar terminais selecionadas ({count})?\nTodas as sessões serão encerradas.',
    confirmCloseOtherTerminals: 'Fechar outras terminais ({count})?\nTodas as sessões serão encerradas.',
    confirmCloseGroup: 'Fechar o grupo "{name}"?',
    confirmCloseGroupWithTerminals: 'Fechar o grupo "{name}"?\n{count} terminais serão fechadas.',
    confirmCloseApp: 'Fechar o EchoTerm?\nTodas as sessões de terminal serão encerradas.',
    confirmCloseAllGroupTerminals: 'Fechar todas as {count} terminais do grupo "{name}"?\nTodas as sessões serão encerradas.',
    confirmDeleteSshConnection: 'Excluir a conexão SSH "{name}"?',
    confirmDeleteSshFolder: 'Excluir a pasta SSH "{name}"?\nAs subpastas também serão excluídas. As conexões não serão excluídas.',
    confirmDeleteSshUser: 'Excluir o usuário SSH "{name}"?\nAs conexões que usam este usuário precisarão ser reatribuídas.',
    confirmDeleteMultiSsh: 'Excluir {count} itens SSH?',
    confirmJumpHostsMissing: 'Os seguintes hosts de salto não estão selecionados:\n\n{names}\n\nImportar mesmo assim?',

    // ── SSH Sidebar ──────────────────────────────────────────────────────────
    sshSidebarTitle: 'SSH',
    sshPasswordBtnTitle: 'Definir/Alterar senha mestra',
    sshImportBtnTitle: 'Importar novos de ~/.ssh/config',
    sshUpdateBtnTitle: 'Atualizar existentes de ~/.ssh/config',
    sshExportBtnTitle: 'Exportar conexões para o arquivo de configuração SSH',
    sshNewConnBtnTitle: 'Nova conexão',
    sshNewFolderBtnTitle: 'Nova pasta',
    sshNewUserBtnTitle: 'Novo usuário',
    sshMenuTitle: 'Ações',
    sshSearchPlaceholder: 'Pesquisar...',
    sshSectionConnections: 'Conexões',
    sshSectionUsers: 'Usuários',
    sshNoConnections: 'Ainda não há conexões.\nClique em + para adicionar uma.',
    sshNoUsers: 'Ainda não há usuários.\nClique em + para adicionar um.',
    sshFolderOpenAllTitle: 'Abrir todas',
    sshFolderEditTitle: 'Editar',
    sshFolderDeleteTitle: 'Excluir',
    sshItemConnectTitle: 'Conectar',
    sshItemEditTitle: 'Editar',
    sshItemDeleteTitle: 'Excluir',
    sshItemAuthKeyfile: '🔑',
    sshItemAuthPassword: '🔒',
    sshItemConnIcon: '🖥️',

    // ── SSH Dialogs ──────────────────────────────────────────────────────────
    sshDialogTitleNewConn: 'Nova conexão',
    sshDialogTitleEditConn: 'Editar conexão',
    sshDialogTitleNewFolder: 'Nova pasta',
    sshDialogTitleEditFolder: 'Editar pasta',
    sshDialogTitleNewUser: 'Novo usuário',
    sshDialogTitleEditUser: 'Editar usuário',
    sshDialogSave: 'Salvar',
    sshDialogCancel: 'Cancelar',
    sshFormName: 'Nome',
    sshFormHost: 'Host',
    sshFormPort: 'Porta',
    sshFormUser: 'Usuário',
    sshFolderOptional: 'Pasta (opcional)',
    sshFormSelectUser: '-- Selecionar usuário --',
    sshFormNone: '-- Nenhum --',
    sshFormJumpHostOptional: 'Host de salto (opcional)',
    sshFormJumpType: 'Tipo',
    sshFormJumpNone: 'Nenhum (conexão direta)',
    sshFormJumpManual: 'Inserir manualmente',
    sshFormJumpReference: 'Selecionar uma conexão salva',
    sshFormJumpHost: 'Host de salto',
    sshFormJumpPort: 'Porta de salto',
    sshFormJumpUsername: 'Usuário de salto',
    sshFormJumpViaConnection: 'Saltar por meio da conexão',
    sshFormSelectConnection: '-- Selecionar conexão --',
    sshFormAdvancedOptional: 'Opções avançadas (opcional)',
    sshFormHostKeyAlgorithms: 'Algoritmos de chave do host',
    sshFormKexAlgorithms: 'Algoritmos de troca de chaves',
    sshFormPubkeyAcceptedAlgorithms: 'Algoritmos de chave pública',
    sshFormUsername: 'Nome de usuário',
    sshFormAuthType: 'Autenticação',
    sshFormAuthPassword: 'Senha',
    sshFormAuthKeyfile: 'Arquivo de chave',
    sshFormPassword: 'Senha',
    sshFormPasswordUnchanged: '(sem alterações se ficar em branco)',
    sshFormKeyFilePath: 'Caminho do arquivo de chave',
    sshFormKeyPassphrase: 'Frase secreta da chave',
    sshFormKeyPassphraseOptional: '(opcional)',
    sshFolderName: 'Nome da pasta',
    sshFolderParent: 'Pasta principal',
    sshFolderParentNone: '(nenhuma — nível raiz)',
    sshPasswordUnlockTitle: 'Desbloquear conexões SSH',
    sshPasswordSetupTitle: 'Proteger conexões SSH',
    sshPasswordChangeTitle: 'Alterar senha mestra',
    sshPasswordLabel: 'Senha mestra',
    sshPasswordPlaceholderUnlock: 'Digite a senha mestra',
    sshPasswordPlaceholderNew: 'Digite a nova senha mestra',
    sshPasswordConfirmLabel: 'Confirmar senha',
    sshPasswordConfirmPlaceholder: 'Confirme a senha mestra',
    sshPasswordBtnUnlock: 'Desbloquear',
    sshPasswordBtnSet: 'Definir senha',
    sshPasswordBtnChange: 'Alterar senha',
    sshPasswordBtnUseOs: 'Usar criptografia do sistema',
    sshPasswordEmpty: 'A senha não pode estar vazia.',
    sshPasswordMismatch: 'As senhas não coincidem.',
    sshPasswordIncorrect: 'Senha incorreta.',
    sshPasswordDecryptFailed: 'Falha ao descriptografar os dados. O arquivo pode estar corrompido.',
    sshMasterPasswordRequired: 'Senha mestra necessária. Os dados estão criptografados.',
    sshPasswordLockedIcon: '🔒',
    sshPasswordUnlockedIcon: '🔓',
    sshPasswordBtnChangeTitle: 'Alterar senha mestra',
    sshPasswordBtnSetTitle: 'Definir senha mestra',

    // ── SSH Import ───────────────────────────────────────────────────────────
    sshImportTitle: 'Importar de ~/.ssh/config',
    sshImportUpdateTitle: 'Atualizar de ~/.ssh/config',
    sshImportBtnImport: 'Importar selecionados',
    sshImportBtnUpdate: 'Atualizar selecionados',
    sshImportUpdateFieldsTitle: 'Atualizar estes campos:',
    sshImportFieldHost: 'Nome do host / Porta',
    sshImportFieldUser: 'Usuário',
    sshImportFieldJump: 'Host de salto',
    sshImportFieldOptions: 'Opções de algoritmo',
    sshImportAuthKeyfile: 'chave: {file}',
    sshImportAuthPassword: 'senha',
    sshImportJumpVia: '↪ via {host}',
    sshImportJumpNotInConfig: ' (não está na configuração)',
    sshImportNoNewHosts: 'Nenhum host novo encontrado. Todos já foram importados.',
    sshImportNoExistingToUpdate: 'Nenhuma conexão existente encontrada na configuração SSH para atualizar.',
    sshImportNoHosts: 'Nenhum host encontrado na configuração SSH.',

    // ── SSH Context Menu ─────────────────────────────────────────────────────
    sshCtxConnect: 'Conectar',
    sshCtxEdit: 'Editar',
    sshCtxMoveToFolder: 'Mover para a pasta',
    sshCtxDelete: 'Excluir',
    sshCtxOpenAll: 'Abrir todas as conexões',
    sshCtxConnectAll: 'Conectar todas ({count})',
    sshCtxDeleteSelected: 'Excluir selecionados ({count})',
    sshCtxOpenAllMulti: 'Abrir todas ({count})',
    sshCtxDuplicate: 'Duplicar',
    sshCtxDuplicateSelected: 'Duplicar selecionados ({count})',
    sshCtxNoOtherFolders: 'Nenhuma outra pasta',

    // ── Settings / Options Panel ──────────────────────────────────────────────
    optionsTitleAppearance: 'Aparência',
    optionsThemeDark: 'Escuro',
    optionsThemeLight: 'Claro',
    optionsUiFontSize: 'Tamanho da fonte da interface',
    optionsTermFontSize: 'Tamanho da fonte do terminal',
    optionsTitleDefaultShell: 'Shell padrão',
    optionsTitleWarnings: 'Avisos',
    optionsTitleMouse: 'Mouse',
    optionsTabCloseConfirm: 'Confirmar antes de fechar uma guia',
    optionsWindowCloseConfirm: 'Confirmar antes de fechar a janela',
    optionsGroupCloseConfirm: 'Confirmar antes de excluir um grupo',
    optionsSshJumpWarn: 'Avisar sobre hosts de salto não selecionados na importação SSH',
    optionsPastePreview: 'Confirmar antes de colar conteúdo de várias linhas',
    optionsRightClickPaste: 'Clique direito para copiar / colar',

    // ── Danger Zone ──────────────────────────────────────────────────────────
    optionsTitleDanger: 'Zona de perigo',
    optionsResetSettings: 'Restaurar todas as configurações',
    optionsClearSshData: 'Limpar todas as conexões SSH',
    confirmResetSettings: 'Restaurar todas as configurações para o padrão?\nEsta ação não pode ser desfeita.',
    confirmClearSshData: 'Excluir todas as conexões, usuários e pastas SSH salvos?\nEsta ação não pode ser desfeita.',
    confirmReset: 'Restaurar',
    toastSettingsReset: 'Todas as configurações foram restauradas.',
    toastSshDataCleared: 'Todas as conexões SSH foram limpas.',
    optionsClearAllData: 'Limpar todos os dados e reiniciar',
    confirmClearAllData: 'Limpar todos os dados e reiniciar o EchoTerm?\nTodas as configurações e conexões SSH serão excluídas permanentemente.',
    optionsClearCache: 'Limpar todo o cache',
    confirmClearCache: 'Limpar o cache do aplicativo?\nIsso não afetará suas configurações nem conexões SSH.',
    confirmClear: 'Limpar',
    toastCacheCleared: 'O cache do aplicativo foi limpo.',

    // ── Paste Preview ─────────────────────────────────────────────────────────
    pastePreviewTitle: 'Pré-visualização de colagem',
    pastePreviewLines: '{count} linhas',
    pastePreviewDontShow: 'Não mostrar novamente',
    pastePreviewCancel: 'Cancelar',
    pastePreviewPaste: 'Colar',

    // ── Error messages ───────────────────────────────────────────────────────
    errorUnknownShell: 'Shell desconhecido: {shell}',
    errorConnectionNotFound: 'Conexão não encontrada.',
    errorGroupNotFound: 'Grupo não encontrado.',
    errorConfigNotFound: 'Arquivo de configuração não encontrado: {path}',
    errorNoMasterPassword: 'Nenhuma senha mestra definida.',

    // ── Language ─────────────────────────────────────────────────────────────
    optionsTitleLanguage: 'Idioma',

    // ── About ────────────────────────────────────────────────────────────────
    optionsTitleAbout: 'Sobre',
    aboutDescription: 'EchoTerm — aplicativo de terminal com visualização dividida e entrada eco',
    aboutVersion: 'Versão',

    // ── Dialog buttons ───────────────────────────────────────────────────────
    genericSave: 'Salvar',
    genericCancel: 'Cancelar',

    // ── SSH Header Dropdown ─────────────────────────────────────────────────
    sshDropdownSshLabel: '.SSH',
    sshDropdownCreate: 'Criar',
    sshDropdownImportBtn: 'Importar',
    sshDropdownUpdateBtn: 'Atualizar',
    sshDropdownExportBtn: 'Exportar',
    sshDropdownConnBtn: 'Conexão',
    sshDropdownFolderBtn: 'Pasta',
    sshDropdownUserBtn: 'Usuário',

    // ── SSH Import Diff Labels ──────────────────────────────────────────────
    sshImportDiffHost: 'Host',
    sshImportDiffUser: 'Usuário',
    sshImportDiffJump: 'Salto',
    sshImportDiffOptions: 'Opções',
    sshImportDiffNone: '(nenhum)',
    sshImportDefaultUserName: 'padrão',

    // ── SSH Delete Type Labels ──────────────────────────────────────────────
    sshDeleteTypeFolder: 'pasta',
    sshDeleteTypeConnection: 'conexão',
    sshDeleteTypeUser: 'usuário',
  });

})();

export {};
