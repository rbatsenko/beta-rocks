/**
 * Language context - persisted locale selection with MMKV
 * Matches the web app's supported locales
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { MMKV } from "react-native-mmkv";
import * as Localization from "expo-localization";
import i18next from "i18next";

const LANGUAGE_STORAGE_KEY = "beta_rocks_language";
const storage = new MMKV();

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "bg-BG", label: "Български" },
  { code: "ca-AD", label: "Català" },
  { code: "cs-CZ", label: "Čeština" },
  { code: "da-DK", label: "Dansk" },
  { code: "de-DE", label: "Deutsch" },
  { code: "de-AT", label: "Deutsch (AT)" },
  { code: "de-CH", label: "Deutsch (CH)" },
  { code: "el-GR", label: "Ελληνικά" },
  { code: "es-ES", label: "Español" },
  { code: "fi-FI", label: "Suomi" },
  { code: "fr-FR", label: "Français" },
  { code: "fr-BE", label: "Français (BE)" },
  { code: "fr-CA", label: "Français (CA)" },
  { code: "fr-CH", label: "Français (CH)" },
  { code: "hr-HR", label: "Hrvatski" },
  { code: "it-IT", label: "Italiano" },
  { code: "it-CH", label: "Italiano (CH)" },
  { code: "nb-NO", label: "Norsk" },
  { code: "nl-BE", label: "Nederlands (BE)" },
  { code: "pl", label: "Polski" },
  { code: "pt-PT", label: "Português" },
  { code: "ro-RO", label: "Română" },
  { code: "sk-SK", label: "Slovenčina" },
  { code: "sl-SI", label: "Slovenščina" },
  { code: "sv-SE", label: "Svenska" },
  { code: "uk", label: "Українська" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function detectDeviceLanguage(): LanguageCode {
  const deviceLocale = Localization.getLocales()[0]?.languageTag || "en";
  const match = SUPPORTED_LANGUAGES.find(
    (l) => l.code.toLowerCase() === deviceLocale.toLowerCase()
  );
  if (match) return match.code;

  // Try partial match (e.g. "en-US" -> "en")
  const lang = deviceLocale.split("-")[0];
  const partial = SUPPORTED_LANGUAGES.find(
    (l) => l.code.split("-")[0].toLowerCase() === lang.toLowerCase()
  );
  return partial?.code || "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>("en");

  useEffect(() => {
    const saved = storage.getString(LANGUAGE_STORAGE_KEY);
    let lang: LanguageCode;
    if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
      lang = saved as LanguageCode;
    } else {
      lang = detectDeviceLanguage();
    }
    setLanguageState(lang);
    i18next.changeLanguage(lang);
  }, []);

  function setLanguage(code: LanguageCode) {
    storage.set(LANGUAGE_STORAGE_KEY, code);
    setLanguageState(code);
    i18next.changeLanguage(code);
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
