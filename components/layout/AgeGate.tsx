"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "sommelier.ageConfirmed";
const COOKIE_NAME = "age_confirmed";
const COOKIE_TTL_DAYS = 30;

function readConfirmation(): boolean {
  if (typeof document === "undefined") return false;
  if (typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY) === "true") {
    return true;
  }
  return document.cookie.split("; ").some((c) => c.startsWith(`${COOKIE_NAME}=true`));
}

function writeConfirmation() {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, "true");
  }
  if (typeof document !== "undefined") {
    const expires = new Date();
    expires.setDate(expires.getDate() + COOKIE_TTL_DAYS);
    document.cookie = `${COOKIE_NAME}=true; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
  }
}

export function AgeGate({ children }: { children: ReactNode }) {
  const t = useTranslations("ageGate");
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "blocked" | "allowed">("checking");

  useEffect(() => {
    setStatus(readConfirmation() ? "allowed" : "blocked");
  }, []);

  if (status === "checking") return null;
  if (status === "allowed") return <>{children}</>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md p-6">
      <div className="max-w-md w-full card-edge rounded-2xl p-10 text-center">
        <p className="smallcaps text-xs text-gold mb-5">Пожалуйста</p>
        <h1 className="font-display italic text-4xl mb-5 leading-tight">{t("title")}</h1>
        <p className="text-muted italic mb-8 leading-relaxed">{t("description")}</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              writeConfirmation();
              setStatus("allowed");
            }}
            className="btn-seal h-12 rounded-full inline-flex items-center justify-center gap-2"
          >
                        <span>{t("confirm")}</span>
          </button>
          <button
            onClick={() => router.push("/age-restricted")}
            className="btn-ghost h-12 rounded-full smallcaps text-sm"
          >
            {t("decline")}
          </button>
        </div>
        <div className="ornament my-6">
          <span className="text-xs">·</span>
        </div>
        <p className="text-xs text-muted italic">{t("disclaimer")}</p>
      </div>
    </div>
  );
}
