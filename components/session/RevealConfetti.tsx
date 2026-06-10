"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

export function RevealConfetti({ delayMs = 0 }: { delayMs?: number }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const goldPalette = ["#C9A24C", "#d9b970", "#e0bd6a", "#9c7e3a"];
    let raf = 0;

    // Fire when the ceremony unveils the winner, not on page load.
    const timer = setTimeout(() => {
      const duration = 1400;
      const end = Date.now() + duration;
      (function frame() {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.5 },
          colors: goldPalette,
          scalar: 0.85,
          gravity: 0.7,
          ticks: 280,
          disableForReducedMotion: true,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.5 },
          colors: goldPalette,
          scalar: 0.85,
          gravity: 0.7,
          ticks: 280,
          disableForReducedMotion: true,
        });
        if (Date.now() < end) raf = requestAnimationFrame(frame);
      })();
    }, delayMs);

    // Clear the canvas-confetti surface on unmount so stray particles don't
    // linger over the next page during a client navigation.
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      confetti.reset();
    };
  }, [delayMs]);

  return null;
}
