'use client';

import { useTranslation as useTranslationOrg } from 'react-i18next';
import { resolveLocale, type Locale } from '@/lib/i18n/config';

export function useClientTranslation(ns?: string | string[]) {
  const { t, i18n } = useTranslationOrg(ns);
  const resolvedLanguage: Locale = resolveLocale(i18n.language);

  return {
    t,
    i18n,
    language: resolvedLanguage,
    rawLanguage: i18n.language,
  };
}
