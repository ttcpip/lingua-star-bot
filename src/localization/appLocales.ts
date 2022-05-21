export type Locale = { code: string; filePath: string[]; isDefault?: boolean };

export const appLocales: Locale[] = [
  {
    code: 'ru',
    filePath: [`./locales/main.ru.ftl`],
    isDefault: true,
  },
  {
    code: 'en',
    filePath: [`./locales/main.en.ftl`],
  },
];
