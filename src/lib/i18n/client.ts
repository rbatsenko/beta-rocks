"use client";

import i18next, { type i18n as I18nInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { i18nConfig, matchLocale, resolveLocale, type Locale } from "./config";
import bgBGCommon from "../../../public/locales/bg-BG/common.json";
import caADCommon from "../../../public/locales/ca-AD/common.json";
import csCZCommon from "../../../public/locales/cs-CZ/common.json";
import daDKCommon from "../../../public/locales/da-DK/common.json";
import deATCommon from "../../../public/locales/de-AT/common.json";
import deCHCommon from "../../../public/locales/de-CH/common.json";
import deDECommon from "../../../public/locales/de-DE/common.json";
import elGRCommon from "../../../public/locales/el-GR/common.json";
import enCommon from "../../../public/locales/en/common.json";
import enAUCommon from "../../../public/locales/en-AU/common.json";
import enCACommon from "../../../public/locales/en-CA/common.json";
import enGBCommon from "../../../public/locales/en-GB/common.json";
import esESCommon from "../../../public/locales/es-ES/common.json";
import fiFICommon from "../../../public/locales/fi-FI/common.json";
import frBECommon from "../../../public/locales/fr-BE/common.json";
import frCACommon from "../../../public/locales/fr-CA/common.json";
import frCHCommon from "../../../public/locales/fr-CH/common.json";
import frFRCommon from "../../../public/locales/fr-FR/common.json";
import hrHRCommon from "../../../public/locales/hr-HR/common.json";
import itCHCommon from "../../../public/locales/it-CH/common.json";
import itITCommon from "../../../public/locales/it-IT/common.json";
import nbNOCommon from "../../../public/locales/nb-NO/common.json";
import nlBECommon from "../../../public/locales/nl-BE/common.json";
import plCommon from "../../../public/locales/pl/common.json";
import ptPTCommon from "../../../public/locales/pt-PT/common.json";
import roROCommon from "../../../public/locales/ro-RO/common.json";
import skSKCommon from "../../../public/locales/sk-SK/common.json";
import slSICommon from "../../../public/locales/sl-SI/common.json";
import svSECommon from "../../../public/locales/sv-SE/common.json";
import ukCommon from "../../../public/locales/uk/common.json";

const resources = {
  "bg-BG": {
    common: bgBGCommon,
  },
  "ca-AD": {
    common: caADCommon,
  },
  "cs-CZ": {
    common: csCZCommon,
  },
  "da-DK": {
    common: daDKCommon,
  },
  "de-AT": {
    common: deATCommon,
  },
  "de-CH": {
    common: deCHCommon,
  },
  "de-DE": {
    common: deDECommon,
  },
  "el-GR": {
    common: elGRCommon,
  },
  en: {
    common: enCommon,
  },
  "en-AU": {
    common: enAUCommon,
  },
  "en-CA": {
    common: enCACommon,
  },
  "en-GB": {
    common: enGBCommon,
  },
  "es-ES": {
    common: esESCommon,
  },
  "fi-FI": {
    common: fiFICommon,
  },
  "fr-BE": {
    common: frBECommon,
  },
  "fr-CA": {
    common: frCACommon,
  },
  "fr-CH": {
    common: frCHCommon,
  },
  "fr-FR": {
    common: frFRCommon,
  },
  "hr-HR": {
    common: hrHRCommon,
  },
  "it-CH": {
    common: itCHCommon,
  },
  "it-IT": {
    common: itITCommon,
  },
  "nb-NO": {
    common: nbNOCommon,
  },
  "nl-BE": {
    common: nlBECommon,
  },
  pl: {
    common: plCommon,
  },
  "pt-PT": {
    common: ptPTCommon,
  },
  "ro-RO": {
    common: roROCommon,
  },
  "sk-SK": {
    common: skSKCommon,
  },
  "sl-SI": {
    common: slSICommon,
  },
  "sv-SE": {
    common: svSECommon,
  },
  uk: {
    common: ukCommon,
  },
};

export const i18n = i18next.createInstance();

const getPreferredLanguage = (): Locale | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const savedLanguage = localStorage.getItem("preferredLanguage");
  const matchedSavedLanguage = matchLocale(savedLanguage);
  if (matchedSavedLanguage) {
    if (savedLanguage !== matchedSavedLanguage) {
      localStorage.setItem("preferredLanguage", matchedSavedLanguage);
    }
    return matchedSavedLanguage;
  }

  const detectedCountry = document.cookie
    .split("; ")
    .find((row) => row.startsWith("detected-country="))
    ?.split("=")[1];

  if (detectedCountry === "GB") {
    return "en-GB";
  }
  if (detectedCountry === "PL") {
    return "pl";
  }
  if (detectedCountry === "UA") {
    return "uk";
  }
  if (detectedCountry === "CZ") {
    return "cs-CZ";
  }
  if (detectedCountry === "SK") {
    return "sk-SK";
  }
  if (detectedCountry === "ES") {
    return "es-ES";
  }
  if (detectedCountry === "FR") {
    return "fr-FR";
  }
  if (detectedCountry === "IT") {
    return "it-IT";
  }
  if (detectedCountry === "DE") {
    return "de-DE";
  }
  if (detectedCountry === "AT") {
    return "de-AT";
  }
  if (detectedCountry === "CH") {
    // Switzerland is multilingual - detect browser language preference
    const browserLanguages: string[] =
      Array.isArray(navigator.languages) && navigator.languages.length
        ? [...navigator.languages]
        : [navigator.language];

    for (const browserLang of browserLanguages) {
      const lang = browserLang.toLowerCase();
      if (lang.startsWith("de")) return "de-CH";
      if (lang.startsWith("fr")) return "fr-CH";
      if (lang.startsWith("it")) return "it-CH";
    }
    // Default to German for Swiss users if no preference found
    return "de-CH";
  }
  if (detectedCountry === "SI") {
    return "sl-SI";
  }
  if (detectedCountry === "SE") {
    return "sv-SE";
  }
  if (detectedCountry === "NO") {
    return "nb-NO";
  }

  const browserLanguages: string[] =
    Array.isArray(navigator.languages) && navigator.languages.length
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

export const getInitialLanguage = (): Locale => getPreferredLanguage() ?? i18nConfig.defaultLocale;

let initPromise: Promise<I18nInstance> | null = null;

// Reset initialization on hot reload (only in development)
if (typeof window !== "undefined" && typeof module !== "undefined" && (module as any).hot) {
  (module as any).hot.dispose(() => {
    initPromise = null;
  });
}

export const initI18n = (): Promise<I18nInstance> => {
  if (!initPromise) {
    initPromise = (async () => {
      const initialLanguage = getInitialLanguage();

      // If already initialized, just change language
      if (i18n.isInitialized) {
        const currentLanguage = resolveLocale(i18n.language);
        if (currentLanguage !== initialLanguage) {
          await i18n.changeLanguage(initialLanguage);
        }
        return i18n;
      }

      await i18n.use(initReactI18next).init({
        lng: initialLanguage,
        fallbackLng: i18nConfig.defaultLocale,
        supportedLngs: i18nConfig.locales,
        ns: ["common"],
        defaultNS: "common",
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
