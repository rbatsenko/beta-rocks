export const i18nConfig = {
  locales: ['en', 'en-GB', 'pl', 'uk'],
  defaultLocale: 'en',
} as const;

export type Locale = (typeof i18nConfig.locales)[number];

type LocaleDescriptor = {
  value: Locale;
  lowerValue: string;
};

const localeDescriptors: LocaleDescriptor[] = i18nConfig.locales.map((locale) => ({
  value: locale,
  lowerValue: locale.toLowerCase(),
}));

export const matchLocale = (language?: string | null): Locale | null => {
  if (!language) {
    return null;
  }

  const normalizedLanguage = language.toLowerCase();

  for (const { value, lowerValue } of localeDescriptors) {
    if (
      normalizedLanguage === lowerValue ||
      normalizedLanguage.startsWith(`${lowerValue}-`)
    ) {
      return value;
    }
  }

  return null;
};

export const resolveLocale = (language?: string | null): Locale =>
  matchLocale(language) ?? i18nConfig.defaultLocale;
