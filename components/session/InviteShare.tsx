"use client";

import { QRCodeSVG } from "qrcode.react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export function InviteShare({ inviteUrl }: { inviteUrl: string }) {
  const t = useTranslations("group.invite");

  async function copy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success(t("copied"));
    } catch {
      toast.error("Не удалось скопировать");
    }
  }

  return (
    <div className="card-edge rounded-2xl p-6 flex flex-col sm:flex-row items-start gap-6">
      <div className="bg-cream p-3 rounded-xl shrink-0 shadow-[0_0_0_1px_rgba(201,162,76,0.4)]">
        <QRCodeSVG value={inviteUrl} size={112} bgColor="#F2E9D8" fgColor="#5B0E2D" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-display italic text-2xl mb-1">{t("share")}</h3>
        <p className="text-sm text-muted italic mb-4">{t("shareDescription")}</p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={inviteUrl}
            className="flex-1 min-w-0 h-10 px-3 rounded-full bg-background border border-border text-sm font-mono"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            type="button"
            onClick={copy}
            className="btn-ghost h-10 px-4 rounded-full text-sm smallcaps"
          >
            {t("copy")}
          </button>
        </div>
      </div>
    </div>
  );
}
