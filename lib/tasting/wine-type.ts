export type WineType = "red" | "white" | "rose" | "sparkling";

export const WINE_TYPE_RU: Record<string, string> = {
  red: "красное",
  white: "белое",
  rose: "розовое",
  sparkling: "игристое",
};

export function wineTypeRu(type: string | null | undefined): string | null {
  if (!type) return null;
  return WINE_TYPE_RU[type] ?? null;
}

// Glanceable colour cue per wine type — warm, on-palette.
export const WINE_TYPE_COLOR: Record<string, string> = {
  red: "#7b1a3a", // bordeaux-light
  white: "#e0bd6a", // gold-light
  rose: "#d98a8a", // dusty rose
  sparkling: "#f2e3b0", // pale champagne
};

export function wineTypeColor(type: string | null | undefined): string {
  if (!type) return "var(--border-strong)";
  return WINE_TYPE_COLOR[type] ?? "var(--border-strong)";
}
