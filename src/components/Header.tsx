"use client";

import Link from "next/link";
import { CloudSun } from "lucide-react";
import { ReactNode } from "react";

interface HeaderProps {
  /** Optional actions to render on the right side of the header */
  actions?: ReactNode;
}

/**
 * Shared header component used across temps.rocks
 * Displays the logo/branding on the left and custom actions on the right
 */
export function Header({ actions }: HeaderProps) {
  return (
    <header className="border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60 sticky top-0 z-50">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <CloudSun className="w-6 h-6 text-orange-500" />
          <h1 className="text-xl font-bold">temps.rocks</h1>
        </Link>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
