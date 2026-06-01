"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

type Props<T extends string> = {
  label: string;
  options: readonly T[];
  optionLabels: Record<T, string>;
  value: T | undefined;
  onChange: (v: T) => void;
  hint?: string;
};

export function ScaleSlider<T extends string>({
  label,
  options,
  optionLabels,
  value,
  onChange,
  hint,
}: Props<T>) {
  const itemRefs = useRef(new Map<string, HTMLButtonElement>());
  const containerRef = useRef<HTMLDivElement>(null);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (!value) return;
    const el = itemRefs.current.get(value);
    if (el && containerRef.current) {
      el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [value]);

  return (
    <fieldset>
      <div className="flex items-baseline justify-between gap-3 mb-2.5">
        <div className="min-w-0 flex items-center gap-2">
          <span className="smallcaps text-[11px] text-foreground">{label}</span>
          {hint && (
            <button
              type="button"
              onClick={() => setShowHint((v) => !v)}
              aria-label="Как проверить"
              aria-expanded={showHint}
              className={cn(
                "shrink-0 inline-flex items-center justify-center w-5 h-5 -my-1.5 rounded-full border text-[10px] font-display italic leading-none transition-colors",
                showHint
                  ? "bg-gold/15 border-gold text-gold"
                  : "border-gold/40 text-gold/70 hover:border-gold hover:text-gold"
              )}
            >
              ?
            </button>
          )}
        </div>
        <span className="font-display italic text-base text-gold shrink-0 transition-all">
          {value ? optionLabels[value] : "не выбрано"}
        </span>
      </div>

      {hint && showHint && (
        <p className="anim-fade-up text-[12px] text-muted italic leading-snug pl-3 border-l border-gold/40 mb-3">
          {hint}
        </p>
      )}

      <div className="relative -mx-1">
        <div ref={containerRef} className="scroll-row flex gap-1.5 px-1 py-1">
          {options.map((opt) => {
            const selected = value === opt;
            return (
              <button
                key={opt}
                ref={(el) => {
                  if (el) itemRefs.current.set(opt, el);
                  else itemRefs.current.delete(opt);
                }}
                type="button"
                onClick={() => {
                  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                    navigator.vibrate(8);
                  }
                  onChange(opt);
                }}
                aria-pressed={selected}
                className={cn(
                  "snap-center shrink-0 min-h-11 px-4 rounded-full text-sm whitespace-nowrap transition-all duration-200 active:scale-95",
                  selected
                    ? "bg-bordeaux text-cream border border-bordeaux font-display italic shadow-[0_2px_10px_-2px_rgba(91,14,45,0.6),inset_0_0_0_1px_rgba(201,162,76,0.4)]"
                    : "bg-surface border border-border text-foreground/85 hover:border-gold"
                )}
              >
                {optionLabels[opt]}
              </button>
            );
          })}
          <span aria-hidden className="shrink-0 w-1" />
        </div>
        {/* Edge fade — visual scroll affordance */}
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-background to-transparent"
        />
      </div>
    </fieldset>
  );
}
