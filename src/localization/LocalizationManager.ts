import { Fluent, FluentBundleOptions } from '@moebius/fluent';
import logger from '../logger';
import { Locale } from './appLocales';

export class LocalizationManager {
  private fluent?: Fluent;
  constructor(private locales: Locale[]) {
    if (locales.length <= 0) throw new Error(`No locales found!`);
  }

  async init() {
    this.fluent = new Fluent({
      warningHandler: {
        handleWarning: (warning) =>
          logger.warn(`Fluent warning`, {
            type: warning.type,
            locales: warning.locales,
            path: warning.path,
          }),
      },
    });
    const bundleOptions: FluentBundleOptions = { useIsolating: false };

    for (const { code, filePath, isDefault } of this.locales) {
      await this.fluent.addTranslation({
        locales: code,
        filePath,
        bundleOptions,
        isDefault: !!isDefault,
      });
    }
  }

  getFluentInstance() {
    if (!this.fluent) throw new Error(`No instance were initialized!`);
    return this.fluent;
  }

  getDefaultLocaleCode() {
    const defaultLocale = this.locales.find((el) => el.isDefault);
    if (defaultLocale) return defaultLocale.code;
    const anyLocale = this.locales.find(() => true);
    if (anyLocale) return anyLocale.code;
    return 'en';
  }
}
