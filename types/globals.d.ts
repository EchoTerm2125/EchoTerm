/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Global type declarations (ambient, no imports/exports so every
   name here is visible project-wide).
   Renderer globals (window.App, window.api, i18n helpers) and third-party
   libraries loaded via <script> tags (xterm, FitAddon, Split.js).
   ═══════════════════════════════════════════════════════════════════════════ */

type WindowApi = import('../shared/ipc').WindowApi;

// ─── i18n function signatures ────────────────────────────────────────────────
type TranslateFn = (key: string, params?: Record<string, unknown>) => string;
type PluralFn = (key: string, count: number) => string;
type PluralKeyFn = (key: string, count: number, pluralKey: string) => string;

interface I18nEngine {
  __: TranslateFn;
  _p: PluralFn;
  _n: PluralKeyFn;
  registerLocale(localeCode: string, translations: Record<string, string>): void;
  setLocale(localeCode: string): void;
  getLocale(): string;
  localizeDom(root?: ParentNode): void;
  onLocaleChange(fn: (localeCode: string) => void): void;
  locales: Record<string, Record<string, string>>;
}

/** Search match colors (renderer/theme.ts) — opaque #RRGGBB for xterm decorations */
interface SearchColors {
  barMatch: string;
  barActiveMatch: string;
  panelMatch: string;
  panelActiveMatch: string;
}

/** Theme & appearance engine (renderer/theme.ts) */
interface ThemeEngine {
  XTERM_THEMES: Record<string, Record<string, string>>;
  SEARCH_COLORS: Record<string, SearchColors>;
  getTheme(): 'dark' | 'light';
  getXtermTheme(): Record<string, string>;
  getSearchColors(): SearchColors;
  RETAINED_STOPS: readonly number[];
  getUiFontSize(): number;
  getTermFontSize(): number;
  getMaxRetainedLines(): number;
  setTheme(name: string): void;
  setUiFontSize(px: number): void;
  setTermFontSize(px: number): void;
  setMaxRetainedLines(lines: number): void;
  applyToTerminals(): void;
  onThemeChange(fn: (theme: 'dark' | 'light') => void): void;
}

/**
 * The renderer-wide namespace object. Each renderer module extends it.
 * Phase 1 keeps an index signature (members are `any`); well-known members
 * are typed explicitly. Tighten over time.
 */
interface AppGlobal {
  api: WindowApi;
  __: TranslateFn;
  _p: PluralFn;
  _n: PluralKeyFn;
  i18n: I18nEngine;
  Theme: ThemeEngine;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface Window {
  App: AppGlobal;
  api: WindowApi;
  __: TranslateFn;
  _p: PluralFn;
  _n: PluralKeyFn;
}

/** Bare global alias of window.App used throughout the renderer IIFEs */
declare const App: AppGlobal;

// ─── Third-party globals loaded via <script> tags ────────────────────────────
// @xterm/xterm UMD global
declare const Terminal: typeof import('@xterm/xterm').Terminal;
// @xterm/addon-fit UMD global
declare const FitAddon: typeof import('@xterm/addon-fit');
// @xterm/addon-search UMD global
declare const SearchAddon: typeof import('@xterm/addon-search');
// split.js UMD global
declare function Split(
  elements: Array<HTMLElement | string>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: Record<string, any>,
): {
  destroy(preserveStyles?: boolean, preserveGutters?: boolean): void;
  setSizes(sizes: number[]): void;
  getSizes(): number[];
};
