"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { toast } from "sonner";

export type EveningSummary = {
  title: string;
  dateLabel: string;
  participants: number;
  winner: { name: string; score: number | null } | null;
  wines: Array<{ position: number; name: string; score: number | null }>;
  palate: string[];
  controversial: string | null;
};

export function EveningCard({ summary }: { summary: EveningSummary }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  async function render(): Promise<Blob | null> {
    if (!cardRef.current) return null;
    const dataUrl = await toPng(cardRef.current, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: "#120709",
    });
    const res = await fetch(dataUrl);
    return res.blob();
  }

  async function onShare() {
    setBusy(true);
    try {
      const blob = await render();
      if (!blob) throw new Error("no blob");
      const file = new File([blob], "sommelier-night.png", { type: "image/png" });
      if (
        typeof navigator !== "undefined" &&
        "canShare" in navigator &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({ files: [file], title: summary.title });
      } else {
        download(blob);
      }
    } catch {
      toast.error("Не удалось собрать картинку");
    } finally {
      setBusy(false);
    }
  }

  async function onSave() {
    setBusy(true);
    try {
      const blob = await render();
      if (!blob) throw new Error("no blob");
      download(blob);
      toast.success("Картинка сохранена");
    } catch {
      toast.error("Не удалось собрать картинку");
    } finally {
      setBusy(false);
    }
  }

  function download(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${summary.title || "вечер"}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="btn-seal h-12 px-7 rounded-full inline-flex items-center justify-center gap-2"
        >
          <span>Карточка вечера</span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{ position: "fixed", inset: 0, zIndex: 40 }}
          className="bg-black/70 backdrop-blur-md data-[state=open]:animate-[fade-in_0.2s_ease-out]"
        />
        <Dialog.Content
          aria-describedby={undefined}
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 50,
          }}
          className="w-[calc(100vw-1.5rem)] max-w-[400px] max-h-[92dvh] overflow-y-auto data-[state=open]:animate-[fade-in_0.2s_ease-out] focus:outline-none"
        >
          <Dialog.Title className="sr-only">Карточка вечера</Dialog.Title>

          {/* The poster — captured to PNG */}
          <div
            ref={cardRef}
            className="rounded-2xl overflow-hidden"
            style={{
              background:
                "radial-gradient(120% 80% at 50% 0%, #3f0820 0%, #120709 60%)",
              border: "1px solid rgba(201,162,76,0.4)",
              fontFamily: "var(--font-lora), Georgia, serif",
              color: "#F2E9D8",
            }}
          >
            <div style={{ padding: "2rem 1.75rem" }}>
              <p
                style={{
                  fontVariant: "small-caps",
                  letterSpacing: "0.16em",
                  fontSize: "11px",
                  color: "#C9A24C",
                  marginBottom: "0.5rem",
                }}
              >
                sommelier night · {summary.dateLabel}
              </p>
              <h2
                style={{
                  fontFamily: "var(--font-yeseva), Georgia, serif",
                  fontSize: "2.25rem",
                  lineHeight: 1,
                  marginBottom: "1.5rem",
                }}
              >
                {summary.title}
              </h2>

              {summary.winner && (
                <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
                  <p
                    style={{
                      fontVariant: "small-caps",
                      letterSpacing: "0.14em",
                      fontSize: "10px",
                      color: "#C9A24C",
                      marginBottom: "0.5rem",
                    }}
                  >
                    вино вечера
                  </p>
                  <p
                    style={{
                      fontFamily: "var(--font-yeseva), Georgia, serif",
                      fontSize: "1.6rem",
                      lineHeight: 1.05,
                    }}
                  >
                    {summary.winner.name}
                  </p>
                  {summary.winner.score !== null && (
                    <p
                      style={{
                        fontStyle: "italic",
                        fontSize: "3rem",
                        color: "#C9A24C",
                        lineHeight: 1.1,
                      }}
                    >
                      {Math.round(summary.winner.score)}
                      <span style={{ fontSize: "0.9rem", opacity: 0.7 }}> /100</span>
                    </p>
                  )}
                </div>
              )}

              {/* Flight */}
              <div
                style={{
                  borderTop: "1px solid rgba(242,233,216,0.14)",
                  paddingTop: "1rem",
                }}
              >
                {summary.wines.map((w) => (
                  <div
                    key={w.position}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      padding: "0.4rem 0",
                      gap: "0.75rem",
                    }}
                  >
                    <span style={{ fontSize: "0.95rem" }}>
                      <span style={{ color: "#9c7e3a", fontStyle: "italic" }}>
                        {String(w.position).padStart(2, "0")}
                      </span>{" "}
                      {w.name}
                    </span>
                    {w.score !== null && (
                      <span
                        style={{ fontStyle: "italic", color: "#C9A24C", fontSize: "1.1rem" }}
                      >
                        {Math.round(w.score)}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {summary.palate.length > 0 && (
                <p
                  style={{
                    fontStyle: "italic",
                    fontSize: "1rem",
                    textAlign: "center",
                    margin: "1.25rem 0 0",
                    opacity: 0.85,
                  }}
                >
                  {summary.palate.join(" · ")}
                </p>
              )}

              {summary.controversial && (
                <p
                  style={{
                    fontVariant: "small-caps",
                    letterSpacing: "0.1em",
                    fontSize: "10px",
                    textAlign: "center",
                    color: "#C9A24C",
                    marginTop: "0.75rem",
                  }}
                >
                  ✧ самое спорное: {summary.controversial}
                </p>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "1.5rem",
                  paddingTop: "1rem",
                  borderTop: "1px solid rgba(242,233,216,0.14)",
                  fontSize: "10px",
                  color: "rgba(242,233,216,0.6)",
                }}
              >
                <span style={{ fontVariant: "small-caps", letterSpacing: "0.1em" }}>
                  {summary.participants}{" "}
                  {summary.participants === 1 ? "дегустатор" : "дегустатора"}
                </span>
                <span
                  style={{
                    border: "1px solid #C9A24C",
                    color: "#C9A24C",
                    borderRadius: "999px",
                    padding: "1px 6px",
                  }}
                >
                  18+
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={onSave}
              disabled={busy}
              className="btn-ghost flex-1 h-12 rounded-full smallcaps text-xs"
            >
              Сохранить
            </button>
            <button
              type="button"
              onClick={onShare}
              disabled={busy}
              className="btn-seal flex-1 h-12 rounded-full inline-flex items-center justify-center"
            >
              {busy ? "…" : "Поделиться"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
