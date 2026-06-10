export type WineType =
  | "red"
  | "white"
  | "rose"
  | "sparkling"
  | "fortified"
  | "orange";

export const WINE_TYPE_RU: Record<string, string> = {
  red: "красное",
  white: "белое",
  rose: "розовое",
  sparkling: "игристое",
  fortified: "креплёное",
  orange: "оранжевое",
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
  fortified: "#9a5b2e", // tawny / amber
  orange: "#d98a3a", // amber-orange
};

export function wineTypeColor(type: string | null | undefined): string {
  if (!type) return "var(--border-strong)";
  return WINE_TYPE_COLOR[type] ?? "var(--border-strong)";
}
