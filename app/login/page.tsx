"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const t = useTranslations("auth.magicLink");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setStatus("error");
      setError(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 wine-vignette">
      <div className="w-full max-w-sm">
        <p className="smallcaps text-xs text-gold mb-3 text-center">Вход</p>
        <h1 className="font-display italic text-5xl leading-[0.95] text-center mb-2">
          {t("title")}
        </h1>
        <div className="ornament my-7">
          <span className="text-xs">·</span>
        </div>

        {status === "sent" ? (
          <p className="text-center text-muted italic">{t("sent")}</p>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-7">
            <div>
              <label className="block mb-2 smallcaps text-[10px] text-muted">
                {t("emailLabel")}
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("emailPlaceholder")}
                className="input-underline text-2xl"
              />
            </div>
            <button
              type="submit"
              disabled={status === "sending"}
              className="btn-seal h-12 px-6 rounded-full inline-flex items-center justify-center gap-2"
            >
                            <span>{t("submit")}</span>
            </button>
            {error && <p className="text-sm text-rust italic">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
