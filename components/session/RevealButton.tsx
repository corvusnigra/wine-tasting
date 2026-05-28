"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function RevealButton({
  sessionId,
  enabled,
}: {
  sessionId: string;
  enabled: boolean;
}) {
  const t = useTranslations("session");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/sessions/${sessionId}/reveal`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Не удалось раскрыть");
        return;
      }
      router.push(`/sessions/${sessionId}/reveal`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        disabled={!enabled || isPending}
        onClick={onClick}
        className="btn-seal h-12 px-8 rounded-full inline-flex items-center gap-2"
      >
                <span>{isPending ? "…" : t("reveal")}</span>
      </button>
      {!enabled && <p className="text-xs text-muted italic">{t("revealLocked")}</p>}
      {error && <p className="text-sm text-rust">{error}</p>}
    </div>
  );
}
