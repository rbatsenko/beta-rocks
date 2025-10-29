/**
 * Maps our locale codes to date-fns locale objects
 */
import { enUS } from "date-fns/locale/en-US";
import { enGB } from "date-fns/locale/en-GB";
import { enCA } from "date-fns/locale/en-CA";
import { enAU } from "date-fns/locale/en-AU";
import { pl } from "date-fns/locale/pl";
import { uk } from "date-fns/locale/uk";
import { cs } from "date-fns/locale/cs";
import { sk } from "date-fns/locale/sk";
import { es } from "date-fns/locale/es";
import { fr } from "date-fns/locale/fr";
import { frCA } from "date-fns/locale/fr-CA";
import { frCH } from "date-fns/locale/fr-CH";
import { de } from "date-fns/locale/de";
import { deAT } from "date-fns/locale/de-AT";
import { it } from "date-fns/locale/it";
import { itCH } from "date-fns/locale/it-CH";
import { pt } from "date-fns/locale/pt";
import { nlBE } from "date-fns/locale/nl-BE";
import { da } from "date-fns/locale/da";
import { nb } from "date-fns/locale/nb";
import { sv } from "date-fns/locale/sv";
import { fi } from "date-fns/locale/fi";
import { el } from "date-fns/locale/el";
import { bg } from "date-fns/locale/bg";
import { ro } from "date-fns/locale/ro";
import { hr } from "date-fns/locale/hr";
import { sl } from "date-fns/locale/sl";
import { ca } from "date-fns/locale/ca";
import type { Locale } from "date-fns";

const dateLocaleMap: Record<string, Locale> = {
  en: enUS,
  "en-US": enUS,
  "en-GB": enGB,
  "en-CA": enCA,
  "en-AU": enAU,
  pl: pl,
  uk: uk,
  "cs-CZ": cs,
  "sk-SK": sk,
  "es-ES": es,
  "fr-FR": fr,
  "fr-BE": fr,
  "fr-CA": frCA,
  "fr-CH": frCH,
  "de-DE": de,
  "de-AT": deAT,
  "de-CH": de,
  "it-IT": it,
  "it-CH": itCH,
  "pt-PT": pt,
  "nl-BE": nlBE,
  "da-DK": da,
  "nb-NO": nb,
  "sv-SE": sv,
  "fi-FI": fi,
  "el-GR": el,
  "bg-BG": bg,
  "ro-RO": ro,
  "hr-HR": hr,
  "sl-SI": sl,
  "ca-AD": ca,
};

/**
 * Get the date-fns locale object for the current i18n language
 */
export function getDateFnsLocale(i18nLocale: string): Locale {
  return dateLocaleMap[i18nLocale] || enUS;
}

/**
 * Get the localized date format pattern for full date display
 * Different languages have different word order for dates
 */
export function getLocalizedDateFormat(i18nLocale: string): string {
  // Languages that use "day month year" order (most European languages)
  const dayMonthYearLocales = [
    "pl",
    "uk",
    "cs-CZ",
    "sk-SK",
    "es-ES",
    "fr-FR",
    "fr-BE",
    "fr-CA",
    "fr-CH",
    "de-DE",
    "de-AT",
    "de-CH",
    "it-IT",
    "it-CH",
    "pt-PT",
    "nl-BE",
    "da-DK",
    "nb-NO",
    "sv-SE",
    "fi-FI",
    "el-GR",
    "bg-BG",
    "ro-RO",
    "hr-HR",
    "sl-SI",
    "ca-AD",
  ];

  if (dayMonthYearLocales.includes(i18nLocale)) {
    return "EEEE, d MMMM yyyy";
  }

  // Default to English "month day, year" format
  return "EEEE, MMMM d, yyyy";
}
