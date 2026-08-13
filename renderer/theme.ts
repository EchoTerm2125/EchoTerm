/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Theme & Appearance
   Manages the UI theme (dark/light) and font sizes for the app chrome and
   the xterm terminals. Settings persist to localStorage and apply live.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ─── xterm color palettes per theme ─────────────────────────────────────────
  const XTERM_THEMES = {
    dark: {
      background: '#11111b', foreground: '#cdd6f4', cursor: '#f5e0dc',
      selectionBackground: '#585b7055',
      black: '#45475a', red: '#f38ba8', green: '#a6e3a1', yellow: '#f9e2af',
      blue: '#89b4fa', magenta: '#f5c2e7', cyan: '#94e2d5', white: '#bac2de',
      brightBlack: '#585b70', brightRed: '#f38ba8', brightGreen: '#a6e3a1',
      brightYellow: '#f9e2af', brightBlue: '#89b4fa', brightMagenta: '#f5c2e7',
      brightCyan: '#94e2d5', brightWhite: '#a6adc8',
    },
    light: {
      background: '#eff1f5', foreground: '#4c4f69', cursor: '#dc8a78',
      selectionBackground: '#acb0be55',
      black: '#5c5f77', red: '#d20f39', green: '#40a02b', yellow: '#df8e1d',
      blue: '#1e66f5', magenta: '#ea76cb', cyan: '#179299', white: '#acb0be',
      brightBlack: '#6c6f85', brightRed: '#d20f39', brightGreen: '#40a02b',
      brightYellow: '#df8e1d', brightBlue: '#1e66f5', brightMagenta: '#ea76cb',
      brightCyan: '#179299', brightWhite: '#bcc0cc',
    },
  };

  const UI_FONT_MIN = 8, UI_FONT_MAX = 24, UI_FONT_DEFAULT = 13;
  const TERM_FONT_MIN = 8, TERM_FONT_MAX = 24, TERM_FONT_DEFAULT = 13;

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  // ─── Getters (localStorage-backed) ──────────────────────────────────────────
  function getTheme() {
    return localStorage.getItem('appTheme') === 'light' ? 'light' : 'dark';
  }

  function getXtermTheme() {
    return XTERM_THEMES[getTheme()];
  }

  function getUiFontSize() {
    const v = parseInt(localStorage.getItem('uiFontSize') || '', 10);
    return Number.isFinite(v) ? clamp(v, UI_FONT_MIN, UI_FONT_MAX) : UI_FONT_DEFAULT;
  }

  function getTermFontSize() {
    const v = parseInt(localStorage.getItem('termFontSize') || '', 10);
    return Number.isFinite(v) ? clamp(v, TERM_FONT_MIN, TERM_FONT_MAX) : TERM_FONT_DEFAULT;
  }

  // ─── Apply current xterm theme to all live terminals ────────────────────────
  function applyToTerminals() {
    if (!window.App || !App.state || !App.state.terminals) return;
    const theme = getXtermTheme();
    App.state.terminals.forEach((t) => {
      try { t.term.options.theme = theme; } catch { /* pane not ready */ }
    });
  }

  // ─── Setters (persist + apply live) ─────────────────────────────────────────
  function setTheme(name) {
    const theme = name === 'light' ? 'light' : 'dark';
    localStorage.setItem('appTheme', theme);
    applyThemeToDom();
    applyToTerminals();
  }

  function applyThemeToDom() {
    const theme = getTheme();
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }

  function setUiFontSize(px) {
    const size = clamp(Math.round(px), UI_FONT_MIN, UI_FONT_MAX);
    localStorage.setItem('uiFontSize', String(size));
    applyUiFontSizeToDom();
  }

  function applyUiFontSizeToDom() {
    const size = getUiFontSize();
    const root = document.documentElement.style;
    root.setProperty('--app-font-size', `${size}px`);
    // Unitless scale factor (1 = default 13px) that multiplies UI spacing
    root.setProperty('--ui-scale', String(size / UI_FONT_DEFAULT));
  }

  function setTermFontSize(px) {
    const size = clamp(Math.round(px), TERM_FONT_MIN, TERM_FONT_MAX);
    localStorage.setItem('termFontSize', String(size));
    if (!window.App || !App.state || !App.state.terminals) return;
    App.state.terminals.forEach((t) => {
      try {
        t.term.options.fontSize = size;
        // fit() triggers term.onResize which propagates api.resize to the pty
        t.fitAddon.fit();
      } catch { /* pane not ready */ }
    });
  }

  // ─── Apply saved appearance immediately at import time ──────────────────────
  // The bundle executes synchronously before first paint, so there is no
  // visible dark→light flash. (CSP forbids inline scripts, so the bundle is
  // the earliest safe point.)
  applyThemeToDom();
  applyUiFontSizeToDom();

  // ─── Expose on window.App ───────────────────────────────────────────────────
  window.App = window.App || ({} as AppGlobal);
  App.Theme = {
    XTERM_THEMES,
    getTheme,
    getXtermTheme,
    getUiFontSize,
    getTermFontSize,
    setTheme,
    setUiFontSize,
    setTermFontSize,
    applyToTerminals,
  };
})();

export {};
