// Unit tests for i18n — locale key parity across all registered locales
import { resetTestEnv, getApp } from '../setup.js';

// Mirrors the locale imports in renderer/entry.ts
const LOCALE_FILES = [
  'zh-CN',
  'zh-HK',
  'ja',
  'ko',
  'es',
  'pt-BR',
  'fr',
  'de',
  'ru',
  'tr',
  'vi',
  'pl',
];

async function importAllLocales() {
  for (const code of LOCALE_FILES) {
    await import(`../../renderer/i18n-locales/${code}.ts`);
  }
}

describe('i18n locale parity', () => {
  beforeEach(async () => {
    await resetTestEnv();
  });

  it('registers the English locale with the confirmDelete key', () => {
    const locales = getApp().i18n.locales;
    expect(locales['en']).toBeDefined();
    expect(locales['en'].confirmDelete).toBe('Delete');
  });

  it('every non-English locale contains exactly the keys defined in en', async () => {
    await importAllLocales();

    const locales = getApp().i18n.locales;
    const enKeys = Object.keys(locales['en']).sort();

    for (const [code, locale] of Object.entries(locales)) {
      if (code === 'en') continue;
      expect(locale, `locale "${code}" is registered`).toBeDefined();
      const missing = enKeys.filter((k) => !(k in locale));
      const extra = Object.keys(locale).filter((k) => !(k in locales['en']));
      expect(missing, `locale "${code}" is missing keys`).toEqual([]);
      expect(extra, `locale "${code}" has extra keys`).toEqual([]);
    }
  });

  it('every locale provides a non-empty value for the confirm dialog keys', async () => {
    await importAllLocales();

    const locales = getApp().i18n.locales;
    const confirmKeys = ['confirmCancel', 'confirmClose', 'confirmDelete'];
    for (const code of Object.keys(locales)) {
      for (const key of confirmKeys) {
        expect(locales[code][key], `${code}.${key}`).toBeTruthy();
      }
    }
  });
});
