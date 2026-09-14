"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

interface CodeBlockProps {
  children: string;
  /** Accessible label for the copy button, e.g. "Copy the server URL". */
  label?: string;
}

/**
 * Code block with a copy button. Client-side because of the clipboard call —
 * the docs pages around it stay static.
 */
export function CodeBlock({ children, label }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Don't set state on an unmounted component if the user navigates mid-timeout.
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be unavailable (insecure context, denied permission).
      // The text is selectable either way, so fail quietly.
    }
  }, [children]);

  return (
    <div className="group relative">
      <pre className="overflow-x-auto rounded border border-border bg-muted/50 p-3 pr-12 text-xs leading-relaxed">
        <code>{children}</code>
      </pre>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "Copied" : (label ?? "Copy to clipboard")}
        className="absolute right-2 top-2 rounded border border-border bg-background/80 p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-500" aria-hidden="true" />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
