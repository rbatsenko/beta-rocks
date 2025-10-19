'use client';

import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { getInitialLanguage, i18n, initI18n } from '@/lib/i18n/client';
import { resolveLocale } from '@/lib/i18n/config';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(i18n.isInitialized);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      const instance = await initI18n();

      if (!isMounted) {
        return;
      }

      const desiredLanguage = getInitialLanguage();
      const currentLanguage = resolveLocale(instance.language);

      if (currentLanguage !== desiredLanguage) {
        await instance.changeLanguage(desiredLanguage);
      }

      if (isMounted) {
        setIsInitialized(true);
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!isInitialized) {
    return null; // or a loading spinner
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
