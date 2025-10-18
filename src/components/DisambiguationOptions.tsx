import { memo, useCallback } from 'react';
import { Button } from '@/components/ui/button';

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
  const handleOptionClick = useCallback((option: DisambiguationOption) => {
    const queryText = queryTemplate
      .replace('{{name}}', option.name + (option.rockType ? ` ${option.rockType}` : ""))
      .replace('{{latitude}}', option.latitude.toString())
      .replace('{{longitude}}', option.longitude.toString());

    onOptionSelect(queryText);
  }, [queryTemplate, onOptionSelect]);

  return (
    <div className="mt-3 space-y-2">
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
                  ({option.rockType})
                </span>
              )}
            </span>
            <span className="text-xs opacity-70">
              {option.location}
              {option.rockType && (
                <span className="ml-1.5 text-orange-600 dark:text-orange-400">
                  • {option.rockType}
                </span>
              )}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
});
