/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — UI: Toolbar, Status Bar, Keyboard, Global Events
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';
  const state = App.state;
  const api = App.api;

  // localStorage keys holding user-configurable settings, cleared by
  // "Reset all settings" in the Danger Zone of the options panel.
  // Deliberately NOT listed: SSH folder collapse state and the sidebar split
  // position are transient UI view state, not "settings" — they survive reset.
  const SETTINGS_STORAGE_KEYS = [
    'appTheme', 'uiFontSize', 'termFontSize', 'defaultShell',
    'skipTabCloseConfirm', 'skipCloseConfirm', 'skipGroupCloseConfirm',
    'skipSshJumpWarn', 'skipPastePreview', 'skipRightClickPaste',
    'i18nLocale', 'sshSidebarWidth',
  ];

  function bindToolbar() {
    App.btnNewTerminal.addEventListener('click', () => {
      App.Terminal.spawnTerminal(state.selectedShell);
    });

    App.btnNewTermDropdown.addEventListener('click', (e) => {
      e.stopPropagation(); e.preventDefault();
      App.newTermDropdown.classList.toggle('hidden');
    });

    App.newTermDropdown.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const shell = btn.dataset.shell;
        App.newTermDropdown.classList.add('hidden');
        App.Terminal.spawnTerminal(shell);
      });
    });

    document.addEventListener('click', (e) => {
      if (!App.newTermDropdown.classList.contains('hidden') &&
          !e.target.closest('#btnNewTermDropdown') &&
          !e.target.closest('#newTermDropdown')) {
        App.newTermDropdown.classList.add('hidden');
      }
    });

    App.btnEchoMode.addEventListener('click', () => {
      App.Echo.toggleEchoMode();
    });

    App.btnSettings.addEventListener('click', (e) => {
      e.stopPropagation();
      App.optionsPanel.classList.remove('hidden');
      refreshOptionsPanel();
    });

    // Close options popup: × button or backdrop click
    const btnOptionsClose = document.getElementById('btnOptionsClose');
    if (btnOptionsClose) {
      btnOptionsClose.addEventListener('click', () => {
        App.optionsPanel.classList.add('hidden');
      });
    }
    App.optionsPanel.addEventListener('click', (e) => {
      if (e.target === App.optionsPanel) App.optionsPanel.classList.add('hidden');
    });

    // ── Window caption buttons (custom titlebar) ──
    const btnWinMin = document.getElementById('btnWinMin');
    const btnWinMax = document.getElementById('btnWinMax');
    const btnWinClose = document.getElementById('btnWinClose');

    function updateMaxIcon(maximized) {
      if (!btnWinMax) return;
      const iconMax = btnWinMax.querySelector('.icon-max');
      const iconRestore = btnWinMax.querySelector('.icon-restore');
      if (iconMax) iconMax.classList.toggle('hidden', maximized);
      if (iconRestore) iconRestore.classList.toggle('hidden', !maximized);
      const titleKey = maximized ? 'winRestoreTitle' : 'winMaximizeTitle';
      btnWinMax.setAttribute('data-i18n-title', titleKey);
      btnWinMax.title = App.__(titleKey);
    }

    if (btnWinMin) btnWinMin.addEventListener('click', () => api.minimizeWindow());
    if (btnWinMax) btnWinMax.addEventListener('click', () => api.toggleMaximizeWindow());
    if (btnWinClose) btnWinClose.addEventListener('click', () => api.closeWindow());

    if (btnWinMax && api.isWindowMaximized) {
      api.isWindowMaximized().then(updateMaxIcon);
      api.onWindowMaximizedChange(updateMaxIcon);
    }

    // Double-click the drag region to toggle maximize
    const toolbar = document.getElementById('toolbar');
    if (toolbar) {
      toolbar.addEventListener('dblclick', (e) => {
        if (e.target.closest('button')) return;
        api.toggleMaximizeWindow();
      });
    }

    // ── Tab-bar action clicks hand keyboard focus back to a terminal ──
    // The tab bar is a mouse-only surface: clicking any action button blurs
    // the xterm textarea, and the per-button handlers do not reliably refocus
    // (paste-all never does; echo all/toggle bail when the active terminal
    // stays echoed). One delegated listener keeps the rule uniform for every
    // present and future action button. Shell-dropdown item clicks are
    // excluded because spawnTerminal focuses the freshly spawned pane itself.
    const tabBar = document.getElementById('tabBar');
    if (tabBar) {
      tabBar.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (!target.closest('.tab-actions')) return;
        if (target.closest('#newTermDropdown')) return;
        App.Terminal.refocus();
      });
    }
  }

  function refreshOptionsPanel() {
    // Theme radio + font size controls
    if (App.Theme) {
      const currentTheme = App.Theme.getTheme();
      App.optionsPanel.querySelectorAll('input[name="optTheme"]').forEach((r) => {
        r.checked = r.value === currentTheme;
      });
      const uiSlider = App.optionsPanel.querySelector('#optUiFontSize');
      const uiNum = App.optionsPanel.querySelector('#optUiFontSizeNum');
      const termSlider = App.optionsPanel.querySelector('#optTermFontSize');
      const termNum = App.optionsPanel.querySelector('#optTermFontSizeNum');
      if (uiSlider && uiNum) {
        uiSlider.value = String(App.Theme.getUiFontSize());
        uiNum.value = uiSlider.value;
      }
      if (termSlider && termNum) {
        termSlider.value = String(App.Theme.getTermFontSize());
        termNum.value = termSlider.value;
      }
    }

    // Shell radio
    const checkedShell = state.selectedShell;
    const radios = App.optionsPanel.querySelectorAll('input[name="optShell"]');
    radios.forEach((r) => { r.checked = r.value === checkedShell; });

    // Tab close confirm
    App.optTabCloseConfirm.checked =
      localStorage.getItem('skipTabCloseConfirm') !== 'true';

    // Window close confirm
    App.optWindowCloseConfirm.checked =
      localStorage.getItem('skipCloseConfirm') !== 'true';

    // Group delete confirm
    App.optGroupCloseConfirm.checked =
      localStorage.getItem('skipGroupCloseConfirm') !== 'true';

    // SSH import jump host warning
    App.optSshJumpWarn.checked =
      localStorage.getItem('skipSshJumpWarn') !== 'true';

    // Paste preview
    App.optPastePreview.checked =
      localStorage.getItem('skipPastePreview') !== 'true';

    // Right-click copy/paste (default: off)
    App.optRightClickPaste.checked =
      localStorage.getItem('skipRightClickPaste') === 'false';

    // Language page — rebuild list and reflect current locale
    const langSearch = document.getElementById('langSearchInput');
    if (langSearch) langSearch.value = '';
    buildLangOptions('');

    // About page — populate app info
    refreshAboutSection();
  }

  // ── About page: fetch app info from the main process once ──
  let _appInfoPromise = null;
  async function refreshAboutSection() {
    const aboutAppName = document.getElementById('aboutAppName');
    const aboutVersion = document.getElementById('aboutVersion');
    if (!aboutVersion) return;

    try {
      if (!_appInfoPromise) _appInfoPromise = api.getAppInfo();
      const info = await _appInfoPromise;
      if (!info) return;
      if (aboutAppName && info.name) aboutAppName.textContent = info.name;
      aboutVersion.textContent = info.version || '—';
    } catch (err) {
      console.error('Failed to load app info:', err);
      _appInfoPromise = null;
    }
  }

  function bindSettings() {
    // Sidemenu section switching
    App.optionsPanel.querySelectorAll('.options-menu-item').forEach((item) => {
      item.addEventListener('click', () => {
        App.optionsPanel.querySelectorAll('.options-menu-item').forEach((i) => {
          i.classList.toggle('active', i === item);
        });
        App.optionsPanel.querySelectorAll('.options-section').forEach((s) => {
          s.classList.toggle('active', s.dataset.optionsSection === item.dataset.optionsTarget);
        });
      });
    });

    // Theme selection
    App.optionsPanel.querySelectorAll('input[name="optTheme"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        if (radio.checked && App.Theme) App.Theme.setTheme(radio.value);
      });
    });

    // UI font size (slider + keyboard input, kept in sync)
    const uiSlider = App.optionsPanel.querySelector('#optUiFontSize');
    const uiNum = App.optionsPanel.querySelector('#optUiFontSizeNum');
    if (uiSlider && uiNum) {
      uiSlider.addEventListener('input', () => {
        uiNum.value = uiSlider.value;
        if (App.Theme) App.Theme.setUiFontSize(+uiSlider.value);
      });
      uiNum.addEventListener('change', () => {
        if (App.Theme) App.Theme.setUiFontSize(+uiNum.value);
        const v = App.Theme ? App.Theme.getUiFontSize() : +uiNum.value;
        uiNum.value = String(v);
        uiSlider.value = String(v);
      });
    }

    // Terminal font size (slider + keyboard input, kept in sync)
    const termSlider = App.optionsPanel.querySelector('#optTermFontSize');
    const termNum = App.optionsPanel.querySelector('#optTermFontSizeNum');
    if (termSlider && termNum) {
      termSlider.addEventListener('input', () => {
        termNum.value = termSlider.value;
        if (App.Theme) App.Theme.setTermFontSize(+termSlider.value);
      });
      termNum.addEventListener('change', () => {
        if (App.Theme) App.Theme.setTermFontSize(+termNum.value);
        const v = App.Theme ? App.Theme.getTermFontSize() : +termNum.value;
        termNum.value = String(v);
        termSlider.value = String(v);
      });
    }

    // Shell selection
    App.optionsPanel.querySelectorAll('input[name="optShell"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        if (radio.checked) {
          state.selectedShell = radio.value;
          localStorage.setItem('defaultShell', radio.value);
          updateStatusBar();
          showToast(App.__('toastDefaultShell', { shell: App.getShellName(radio.value) }));
        }
      });
    });

    // Tab close confirm toggle
    App.optTabCloseConfirm.addEventListener('change', () => {
      if (App.optTabCloseConfirm.checked) {
        localStorage.removeItem('skipTabCloseConfirm');
      } else {
        localStorage.setItem('skipTabCloseConfirm', 'true');
      }
    });

    // Window close confirm toggle
    App.optWindowCloseConfirm.addEventListener('change', () => {
      if (App.optWindowCloseConfirm.checked) {
        localStorage.removeItem('skipCloseConfirm');
      } else {
        localStorage.setItem('skipCloseConfirm', 'true');
      }
    });

    // Group delete confirm toggle
    App.optGroupCloseConfirm.addEventListener('change', () => {
      if (App.optGroupCloseConfirm.checked) {
        localStorage.removeItem('skipGroupCloseConfirm');
      } else {
        localStorage.setItem('skipGroupCloseConfirm', 'true');
      }
    });

    // SSH import jump host warning toggle
    App.optSshJumpWarn.addEventListener('change', () => {
      if (App.optSshJumpWarn.checked) {
        localStorage.removeItem('skipSshJumpWarn');
      } else {
        localStorage.setItem('skipSshJumpWarn', 'true');
      }
    });

    // Paste preview toggle
    App.optPastePreview.addEventListener('change', () => {
      if (App.optPastePreview.checked) {
        localStorage.removeItem('skipPastePreview');
      } else {
        localStorage.setItem('skipPastePreview', 'true');
      }
    });

    // Right-click copy/paste toggle
    App.optRightClickPaste.addEventListener('change', () => {
      localStorage.setItem('skipRightClickPaste',
        App.optRightClickPaste.checked ? 'false' : 'true');
    });

    // ── Danger Zone: reset all settings ──
    const btnResetSettings = document.getElementById('btnResetSettings');
    if (btnResetSettings) {
      btnResetSettings.addEventListener('click', () => {
        App.Menus.showConfirm(
          App.__('confirmResetSettings'),
          () => {
            for (const key of SETTINGS_STORAGE_KEYS) localStorage.removeItem(key);
            // Re-apply defaults to the live UI
            state.selectedShell = 'powershell';
            if (App.Theme) {
              App.Theme.setTheme('dark');
              App.Theme.setUiFontSize(13);
              App.Theme.setTermFontSize(13);
            }
            if (App.i18n && App.i18n.setLocale) App.i18n.setLocale('en');
            refreshOptionsPanel();
            updateStatusBar();
            showToast(App.__('toastSettingsReset'));
          },
          null,
          'confirmReset'
        );
      });
    }

    // ── Danger Zone: clear all stored SSH data ──
    const btnClearSshData = document.getElementById('btnClearSshData');
    if (btnClearSshData) {
      btnClearSshData.addEventListener('click', () => {
        App.Menus.showConfirm(
          App.__('confirmClearSshData'),
          async () => {
            const result = await api.sshClearAll();
            if (result.error) {
              showToast(App.__('toastError', { message: result.error }));
              return;
            }
            if (App.SshPanel && typeof App.SshPanel.refreshAll === 'function') {
              await App.SshPanel.refreshAll();
            }
            showToast(App.__('toastSshDataCleared'));
          },
          null,
          'confirmDelete'
        );
      });
    }

    // ── Danger Zone: clear the app cache ──
    const btnClearCache = document.getElementById('btnClearCache');
    if (btnClearCache) {
      btnClearCache.addEventListener('click', () => {
        App.Menus.showConfirm(
          App.__('confirmClearCache'),
          async () => {
            const result = await api.clearCache();
            if (result.error) {
              showToast(App.__('toastError', { message: result.error }));
              return;
            }
            showToast(App.__('toastCacheCleared'));
          },
          null,
          'confirmClear'
        );
      });
    }

    // ── Danger Zone: clear all data and restart ──
    const btnClearAllData = document.getElementById('btnClearAllData');
    if (btnClearAllData) {
      btnClearAllData.addEventListener('click', () => {
        App.Menus.showConfirm(
          App.__('confirmClearAllData'),
          () => {
            // The app relaunches as a fresh install, so no toast is shown here.
            api.clearAllData().catch(() => {});
          },
          null,
          'confirmDelete'
        );
      });
    }

    // Language page — set up after DOM is ready
    bindLangPage();
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Language page (searchable full-size list in the settings window)
  // ═════════════════════════════════════════════════════════════════════════

  function buildLangOptions(filter) {
    const list = document.getElementById('langOptionsList');
    if (!list) return;
    list.innerHTML = '';
    const current = App.i18n.getLocale();
    const allLocales = App.i18n.locales;
    const codes = Object.keys(allLocales).sort();
    const term = (filter || '').toLowerCase().trim();

    for (const code of codes) {
      const meta = allLocales[code];
      const name = meta._langName || code;
      if (term && !name.toLowerCase().includes(term) && !code.toLowerCase().includes(term)) continue;

      const opt = document.createElement('div');
      opt.className = 'lang-option' + (code === current ? ' active' : '');
      opt.dataset.code = code;

      const check = document.createElement('span');
      check.className = 'lang-option-check';
      check.textContent = '✓';
      if (code !== current) check.classList.add('hidden');
      opt.appendChild(check);

      const nameSpan = document.createElement('span');
      nameSpan.className = 'lang-option-name';
      nameSpan.textContent = name;
      opt.appendChild(nameSpan);

      const codeSpan = document.createElement('span');
      codeSpan.className = 'lang-option-code';
      codeSpan.textContent = code;
      opt.appendChild(codeSpan);

      opt.addEventListener('click', () => selectLang(code));
      list.appendChild(opt);
    }
  }

  function selectLang(code) {
    if (App.i18n.getLocale() !== code) {
      App.i18n.setLocale(code);
      // Re-localize the options panel labels
      App.i18n.localizeDom(App.optionsPanel);
    }
    // Refresh the list to move the active check mark
    const search = document.getElementById('langSearchInput');
    buildLangOptions(search ? search.value : '');
  }

  function bindLangPage() {
    const search = document.getElementById('langSearchInput');
    const list = document.getElementById('langOptionsList');
    if (!list) return;

    let highlightIdx = -1;

    function highlight(idx) {
      const opts = list.querySelectorAll('.lang-option');
      if (opts.length === 0) { highlightIdx = -1; return; }
      if (idx < 0) idx = 0;
      if (idx >= opts.length) idx = opts.length - 1;
      for (const o of opts) o.classList.remove('highlighted');
      highlightIdx = idx;
      opts[idx].classList.add('highlighted');
      opts[idx].scrollIntoView({ block: 'nearest' });
    }

    // Search filter
    if (search) {
      search.addEventListener('input', () => {
        buildLangOptions(search.value);
        highlight(0);
      });

      search.addEventListener('keydown', (e) => {
        const opts = list.querySelectorAll('.lang-option');
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            highlight(highlightIdx + 1);
            break;
          case 'ArrowUp':
            e.preventDefault();
            highlight(highlightIdx - 1);
            break;
          case 'Enter':
            e.preventDefault();
            if (highlightIdx >= 0 && opts[highlightIdx]) {
              selectLang(opts[highlightIdx].dataset.code);
            } else if (opts.length === 1) {
              selectLang(opts[0].dataset.code);
            }
            break;
          case 'Escape':
            e.preventDefault();
            search.value = '';
            buildLangOptions('');
            highlight(0);
            break;
        }
      });
    }

    // Initial population
    buildLangOptions('');
  }

  function bindKeyboardShortcuts() {
    // Capture phase so shortcuts fire before xterm.js consumes Ctrl+W / Ctrl+Tab
    // (which map to control characters) from the focused terminal textarea.
    document.addEventListener('keydown', (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && !e.shiftKey && e.code === 'KeyN') { e.preventDefault(); e.stopPropagation(); App.Terminal.spawnTerminal(state.selectedShell); return; }
      if (ctrl && e.shiftKey && e.code === 'KeyN') { e.preventDefault(); e.stopPropagation(); const count = state.groups.size + 1; const group = App.Groups.createGroup(App.__('groupDefaultName', { n: count })); App.Groups.switchGroup(group.id); App.Terminal.spawnTerminal(state.selectedShell); return; }
      if (ctrl && e.shiftKey && e.code === 'KeyT') { e.preventDefault(); e.stopPropagation(); App.Echo.toggleEchoMode(); return; }
      if (ctrl && !e.shiftKey && e.code === 'KeyW') { e.preventDefault(); e.stopPropagation(); if (state.activeTerminalId) App.Menus.showConfirm(App.__('confirmCloseTerminal'), () => App.Terminal.closeTerminal(state.activeTerminalId), 'skipTabCloseConfirm'); return; }
      if (ctrl && e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); App.Terminal.cycleTerminal(e.shiftKey ? -1 : 1); return; }
    }, true);
  }

  function bindGlobalEvents() {
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        for (const [, t] of state.terminals) t.fitAddon.fit();
      }, 100);
    });

    // Helper: check whether any overlay/dialog/menu is currently visible
    function _anyOverlayOpen() {
      return document.querySelector('[data-overlay]:not(.hidden)') !== null;
    }

    // Suppress terminal auto-refocus when a sidebar/form input owns focus.
    // Use capture-phase delegation on document because #sshSearchInput is created
    // dynamically by SshPanel.init() which runs AFTER bindGlobalEvents().
    let _suppressTermFocus = false;
    document.addEventListener('focusin', (e) => {
      if (e.target && e.target.id === 'sshSearchInput') _suppressTermFocus = true;
    }, true);
    document.addEventListener('focusout', (e) => {
      if (e.target && e.target.id === 'sshSearchInput') _suppressTermFocus = false;
    }, true);

    App.container.addEventListener('focusout', () => {
      if (!state.echoModeActive) return;
      if (_suppressTermFocus) return;
      setTimeout(() => {
        if (!state.echoModeActive) return;
        if (_suppressTermFocus) return;
        // Don't steal focus if user is typing in any input, textarea, select, or button
        if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(document.activeElement.tagName)) return;
        // Don't steal focus if any dialog, panel, or context menu is open
        if (_anyOverlayOpen()) return;
        const groupIds = App.Groups.getGroupTerminalIds(state.activeGroupId);
        const activeId = state.activeTerminalId || groupIds[0];
        const t = state.terminals.get(activeId);
        if (t && document.activeElement !== t.term.textarea) t.term.focus();
      }, 100);
    });
  }

  function updateStatusBar() {
    const count = state.terminals.size;
    App.statusTerminalCount.textContent = App._p('statusTerminalCount', count);

    if (state.echoModeActive) {
      App.statusEcho.className = '';
      App.statusEcho.textContent = App.__('statusEchoOn');
    } else if (state.echoSelection.size > 0) {
      App.statusEcho.className = '';
      App.statusEcho.textContent = App.__('statusEchoOnSelected', { count: state.echoSelection.size });
    } else {
      App.statusEcho.className = 'hidden';
    }
    App.statusShell.textContent = App.__('statusShell', { shell: App.getShellName(state.selectedShell) });
  }

  function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 4000);
  }

  async function promptLocateGitBash() {
    const result = await App.api.locateGitBash();
    if (result.path) {
      App.gitBashPath = result.path;
      App.gitBashStatus.className = 'status-badge hidden';
      return true;
    }
    return false;
  }

  // ── Populate shell icons from the single source of truth (state.js TAB_ICONS) ──
  function populateShellIcons() {
    // Dropdown (new terminal menu)
    document.querySelectorAll('.dd-icon').forEach(span => {
      const shell = span.closest('button')?.dataset.shell;
      if (shell && App.TAB_ICONS[shell]) span.textContent = App.TAB_ICONS[shell];
    });
    // Options panel (settings)
    document.querySelectorAll('.shell-icon').forEach(span => {
      const shell = span.closest('[data-shell]')?.dataset.shell;
      if (shell && App.TAB_ICONS[shell]) span.textContent = App.TAB_ICONS[shell];
    });
  }

  App.UI = {
    bindToolbar, bindSettings, bindKeyboardShortcuts, bindGlobalEvents,
    updateStatusBar, showToast, promptLocateGitBash,
    refreshOptionsPanel, populateShellIcons,
  };
})();

export {};
