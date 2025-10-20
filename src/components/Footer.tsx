"use client";

import { Sun } from "lucide-react";
import { useClientTranslation } from "@/hooks/useClientTranslation";

const Footer = () => {
  const { t } = useClientTranslation("common");

  return (
    <footer className="border-t py-12 px-6 bg-card">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Sun className="w-6 h-6 text-orange-500" />
            <span className="text-xl font-bold">{t("footer.brand")}</span>
          </div>

          <p className="text-sm text-muted-foreground text-center">{t("footer.description")}</p>

          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-primary transition-smooth">
              {t("footer.about")}
            </a>
            <a href="#" className="hover:text-primary transition-smooth">
              {t("footer.privacy")}
            </a>
            <a
              href="https://github.com/rbatsenko/temps-rocks"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-smooth"
            >
              {t("footer.github")}
            </a>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center text-xs text-muted-foreground">
          <p>{t("footer.attribution")}</p>
          <p className="mt-2">{t("footer.copyright")}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
