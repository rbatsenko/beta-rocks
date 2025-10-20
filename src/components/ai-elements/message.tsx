import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, HTMLAttributes } from "react";

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage["role"];
};

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    className={cn(
      "group flex w-full justify-end gap-2 py-4 animate-in fade-in slide-in-from-bottom-2 duration-500 transition-[width,height,max-width,min-width] duration-300",
      from === "user"
        ? "is-user items-end"
        : "is-assistant flex-row-reverse justify-end items-start",
      className
    )}
    {...props}
  />
);

const messageContentVariants = cva("is-user:dark flex flex-col rounded-lg text-sm transition-[width,height,max-width,min-width] duration-300 ease-out", {
  variants: {
    variant: {
      contained: [
        "max-w-[80%] px-4 py-3 gap-2",
        "group-[.is-user]:bg-gradient-to-br group-[.is-user]:from-orange-50 group-[.is-user]:to-orange-100/50 group-[.is-user]:dark:from-orange-950/50 group-[.is-user]:dark:to-orange-900/30 group-[.is-user]:border group-[.is-user]:border-orange-200 group-[.is-user]:dark:border-orange-800/50 group-[.is-user]:shadow-sm group-[.is-user]:dark:shadow-md group-[.is-user]:text-foreground group-[.is-user]:dark:text-inherit",
        "group-[.is-assistant]:bg-secondary group-[.is-assistant]:text-foreground",
      ],
      flat: [
        "group-[.is-user]:max-w-[80%] group-[.is-user]:bg-secondary group-[.is-user]:px-4 group-[.is-user]:py-3 group-[.is-user]:text-foreground group-[.is-user]:gap-2",
        "group-[.is-assistant]:max-w-full group-[.is-assistant]:text-foreground",
      ],
    },
  },
  defaultVariants: {
    variant: "contained",
  },
});

export type MessageContentProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof messageContentVariants>;

export const MessageContent = ({ children, className, variant, ...props }: MessageContentProps) => (
  <div className={cn(messageContentVariants({ variant, className }))} {...props}>
    {children}
  </div>
);

export type MessageAvatarProps = ComponentProps<typeof Avatar> & {
  src: string;
  name?: string;
};

export const MessageAvatar = ({ src, name, className, ...props }: MessageAvatarProps) => (
  <Avatar className={cn("size-8 ring-1 ring-border", className)} {...props}>
    <AvatarImage alt="" className="mt-0 mb-0" src={src} />
    <AvatarFallback>{name?.slice(0, 2) || "ME"}</AvatarFallback>
  </Avatar>
);
