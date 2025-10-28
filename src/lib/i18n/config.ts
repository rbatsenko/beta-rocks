export const i18nConfig = {
  locales: [
    "bg-BG",
    "ca-AD",
    "cs-CZ",
    "da-DK",
    "de-AT",
    "de-CH",
    "de-DE",
    "el-GR",
    "en",
    "en-AU",
    "en-CA",
    "en-GB",
    "es-ES",
    "fi-FI",
    "fr-BE",
    "fr-CA",
    "fr-CH",
    "fr-FR",
    "hr-HR",
    "it-CH",
    "it-IT",
    "nb-NO",
    "nl-BE",
    "pl",
    "pt-PT",
    "ro-RO",
    "sk-SK",
    "sl-SI",
    "sv-SE",
    "uk",
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
