export type Scale = "5stars" | "20pt";

export type ScoreInput = {
  scale: Scale;
  value: number;
};

const STARS_MIN = 0;
const STARS_MAX = 5;
const ROBINSON_MIN = 12;
const ROBINSON_MAX = 20;

export function normalizeScore(input: ScoreInput): number {
  switch (input.scale) {
    case "5stars": {
      const clamped = clamp(input.value, STARS_MIN, STARS_MAX);
      return round2((clamped / STARS_MAX) * 100);
    }
    case "20pt": {
      const clamped = clamp(input.value, ROBINSON_MIN, ROBINSON_MAX);
      return round2(((clamped - ROBINSON_MIN) / (ROBINSON_MAX - ROBINSON_MIN)) * 100);
    }
  }
}

export function denormalizeScore(score100: number, scale: Scale): number {
  const clamped = clamp(score100, 0, 100);
  switch (scale) {
    case "5stars":
      return round2((clamped / 100) * STARS_MAX);
    case "20pt":
      return round2(ROBINSON_MIN + (clamped / 100) * (ROBINSON_MAX - ROBINSON_MIN));
  }
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(Math.max(n, lo), hi);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
