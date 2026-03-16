/**
 * i18n setup for mobile app
 * Reuses translation files from the web app
 */

import i18next from "i18next";
import { initReactI18next } from "react-i18next";

// Import all locale files
import en from "./locales/en/common.json";
import bgBG from "./locales/bg-BG/common.json";
import caAD from "./locales/ca-AD/common.json";
import csCZ from "./locales/cs-CZ/common.json";
import daDK from "./locales/da-DK/common.json";
import deAT from "./locales/de-AT/common.json";
import deCH from "./locales/de-CH/common.json";
import deDE from "./locales/de-DE/common.json";
import elGR from "./locales/el-GR/common.json";
import enAU from "./locales/en-AU/common.json";
import enCA from "./locales/en-CA/common.json";
import enGB from "./locales/en-GB/common.json";
import esES from "./locales/es-ES/common.json";
import fiFI from "./locales/fi-FI/common.json";
import frBE from "./locales/fr-BE/common.json";
import frCA from "./locales/fr-CA/common.json";
import frCH from "./locales/fr-CH/common.json";
import frFR from "./locales/fr-FR/common.json";
import hrHR from "./locales/hr-HR/common.json";
import itCH from "./locales/it-CH/common.json";
import itIT from "./locales/it-IT/common.json";
import nbNO from "./locales/nb-NO/common.json";
import nlBE from "./locales/nl-BE/common.json";
import pl from "./locales/pl/common.json";
import ptPT from "./locales/pt-PT/common.json";
import roRO from "./locales/ro-RO/common.json";
import skSK from "./locales/sk-SK/common.json";
import slSI from "./locales/sl-SI/common.json";
import svSE from "./locales/sv-SE/common.json";
import uk from "./locales/uk/common.json";

const resources = {
  en: { common: en },
  "bg-BG": { common: bgBG },
  "ca-AD": { common: caAD },
  "cs-CZ": { common: csCZ },
  "da-DK": { common: daDK },
  "de-AT": { common: deAT },
  "de-CH": { common: deCH },
  "de-DE": { common: deDE },
  "el-GR": { common: elGR },
  "en-AU": { common: enAU },
  "en-CA": { common: enCA },
  "en-GB": { common: enGB },
  "es-ES": { common: esES },
  "fi-FI": { common: fiFI },
  "fr-BE": { common: frBE },
  "fr-CA": { common: frCA },
  "fr-CH": { common: frCH },
  "fr-FR": { common: frFR },
  "hr-HR": { common: hrHR },
  "it-CH": { common: itCH },
  "it-IT": { common: itIT },
  "nb-NO": { common: nbNO },
  "nl-BE": { common: nlBE },
  pl: { common: pl },
  "pt-PT": { common: ptPT },
  "ro-RO": { common: roRO },
  "sk-SK": { common: skSK },
  "sl-SI": { common: slSI },
  "sv-SE": { common: svSE },
  uk: { common: uk },
};

i18next.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  defaultNS: "common",
  interpolation: {
    escapeValue: false,
  },
});

export default i18next;
