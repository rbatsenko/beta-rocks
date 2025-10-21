export const i18nConfig = {
  locales: [
    "en",
    "en-GB",
    "pl",
    "uk",
    "cs-CZ",
    "sk-SK",
    "es-ES",
    "fr-FR",
    "it-IT",
    "de-DE",
    "de-AT",
    "sl-SI",
    "sv-SE",
    "nb-NO",
  ],
  defaultLocale: "en",
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

  const exactMatch = localeDescriptors.find(({ lowerValue }) => lowerValue === normalizedLanguage);
  if (exactMatch) {
    return exactMatch.value;
  }

  const partialMatch = localeDescriptors
    .slice()
    .sort((a, b) => b.lowerValue.length - a.lowerValue.length)
    .find(({ lowerValue }) => normalizedLanguage.startsWith(`${lowerValue}-`));

  if (partialMatch) {
    return partialMatch.value;
  }

  return null;
};

export const resolveLocale = (language?: string | null): Locale =>
  matchLocale(language) ?? i18nConfig.defaultLocale;
