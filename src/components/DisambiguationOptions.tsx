import { memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useStickToBottomContext } from "use-stick-to-bottom";
import { logRender } from "@/lib/debug/render-log";
import { useClientTranslation } from "@/hooks/useClientTranslation";

interface DisambiguationOption {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  rockType?: string;
}

interface DisambiguationResult {
  disambiguate: true;
  message: string;
  translationKey?: string;
  translationParams?: Record<string, string | number>;
  source?: string;
  options: DisambiguationOption[];
}

interface DisambiguationOptionsProps {
  result: DisambiguationResult;
  displayMessage: string;
  queryTemplate: string;
  onOptionSelect: (queryText: string) => void;
}

export const DisambiguationOptions = memo(function DisambiguationOptions({
  result,
  displayMessage,
  queryTemplate,
  onOptionSelect,
}: DisambiguationOptionsProps) {
  const { scrollToBottom } = useStickToBottomContext();
  const { t } = useClientTranslation("common");

  logRender("DisambiguationOptions", {
    options: result.options.length,
    hasSource: !!result.source,
  });

  // Translate rock type if available
  const translateRockType = useCallback((rockType: string | undefined): string | undefined => {
    if (!rockType) return undefined;
    const key = `rockTypes.${rockType}`;
    const translated = t(key);
    // If translation key doesn't exist, t() returns the key itself, so fallback to original
    return translated !== key ? translated : rockType;
  }, [t]);

  const handleOptionClick = useCallback(
    (option: DisambiguationOption) => {
      const queryText = queryTemplate
        .replace("{{name}}", option.name + (option.rockType ? ` ${option.rockType}` : ""))
        .replace("{{latitude}}", option.latitude.toString())
        .replace("{{longitude}}", option.longitude.toString());

      onOptionSelect(queryText);
      // Ensure the chat view jumps to the latest message
      try {
        scrollToBottom();
        // Also schedule after the message enqueues to cover async updates
        setTimeout(() => scrollToBottom(), 0);
      } catch {
        // no-op
      }
    },
    [queryTemplate, onOptionSelect, scrollToBottom]
  );

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{displayMessage}</p>
      <div className="flex flex-wrap gap-2 overflow-visible">
        {result.options.map((option, idx) => (
          <Button
            key={option.id}
            variant="outline"
            size="sm"
            onClick={() => handleOptionClick(option)}
            className="flex flex-col items-start h-auto py-2 px-3 overflow-visible animate-in fade-in slide-in-from-bottom-2 duration-500"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <span className="font-medium text-left">
              {option.name}
              {option.rockType && (
                <span className="ml-1.5 text-orange-600 dark:text-orange-400">
                  ({translateRockType(option.rockType)})
                </span>
              )}
            </span>
            <span className="text-xs opacity-70">
              {option.location}
              {option.rockType && (
                <span className="ml-1.5 text-orange-600 dark:text-orange-400">
                  • {translateRockType(option.rockType)}
                </span>
              )}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
});
