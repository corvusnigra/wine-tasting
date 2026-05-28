"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Scale = "5stars" | "20pt";

export function ProfileForm({
  initialDisplayName,
  initialScale,
  email,
}: {
  initialDisplayName: string;
  initialScale: Scale;
  email: string | null;
}) {
  const router = useRouter();
  const supabase = useRef(createSupabaseBrowserClient()).current;
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [scale, setScale] = useState<Scale>(initialScale);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setError("Войдите снова");
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || "Гость",
        preferred_scale: scale,
      })
      .eq("id", userData.user.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-10">
      <section>
        <div className="section-marker">
          <span className="num">i.</span>
          <span className="label">Имя</span>
          <span className="rule" />
        </div>
        <p className="text-sm text-muted italic mb-3">
          Как вас увидят в группе — над оценками и в раскрытии.
        </p>
        <input
          type="text"
          required
          maxLength={40}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Аня"
          className="input-underline"
        />
      </section>

      <section>
        <div className="section-marker">
          <span className="num">ii.</span>
          <span className="label">Шкала по умолчанию</span>
          <span className="rule" />
        </div>
        <p className="text-sm text-muted italic mb-4">
          Как вы предпочитаете ставить итоговую оценку. Переключить можно на
          лету в конце каждой карточки.
        </p>
        <div className="flex gap-2">
          {(["5stars", "20pt"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScale(s)}
              className={`flex-1 sm:flex-none h-12 px-6 rounded-full font-display italic text-base transition-colors ${
                scale === s
                  ? "bg-bordeaux text-cream border border-bordeaux"
                  : "bg-surface border border-border text-muted hover:border-gold"
              }`}
            >
              {s === "5stars" ? "★ пять звёзд" : "12-20 pt Jancis"}
            </button>
          ))}
        </div>
      </section>

      {email && (
        <section>
          <div className="section-marker">
            <span className="num">iii.</span>
            <span className="label">Аккаунт</span>
            <span className="rule" />
          </div>
          <p className="text-sm font-mono text-muted">{email}</p>
        </section>
      )}

      {error && <p className="text-sm text-rust italic">{error}</p>}

      <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
        {saved ? (
          <p className="smallcaps text-xs text-gold">✓ сохранено</p>
        ) : (
          <span className="text-xs text-muted italic">
            Изменения применятся сразу.
          </span>
        )}
        <button
          type="submit"
          disabled={saving}
          className="btn-seal h-12 px-7 rounded-full inline-flex items-center gap-2"
        >
                    <span>{saving ? "…" : "Сохранить"}</span>
        </button>
      </div>
    </form>
  );
}
