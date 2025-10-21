"use client";

import i18next, { type i18n as I18nInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { i18nConfig, matchLocale, resolveLocale, type Locale } from "./config";
import enCommon from "../../../public/locales/en/common.json";
import enGBCommon from "../../../public/locales/en-GB/common.json";
import plCommon from "../../../public/locales/pl/common.json";
import ukCommon from "../../../public/locales/uk/common.json";
import csCZCommon from "../../../public/locales/cs-CZ/common.json";
import skSKCommon from "../../../public/locales/sk-SK/common.json";
import esESCommon from "../../../public/locales/es-ES/common.json";
import frFRCommon from "../../../public/locales/fr-FR/common.json";
import frCHCommon from "../../../public/locales/fr-CH/common.json";
import itITCommon from "../../../public/locales/it-IT/common.json";
import itCHCommon from "../../../public/locales/it-CH/common.json";
import deDECommon from "../../../public/locales/de-DE/common.json";
import deATCommon from "../../../public/locales/de-AT/common.json";
import deCHCommon from "../../../public/locales/de-CH/common.json";
import slSICommon from "../../../public/locales/sl-SI/common.json";
import svSECommon from "../../../public/locales/sv-SE/common.json";
import nbNOCommon from "../../../public/locales/nb-NO/common.json";

const resources = {
  en: {
    common: enCommon,
  },
  "en-GB": {
    common: enGBCommon,
  },
  pl: {
    common: plCommon,
  },
  uk: {
    common: ukCommon,
  },
  "cs-CZ": {
    common: csCZCommon,
  },
  "sk-SK": {
    common: skSKCommon,
  },
  "es-ES": {
    common: esESCommon,
  },
  "fr-FR": {
    common: frFRCommon,
  },
  "fr-CH": {
    common: frCHCommon,
  },
  "it-IT": {
    common: itITCommon,
  },
  "it-CH": {
    common: itCHCommon,
  },
  "de-DE": {
    common: deDECommon,
  },
  "de-AT": {
    common: deATCommon,
  },
  "de-CH": {
    common: deCHCommon,
  },
  "sl-SI": {
    common: slSICommon,
  },
  "sv-SE": {
    common: svSECommon,
  },
  "nb-NO": {
    common: nbNOCommon,
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

export const initI18n = (): Promise<I18nInstance> => {
  if (!initPromise) {
    initPromise = (async () => {
      const initialLanguage = getInitialLanguage();

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
