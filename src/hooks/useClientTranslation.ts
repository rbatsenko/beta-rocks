'use client';

import { useTranslation as useTranslationOrg } from 'react-i18next';

export function useClientTranslation(ns?: string | string[]) {
  const { t, i18n } = useTranslationOrg(ns);

  return {
    t,
    i18n,
    language: i18n.language,
  };
}
