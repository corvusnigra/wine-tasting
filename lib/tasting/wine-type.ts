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
