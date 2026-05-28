"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { writeGuestId } from "@/lib/guest/guest-id";

/**
 * Single-tap entry: type a name → anonymous sign-in → ensure group → enter.
 * No email, no magic link, no inbox dance.
 */
export function QuickEntryForm({ returnTo = "/" }: { returnTo?: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);

    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.user) {
      toast.error(error?.message ?? "Не удалось войти");
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

    // Auto-create «Моя компания» via service-role bootstrap endpoint
    const bootstrapRes = await fetch("/api/auth/bootstrap", { method: "POST" });
    if (!bootstrapRes.ok) {
      const body = (await bootstrapRes.json().catch(() => null)) as
        | { error?: string }
        | null;
      toast.error(body?.error ?? "Не удалось создать группу");
      setSubmitting(false);
      return;
    }

    router.push(returnTo);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6 w-full">
      <div>
        <label className="block mb-2 smallcaps text-[10px] text-muted">
          Как вас представить
        </label>
        <input
          type="text"
          required
          autoFocus
          minLength={1}
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Аня"
          className="input-underline text-2xl"
        />
      </div>
      <button
        type="submit"
        disabled={submitting || !name.trim()}
        className="btn-seal h-12 px-6 rounded-full inline-flex items-center justify-center"
      >
        {submitting ? "…" : "Войти"}
      </button>
    </form>
  );
}
