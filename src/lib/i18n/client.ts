'use client';

import i18next, { type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { i18nConfig, matchLocale, resolveLocale, type Locale } from './config';
import enCommon from '../../../public/locales/en/common.json';
import enGBCommon from '../../../public/locales/en-GB/common.json';
import plCommon from '../../../public/locales/pl/common.json';
import ukCommon from '../../../public/locales/uk/common.json';

const resources = {
  en: {
    common: enCommon,
  },
  'en-GB': {
    common: enGBCommon,
  },
  pl: {
    common: plCommon,
  },
  uk: {
    common: ukCommon,
  },
};

export const i18n = i18next.createInstance();

const getPreferredLanguage = (): Locale | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const savedLanguage = localStorage.getItem('preferredLanguage');
  const matchedSavedLanguage = matchLocale(savedLanguage);
  if (matchedSavedLanguage) {
    if (savedLanguage !== matchedSavedLanguage) {
      localStorage.setItem('preferredLanguage', matchedSavedLanguage);
    }
    return matchedSavedLanguage;
  }

  const detectedCountry = document.cookie
    .split('; ')
    .find((row) => row.startsWith('detected-country='))
    ?.split('=')[1];

  if (detectedCountry === 'GB') {
    return 'en-GB';
  }
  if (detectedCountry === 'PL') {
    return 'pl';
  }
  if (detectedCountry === 'UA') {
    return 'uk';
  }

  const browserLanguages: string[] = Array.isArray(navigator.languages) && navigator.languages.length
    ? [...navigator.languages]
    : [navigator.language];

  for (const browserLanguage of browserLanguages) {
    const matchedBrowserLanguage = matchLocale(browserLanguage);
    if (matchedBrowserLanguage) {
      return matchedBrowserLanguage;
    }
  }

  return null;
};

export const getInitialLanguage = (): Locale =>
  getPreferredLanguage() ?? i18nConfig.defaultLocale;

let initPromise: Promise<I18nInstance> | null = null;

export const initI18n = (): Promise<I18nInstance> => {
  if (!initPromise) {
    initPromise = (async () => {
      const initialLanguage = getInitialLanguage();

      await i18n
        .use(initReactI18next)
        .init({
          lng: initialLanguage,
          fallbackLng: i18nConfig.defaultLocale,
          supportedLngs: i18nConfig.locales,
          ns: ['common'],
          defaultNS: 'common',
          resources,
          interpolation: {
            escapeValue: false,
          },
          react: {
            useSuspense: false,
          },
        });

      const resolvedLanguage = resolveLocale(i18n.language);
      if (resolvedLanguage !== initialLanguage) {
        await i18n.changeLanguage(resolvedLanguage);
      }

      return i18n;
    })();
  }

  return initPromise;
};
