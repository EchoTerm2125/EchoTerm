/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Internationalization (i18n) engine
   Provides a __() function for all user-visible display text.

   Locale data lives in separate files under i18n-locales/.
   Each locale file calls window.App.i18n.registerLocale(code, data).

   This file MUST be loaded BEFORE any other renderer module.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ═════════════════════════════════════════════════════════════════════════
  // Locale registry — populated by locale files calling registerLocale()
  // ═════════════════════════════════════════════════════════════════════════
  const locales = {};

  let currentLocale = localStorage.getItem('i18nLocale') || 'en';

  /**
   * Look up a translation key.
   * Supports `{placeholder}` substitution.
   * Falls back to the 'en' locale, then the key itself.
   *
   * Usage: __('key', { count: 3, name: 'Foo' })
   * Usage: __('key')
   */
  function __(key, params?) {
    let template = (locales[currentLocale] && locales[currentLocale][key]) ||
                   (locales['en'] && locales['en'][key]) ||
                   key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        template = template.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return template;
  }

  /**
   * Convenience: plural-aware string.
   * Uses `{count}` and `{plural}` placeholders.
   */
  function _p(key, count) {
    const template = __(key, { count });
    return template.replace('{plural}', count !== 1 ? __('statusTerminalPlural') : '');
  }

  /**
   * Convenience: plural with explicit key for plural suffix.
   */
  function _n(key, count, pluralKey) {
    const suffix = count !== 1 ? __(pluralKey) : '';
    return __(key, { count }).replace('{plural}', suffix);
  }

  /**
   * Register a locale's translations.
   * Called by each i18n-locales/*.js file.
   *
   * When registering a non-English locale, validates that all English keys
   * are present and warns about any missing or extra keys (dev only).
   */
  function registerLocale(localeCode, translations) {
    // ── Key validation (development-time sanity check) ──────────────────
    if (localeCode !== 'en' && locales['en']) {
      const enKeys = new Set(Object.keys(locales['en']));
      const newKeys = new Set(Object.keys(translations));

      for (const k of enKeys) {
        if (!newKeys.has(k)) {
          console.warn(`i18n: locale "${localeCode}" is missing key "${k}"`);
        }
      }
      for (const k of newKeys) {
        if (!enKeys.has(k)) {
          console.warn(`i18n: locale "${localeCode}" has extra key "${k}" (not in en)`);
        }
      }
    }

    locales[localeCode] = translations;
  }

  /**
   * Set the active locale and persist to localStorage.
   * Re-localizes the DOM and notifies listeners.
   */
  function setLocale(localeCode) {
    if (locales[localeCode]) {
      currentLocale = localeCode;
      localStorage.setItem('i18nLocale', localeCode);
      localizeDom();
      for (const fn of _localeChangeListeners) fn(localeCode);
    } else {
      console.warn(`i18n: locale "${localeCode}" is not registered. Load its file first.`);
    }
  }

  const _localeChangeListeners: Array<(localeCode: string) => void> = [];
  function onLocaleChange(fn) {
    _localeChangeListeners.push(fn);
  }

  function getLocale() {
    return currentLocale;
  }

  /**
   * Walk the DOM and localize elements with data-i18n attributes.
   * - data-i18n="key"       — sets textContent
   * - data-i18n-title="key" — sets title attribute
   * - data-i18n-placeholder="key" — sets placeholder attribute
   */
  function localizeDom(root = document) {
    for (const el of root.querySelectorAll('[data-i18n]')) {
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = __(key);
    }
    for (const el of root.querySelectorAll('[data-i18n-title]')) {
      const key = el.getAttribute('data-i18n-title');
      if (key) el.setAttribute('title', __(key));
    }
    for (const el of root.querySelectorAll('[data-i18n-placeholder]')) {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) el.setAttribute('placeholder', __(key));
    }
  }

  // ─── Expose on window.App ─────────────────────────────────────────────────
  // Must be loaded BEFORE any other renderer module.
  if (!window.App) window.App = {} as AppGlobal;
  window.App.__ = __;
  window.App._p = _p;
  window.App._n = _n;
  window.App.i18n = {
    __,
    _p,
    _n,
    registerLocale,
    setLocale,
    getLocale,
    localizeDom,
    onLocaleChange,
    locales,
  };

  // Convenience globals
  window.__ = __;
  window._p = _p;
  window._n = _n;
})();

export {};
