import { useTranslations } from "next-intl";
import Link from "next/link";

export function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="mt-16 sm:mt-24 border-t border-border">
      <div className="ornament max-w-5xl mx-auto px-5 sm:px-8 lg:px-12 py-6 sm:py-8">
        <span className="text-xs">·</span>
      </div>
      <div className="max-w-5xl mx-auto px-5 sm:px-8 lg:px-12 pb-8 sm:pb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm">
        <p className="text-muted italic max-w-xl leading-relaxed">
          {t("disclaimer")}
        </p>
        <nav className="flex gap-5 shrink-0 smallcaps text-xs">
          <Link href="/legal/terms" className="text-muted hover:text-foreground transition-colors">
            {t("terms")}
          </Link>
          <Link href="/legal/privacy" className="text-muted hover:text-foreground transition-colors">
            {t("privacy")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
