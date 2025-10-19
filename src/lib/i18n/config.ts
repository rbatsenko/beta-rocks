export const i18nConfig = {
  locales: ['en', 'en-GB', 'pl', 'uk'],
  defaultLocale: 'en',
} as const;

export type Locale = (typeof i18nConfig.locales)[number];
