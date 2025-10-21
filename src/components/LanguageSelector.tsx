"use client";

import { useClientTranslation } from "@/hooks/useClientTranslation";
import { i18nConfig, resolveLocale, type Locale } from "@/lib/i18n/config";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check } from "lucide-react";

const languageConfig: Record<Locale, { name: string; flag: string }> = {
  en: { name: "English (US)", flag: "🇺🇸" },
  "en-GB": { name: "English (UK)", flag: "🇬🇧" },
  pl: { name: "Polski", flag: "🇵🇱" },
  uk: { name: "Українська", flag: "🇺🇦" },
  "cs-CZ": { name: "Čeština", flag: "🇨🇿" },
  "sk-SK": { name: "Slovenčina", flag: "🇸🇰" },
  "es-ES": { name: "Español (España)", flag: "🇪🇸" },
  "fr-FR": { name: "Français", flag: "🇫🇷" },
  "it-IT": { name: "Italiano", flag: "🇮🇹" },
  "de-DE": { name: "Deutsch (Deutschland)", flag: "🇩🇪" },
  "de-AT": { name: "Deutsch (Österreich)", flag: "🇦🇹" },
  "sl-SI": { name: "Slovenščina", flag: "🇸🇮" },
  "sv-SE": { name: "Svenska", flag: "🇸🇪" },
  "nb-NO": { name: "Norsk (Bokmål)", flag: "🇳🇴" },
};

export function LanguageSelector() {
  const { i18n, language, rawLanguage, t } = useClientTranslation("common");
  const currentLocale: Locale = resolveLocale(rawLanguage ?? language);
  const currentFlag = languageConfig[currentLocale]?.flag || languageConfig.en.flag;
  const sortedLocales = [...i18nConfig.locales].sort((a, b) =>
    languageConfig[a].name.localeCompare(languageConfig[b].name, undefined, {
      sensitivity: "base",
    })
  ) as Locale[];

  const changeLanguage = (locale: Locale) => {
    void i18n.changeLanguage(locale);
    localStorage.setItem("preferredLanguage", locale);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full text-xl leading-none transition-colors data-[state=open]:bg-muted"
        >
          {currentFlag}
          <span className="sr-only">{t("ui.selectLanguage")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[200px] p-1 shadow-lg">
        <div className="grid gap-1">
          {sortedLocales.map((locale) => {
            const { name, flag } = languageConfig[locale];
            const isSelected = currentLocale === locale;
            return (
              <DropdownMenuItem
                key={locale}
                onClick={() => changeLanguage(locale)}
                className={`flex items-center justify-between gap-3 cursor-pointer
                  py-2 px-3 rounded-md text-sm
                  transition-colors
                  hover:bg-muted focus:!bg-muted focus:!text-foreground
                  ${isSelected ? "bg-muted font-medium" : ""}
                `}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl leading-none">{flag}</span>
                  <span className="font-medium">{name}</span>
                </div>
                {isSelected && <Check className="h-4 w-4 text-muted-foreground shrink-0" />}
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
