"use client";

import { cn } from "@/lib/utils";
import { type ComponentProps, memo } from "react";
import { Streamdown } from "streamdown";

type ResponseProps = ComponentProps<typeof Streamdown>;

// Custom paragraph component to detect and style safety warnings
const WarningAwareParagraph = ({
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => {
  // Extract text from children (handles string, array, or React elements)
  const getText = (content: React.ReactNode): string => {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) return content.map(getText).join("");
    if (content && typeof content === "object" && "props" in content && content.props) {
      const reactElement = content as { props: { children?: React.ReactNode } };
      return getText(reactElement.props.children);
    }
    return "";
  };

  const text = getText(children);

  // Detect substantial safety warnings (language-agnostic)
  // Must start with ⚠️ and be longer than 50 chars to avoid false positives on short weather warnings
  const isWarning = text.startsWith("⚠️") && text.length > 50;

  return (
    <p className={cn(isWarning && "text-destructive font-semibold", props.className)} {...props}>
      {children}
    </p>
  );
};

export const Response = memo(
  ({ className, ...props }: ResponseProps) => (
    <Streamdown
      className={cn(
        "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&>p:first-child]:mt-0",
        className
      )}
      components={{
        p: WarningAwareParagraph,
      }}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

Response.displayName = "Response";
