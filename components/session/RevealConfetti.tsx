"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

export function RevealConfetti() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Two soft gold bursts, asymmetric, gentle
    const duration = 1400;
    const end = Date.now() + duration;

    const goldPalette = ["#C9A24C", "#d9b970", "#e0bd6a", "#9c7e3a"];

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
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }, []);

  return null;
}
