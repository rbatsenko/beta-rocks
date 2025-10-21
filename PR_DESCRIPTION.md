# Add Czech, Slovak, and Switzerland Language Support

This PR adds complete Czech (cs-CZ), Slovak (sk-SK), and Switzerland (de-CH, fr-CH, it-CH) language support to temps.rocks, bringing the total number of supported locales from 12 to 17.

## Summary

- ✅ **Czech (Čeština)** - Complete translation with popular Czech crags
- ✅ **Slovak (Slovenčina)** - Complete translation with popular Slovak crags
- ✅ **Switzerland (3 variants)** - German, French, and Italian with smart language detection
- ✅ All UI components translated (220+ strings per locale)
- ✅ AI chat prompts in all languages
- ✅ Auto-detection for CZ, SK, and CH users
- ✅ Popular local climbing areas as quick actions

## Changes

### Czech Language (cs-CZ)

**Features:**
- Complete Czech translation of all UI strings
- Czech AI chat system prompt with climbing terminology
- Popular Czech crags as example queries:
  - 🧗 **Holštejn** - "Jaké jsou podmínky na Holštejnu zítra?"
  - 🧗 **Adrspach** - "Je Adrspach dnes odpoledne suchý?"
  - 🧗 **Labské pískovce** - "Jak to vypadá v Labských pískovcích?"

**Files Modified:**
- `src/lib/i18n/config.ts` - Added cs-CZ locale
- `src/lib/i18n/client.ts` - Imported Czech translations, added CZ country detection
- `src/components/LanguageSelector.tsx` - Added Čeština with 🇨🇿 flag
- `src/app/api/chat/prompts.ts` - Added Czech system prompt
- `public/locales/cs-CZ/common.json` - Complete Czech translations

### Slovak Language (sk-SK)

**Features:**
- Complete Slovak translation of all UI strings
- Slovak AI chat system prompt with climbing terminology
- Popular Slovak crags as example queries:
  - 🧗 **Demänovská dolina** - "Aké sú podmienky v Demänovskej doline zajtra?"
  - 🧗 **Harmanec** - "Je Harmanec dnes popoludní suchý?"
  - 🧗 **Višňové** - "Ako je na tom Višňové?"

**Files Modified:**
- `src/lib/i18n/config.ts` - Added sk-SK locale
- `src/lib/i18n/client.ts` - Imported Slovak translations, added SK country detection
- `src/components/LanguageSelector.tsx` - Added Slovenčina with 🇸🇰 flag
- `src/app/api/chat/prompts.ts` - Added Slovak system prompt
- `public/locales/sk-SK/common.json` - Complete Slovak translations

### Switzerland (de-CH, fr-CH, it-CH)

**Features:**
- Three language variants for Switzerland's multilingual regions
- Smart country detection based on browser language preference for CH users
- Complete translations for all UI components
- Swiss-specific crags as example queries:
  - 🧗 **de-CH (Deutsch - Schweiz)**: Gasterntal, Voralpsee, Gimmelwald
  - 🧗 **fr-CH (Français - Suisse)**: Saillon, Orvin, Grimsel
  - 🧗 **it-CH (Italiano - Svizzera)**: Cresciano, Val di Mello, Ticino
- All three use the 🇨🇭 Swiss flag

**Files Modified:**
- `src/lib/i18n/config.ts` - Added de-CH, fr-CH, it-CH locales
- `src/lib/i18n/client.ts` - Imported Swiss translations, added multilingual CH detection logic
- `src/components/LanguageSelector.tsx` - Added three Swiss variants with country labels
- `src/app/api/chat/prompts.ts` - Added Swiss prompts for all three languages
- `public/locales/{de-CH,fr-CH,it-CH}/common.json` - Complete translations

### Documentation

- Updated `CLAUDE.md` to reflect 17 supported locales (was 12)
- Added note about special multilingual handling for Switzerland

## Translation Coverage

All languages include translations for:
- ✅ Welcome screen & descriptions
- ✅ Chat interface (analyzing, thinking, input)
- ✅ Conditions ratings (great, good, fair, poor, nope)
- ✅ Weather conditions (30+ weather types)
- ✅ Warnings & reasons (humidity, temperature, wind, precipitation)
- ✅ Dialog content (detailed conditions, tabs, buttons)
- ✅ Footer links & attribution
- ✅ Features section
- ✅ Time context (sunrise, sunset, daylight)
- ✅ UI elements (theme toggle, language selector)

## Total Language Support

The app now supports **17 languages**:
1. English (US) 🇺🇸
2. English (UK) 🇬🇧
3. Polish 🇵🇱
4. Ukrainian 🇺🇦
5. **Czech 🇨🇿** ✨ NEW
6. **Slovak 🇸🇰** ✨ NEW
7. Spanish (Spain) 🇪🇸
8. French (France) 🇫🇷
9. **French (Switzerland) 🇨🇭** ✨ NEW
10. Italian (Italy) 🇮🇹
11. **Italian (Switzerland) 🇨🇭** ✨ NEW
12. German (Germany) 🇩🇪
13. German (Austria) 🇦🇹
14. **German (Switzerland) 🇨🇭** ✨ NEW
15. Slovenian 🇸🇮
16. Swedish 🇸🇪
17. Norwegian (Bokmål) 🇳🇴

## Testing

- ✅ Language selector shows all new languages
- ✅ Switching to Czech displays Czech UI with Czech crags
- ✅ Switching to Slovak displays Slovak UI with Slovak crags
- ✅ Switching to Swiss German/French/Italian displays appropriate Swiss UI
- ✅ Example queries use local climbing areas for each language
- ✅ AI chat responds in the selected language
- ✅ Auto-detection works for CZ, SK, and CH users
- ✅ Swiss users get language variant based on browser preference (de/fr/it)

## Commits

1. `feat: add Czech (cs-CZ) language support` - Initial Czech implementation
2. `fix: add Czech locale to LanguageSelector` - Fixed selector
3. `feat: add Slovak (sk-SK) language support` - Initial Slovak implementation
4. `fix: add Slovak prompt to chat assistant` - Fixed AI prompt
5. `feat: update Slovak locale with popular Slovak crags` - Added local crags
6. `fix: add Czech and Slovak translations to i18next resources` - Fixed translation loading
7. `feat: update Slovak example queries with popular crags` - Updated to Demänovská dolina, Harmanec, Višňové
8. `feat: update Czech example queries with popular Czech crags` - Added Adrspach, Labské pískovce, Hrubá Skála
9. `feat: replace Hrubá Skála with Holštejn in Czech queries` - Final Czech crag update
10. `feat: add Switzerland locales (de-CH, fr-CH, it-CH)` - Added three Swiss language variants with Swiss crags
11. `feat: add Swiss AI prompts for all three Swiss locales` - Added AI chat prompts with Swiss examples

🤖 Generated with [Claude Code](https://claude.com/claude-code)
