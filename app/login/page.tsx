"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { QuickEntryForm } from "@/components/auth/QuickEntryForm";

export default function LoginPage() {
  const t = useTranslations("auth.magicLink");
  const router = useRouter();
  const [showHost, setShowHost] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  // Owner login: e-mail + password — instant, any device, no email round-trip.
  async function onPasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setBusy(false);
      toast.error("Неверный e-mail или пароль");
      return;
    }
    // Ensure group membership (no-op for an existing owner), then enter.
    await fetch("/api/auth/bootstrap", { method: "POST" }).catch(() => {});
    router.push("/");
    router.refresh();
  }

  // Fallback: email a one-time link (e.g. if password forgotten).
  async function onMagicLink() {
    if (!email) {
      toast.error("Введите e-mail");
      return;
    }
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      setSent(true);
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

        {showHost ? (
          <form onSubmit={onPasswordLogin} className="flex flex-col gap-4">
            <p className="smallcaps text-[10px] text-gold text-center">Вход для хозяина</p>
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
            <div>
              <label className="block mb-2 smallcaps text-[10px] text-muted">Пароль</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-underline"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="btn-seal h-12 rounded-full inline-flex items-center justify-center"
            >
              <span>{busy ? "…" : "Войти"}</span>
            </button>
            {sent ? (
              <p className="text-center text-muted italic text-xs">{t("sent")}</p>
            ) : (
              <button
                type="button"
                onClick={onMagicLink}
                disabled={busy}
                className="smallcaps text-[10px] text-muted hover:text-gold transition-colors"
              >
                забыли пароль? — прислать ссылку на e-mail
              </button>
            )}
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowHost(true)}
            className="block mx-auto smallcaps text-[11px] text-muted hover:text-gold transition-colors"
          >
            вход для хозяина — по e-mail и паролю
          </button>
        )}
      </div>
    </div>
  );
}
