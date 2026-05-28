"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { QuickEntryForm } from "@/components/auth/QuickEntryForm";

export default function LoginPage() {
  const t = useTranslations("auth.magicLink");
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  async function onMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setStatus("idle");
      toast.error(error.message);
    } else {
      setStatus("sent");
      toast.success(t("sent"));
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 wine-vignette">
      <div className="w-full max-w-sm">
        <p className="smallcaps text-xs text-gold mb-3 text-center">Вход</p>
        <h1 className="font-display italic text-5xl leading-[0.95] text-center mb-2">
          Назовитесь
        </h1>
        <p className="text-center text-muted italic text-sm mt-3 mb-7">
          Друзья увидят вас под этим именем на странице вечера.
        </p>

        <QuickEntryForm />

        <div className="ornament my-8">
          <span className="text-xs">·</span>
        </div>

        {showEmail ? (
          status === "sent" ? (
            <p className="text-center text-muted italic">{t("sent")}</p>
          ) : (
            <form onSubmit={onMagicLink} className="flex flex-col gap-4">
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
                  className="input-underline"
                />
              </div>
              <p className="text-xs text-muted italic">
                Если хотите, чтобы заметки сохранились между устройствами.
              </p>
              <button
                type="submit"
                disabled={status === "sending"}
                className="btn-ghost h-11 px-5 rounded-full smallcaps text-xs"
              >
                {t("submit")}
              </button>
            </form>
          )
        ) : (
          <button
            type="button"
            onClick={() => setShowEmail(true)}
            className="block mx-auto smallcaps text-[11px] text-muted hover:text-gold transition-colors"
          >
            или войти по e-mail — для постоянных заметок
          </button>
        )}
      </div>
    </div>
  );
}
