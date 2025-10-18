'use client';

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { i18nConfig } from './config';
import enCommon from '../../../public/locales/en/common.json';
import enGBCommon from '../../../public/locales/en-GB/common.json';
import plCommon from '../../../public/locales/pl/common.json';

const getInitialLanguage = (): string => {
  if (typeof window !== 'undefined') {
    // First check if user has previously selected a language
    const savedLanguage = localStorage.getItem('preferredLanguage');
    if (savedLanguage && (i18nConfig.locales as readonly string[]).includes(savedLanguage)) {
      return savedLanguage;
    }

    // Check geo-IP detected country from cookie
    const detectedCountry = document.cookie
      .split('; ')
      .find(row => row.startsWith('detected-country='))
      ?.split('=')[1];

    if (detectedCountry === 'GB') {
      return 'en-GB';
    } else if (detectedCountry === 'PL') {
      return 'pl';
    }

    // Auto-detect from browser language
    const browserLang = navigator.language.toLowerCase();

    // Check for exact match (e.g., 'pl' or 'en')
    for (const locale of i18nConfig.locales) {
      if (browserLang === locale || browserLang.startsWith(`${locale}-`)) {
        return locale;
      }
    }
  }

  return i18nConfig.defaultLocale;
};

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
};

const initI18next = () => {
  i18next
    .use(initReactI18next)
    .init({
      lng: getInitialLanguage(),
      fallbackLng: i18nConfig.defaultLocale,
      supportedLngs: i18nConfig.locales,
      ns: ['common'],
      defaultNS: 'common',
      resources,
      interpolation: {
        escapeValue: false, // React already escapes values
      },
      react: {
        useSuspense: false, // Important for App Router
      },
    });

  return i18next;
};

export const i18n = initI18next();
