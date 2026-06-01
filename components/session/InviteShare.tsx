"use client";

import { QRCodeSVG } from "qrcode.react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export function InviteShare({ inviteUrl }: { inviteUrl: string }) {
  const t = useTranslations("group.invite");

  async function share() {
    // Native share sheet on phones (iMessage / Telegram / WhatsApp); falls
    // back to clipboard on desktop or if the user dismisses it.
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: "Sommelier Night", url: inviteUrl });
        return;
      } catch {
        // dismissed → fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success(t("copied"));
    } catch {
      toast.error("Не удалось скопировать");
    }
  }

  return (
    <div className="card-edge rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6 min-w-0">
      <div className="bg-cream p-3 rounded-xl shrink-0 shadow-[0_0_0_1px_rgba(201,162,76,0.4)]">
        <QRCodeSVG value={inviteUrl} size={120} bgColor="#F2E9D8" fgColor="#5B0E2D" />
      </div>
      <div className="flex-1 min-w-0 w-full text-center sm:text-left">
        <h3 className="font-display italic text-2xl mb-1">{t("share")}</h3>
        <p className="text-sm text-muted italic mb-4">{t("shareDescription")}</p>
        <div className="flex items-center gap-2 min-w-0">
          <input
            readOnly
            value={inviteUrl}
            className="flex-1 min-w-0 h-11 px-3 rounded-full bg-background border border-border font-mono text-[13px]"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            type="button"
            onClick={share}
            className="btn-seal h-11 px-5 rounded-full smallcaps text-xs shrink-0 whitespace-nowrap"
          >
            Поделиться
          </button>
        </div>
      </div>
    </div>
  );
}
