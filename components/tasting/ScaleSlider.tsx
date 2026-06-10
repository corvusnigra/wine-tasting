"use client";

import { useState } from "react";
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
  const [showHint, setShowHint] = useState(false);

  const selectedIdx = value ? options.indexOf(value) : -1;
  const fillPct =
    selectedIdx < 0 || options.length < 2
      ? 0
      : (selectedIdx / (options.length - 1)) * 100;

  return (
    <fieldset className="min-w-0">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="smallcaps text-[11px] text-foreground">{label}</span>
        {hint && (
          <button
            type="button"
            onClick={() => setShowHint((v) => !v)}
            aria-label="Как проверить"
            aria-expanded={showHint}
            className={cn(
              "shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full border text-[11px] font-display italic leading-none transition-colors",
              showHint
                ? "bg-gold/15 border-gold text-gold"
                : "border-gold/40 text-gold/70 hover:border-gold hover:text-gold"
            )}
          >
            ?
          </button>
        )}
        {value && (
          <button
            type="button"
            onClick={() => onChange(undefined as never)}
            className="ml-auto shrink-0 -my-2 py-2 px-1 text-[10px] text-muted hover:text-rust transition-colors underline-offset-2 hover:underline"
          >
            сбросить
          </button>
        )}
      </div>

      {hint && showHint && (
        <p className="anim-fade-up text-[12px] text-muted italic leading-snug pl-3 border-l border-gold/40 mb-3">
          {hint}
        </p>
      )}

      {/* Wrap so every option stays on-screen — long Russian labels must not
          run off the edge or hide behind a scroll. */}
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => {
                if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                  navigator.vibrate(8);
                }
                onChange(opt);
              }}
              aria-pressed={selected}
              className={cn(
                "min-h-11 px-4 rounded-full text-sm transition-all duration-200 active:scale-95 max-w-full",
                selected
                  ? "bg-bordeaux text-cream border border-bordeaux font-display italic shadow-[0_2px_10px_-2px_rgba(91,14,45,0.6),inset_0_0_0_1px_rgba(201,162,76,0.4)]"
                  : "bg-surface border border-border text-foreground/85 hover:border-gold"
              )}
            >
              {optionLabels[opt]}
            </button>
          );
        })}
      </div>

      {/* Ordinal meter — fills toward the chosen level. */}
      <div className="scale-meter" aria-hidden>
        <div className="scale-meter__fill" style={{ width: `${fillPct}%` }} />
        <div className="scale-meter__ticks">
          {options.map((opt, i) => (
            <span
              key={opt}
              className={cn(
                "scale-meter__tick",
                selectedIdx >= 0 && i <= selectedIdx && "is-on",
                i === selectedIdx && "is-cursor"
              )}
            />
          ))}
        </div>
      </div>
    </fieldset>
  );
}
