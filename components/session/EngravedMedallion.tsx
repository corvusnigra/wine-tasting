"use client";

import { useEffect, useState } from "react";

/**
 * Winner medallion, engraved like a real medal: the evening's title and date
 * run around the rim on a circular text path, the score counts up from zero
 * once the reveal ceremony hands over the stage. Reduced motion (or a missing
 * score) renders the final state immediately.
 */
export function EngravedMedallion({
  score,
  engraving,
  delayMs = 0,
}: {
  score: number;
  engraving: string;
  delayMs?: number;
}) {
  const target = Math.round(score);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    let raf = 0;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      raf = requestAnimationFrame(() => setShown(target));
      return () => cancelAnimationFrame(raf);
    }
    const DURATION = 1100;
    let start: number | null = null;
    const tick = (now: number) => {
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / DURATION);
      // ease-out cubic — the last points land slowly, like a held breath
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    const timer = setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, delayMs);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [target, delayMs]);

  // Uppercase, dots between words read as engraving; keep it short enough
  // for the rim (the path simply clips overflow, no wrap).
  const rimText = engraving.toUpperCase();

  return (
    <svg
      width="128"
      height="128"
      viewBox="0 0 128 128"
      role="img"
      aria-label={`Оценка победителя: ${target} из 100`}
      className="mx-auto"
    >
      <defs>
        <path
          id="medal-rim"
          d="M 64,64 m -52,0 a 52,52 0 1,1 104,0 a 52,52 0 1,1 -104,0"
        />
      </defs>
      <circle
        cx="64"
        cy="64"
        r="62"
        fill="none"
        stroke="rgba(201,162,76,0.55)"
        strokeWidth="1"
      />
      <circle
        cx="64"
        cy="64"
        r="58"
        fill="none"
        stroke="rgba(201,162,76,0.22)"
        strokeWidth="0.75"
      />
      <circle
        cx="64"
        cy="64"
        r="40"
        fill="rgba(91,14,45,0.18)"
        stroke="rgba(201,162,76,0.6)"
        strokeWidth="1"
      />
      <text
        fontSize="7.5"
        letterSpacing="2.2"
        fill="rgba(201,162,76,0.75)"
        style={{ fontFamily: "var(--font-body)" }}
      >
        <textPath href="#medal-rim" startOffset="2%">
          {rimText}
        </textPath>
      </text>
      <text
        x="64"
        y="70"
        textAnchor="middle"
        fontSize="32"
        fontStyle="italic"
        fill="var(--color-gold)"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {shown}
      </text>
      <text
        x="64"
        y="86"
        textAnchor="middle"
        fontSize="7"
        letterSpacing="1.6"
        fill="rgba(201,162,76,0.7)"
        style={{ fontFamily: "var(--font-body)" }}
      >
        ИЗ 100
      </text>
    </svg>
  );
}
