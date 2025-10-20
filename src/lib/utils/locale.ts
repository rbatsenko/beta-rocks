/**
 * Maps language codes to browser locale strings for date formatting
 * @param language - Language code (e.g., 'en', 'uk', 'de-DE')
 * @returns Browser-compatible locale string (e.g., 'en-US', 'uk-UA', 'de-DE')
 */
export function getLocaleFromLanguage(language: string): string {
  const localeMap: Record<string, string> = {
    'en': 'en-US',
    'en-GB': 'en-GB',
    'uk': 'uk-UA',
    'de-DE': 'de-DE',
    'de-AT': 'de-AT',
    'es-ES': 'es-ES',
    'fr-FR': 'fr-FR',
    'it-IT': 'it-IT',
    'nb-NO': 'nb-NO',
    'pl': 'pl-PL',
    'sl-SI': 'sl-SI',
    'sv-SE': 'sv-SE',
  };

  return localeMap[language] || 'en-US';
}
