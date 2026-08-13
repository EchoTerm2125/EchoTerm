/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Renderer bundle entry
   Imports every renderer module in the exact load order previously used by
   the <script> tags in index.html. Each module is side-effect-only and
   registers itself on window.App.
   ═══════════════════════════════════════════════════════════════════════════ */

import './i18n';
// Locale data — load all for simplicity; Electron reads from disk, so size is negligible
import './i18n-locales/en';
import './i18n-locales/zh-CN';
import './i18n-locales/zh-HK';
import './i18n-locales/ja';
import './i18n-locales/ko';
import './i18n-locales/es';
import './i18n-locales/pt-BR';
import './i18n-locales/fr';
import './i18n-locales/de';
import './i18n-locales/ru';
import './i18n-locales/tr';
import './i18n-locales/vi';
import './i18n-locales/pl';
import './state';
import './ui';
import './theme';
import './icons';
import './groups';
import './echo';
import './menus';
import './ssh-panel';
import './tabs';
import './terminal';
import './app';
