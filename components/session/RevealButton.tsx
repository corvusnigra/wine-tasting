"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export function RevealButton({
  sessionId,
  enabled,
  canForce = false,
}: {
  sessionId: string;
  enabled: boolean;
  /** At least one participant has tasted — a forced reveal would have data. */
  canForce?: boolean;
}) {
  const t = useTranslations("session");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function reveal(force: boolean) {
    startTransition(async () => {
      let res: Response;
      try {
        res = await fetch(`/api/sessions/${sessionId}/reveal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ force }),
        });
      } catch {
        toast.error("Нет связи с сервером — попробуйте ещё раз");
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.error(body?.error ?? "Не удалось раскрыть");
        return;
      }
      router.push(`/sessions/${sessionId}/reveal`);
      router.refresh();
    });
  }

  function onForce() {
    if (
      window.confirm(
        "Раскрыть результаты, не дожидаясь остальных? Те, кто не закончил, попадут в подсчёт только по оценённым винам."
      )
    ) {
      reveal(true);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        disabled={!enabled || isPending}
        onClick={() => reveal(false)}
        className="btn-seal h-12 px-8 rounded-full inline-flex items-center gap-2"
      >
        <span>{isPending ? "…" : t("reveal")}</span>
      </button>
      {!enabled && <p className="text-xs text-muted italic">{t("revealLocked")}</p>}
      {!enabled && canForce && (
        <button
          type="button"
          disabled={isPending}
          onClick={onForce}
          className="smallcaps text-[11px] text-muted hover:text-gold transition-colors disabled:opacity-50"
        >
          раскрыть всё равно →
        </button>
      )}
    </div>
  );
}
