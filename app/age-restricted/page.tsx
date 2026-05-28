import { useTranslations } from "next-intl";

export default function AgeRestricted() {
  const t = useTranslations("ageRestricted");
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="font-display text-4xl mb-4">{t("title")}</h1>
      <p className="text-muted max-w-md leading-relaxed">{t("description")}</p>
    </div>
  );
}
