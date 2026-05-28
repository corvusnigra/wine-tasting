"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { writeGuestId } from "@/lib/guest/guest-id";

export function GuestForm({ returnTo = "/" }: { returnTo?: string }) {
  const t = useTranslations("auth.guest");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.user) {
      toast.error(error?.message || tErr("generic"));
      setSubmitting(false);
      return;
    }
    writeGuestId(data.user.id);
    const { error: updErr } = await supabase
      .from("profiles")
      .update({ display_name: name.trim() })
      .eq("id", data.user.id);
    if (updErr) {
      toast.error(updErr.message);
      setSubmitting(false);
      return;
    }
    router.push(returnTo);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 w-full max-w-sm">
      <h2 className="font-display text-2xl text-center">{t("title")}</h2>
      <label className="flex flex-col gap-2">
        <span className="text-sm text-muted">{t("nameLabel")}</span>
        <input
          required
          minLength={1}
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
          className="h-12 px-4 rounded-full bg-surface border border-border focus:border-gold focus:outline-none transition-colors"
        />
      </label>
      <button
        type="submit"
        disabled={submitting || !name.trim()}
        className="btn-seal h-12 rounded-full font-medium disabled:opacity-50"
      >
        {t("submit")}
      </button>
    </form>
  );
}
