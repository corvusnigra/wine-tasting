export const INTENSITY_5 = ["pale", "medium-minus", "medium", "medium-plus", "pronounced"] as const;
export type Intensity5 = (typeof INTENSITY_5)[number];

export const SWEETNESS = [
  "dry",
  "off-dry",
  "medium-dry",
  "medium-sweet",
  "sweet",
  "luscious",
] as const;
export type Sweetness = (typeof SWEETNESS)[number];

export const LEVEL_5 = ["low", "medium-minus", "medium", "medium-plus", "high"] as const;
export type Level5 = (typeof LEVEL_5)[number];

export const BODY = ["light", "medium-minus", "medium", "medium-plus", "full"] as const;
export type Body = (typeof BODY)[number];

export const FINISH = ["short", "medium-minus", "medium", "medium-plus", "long"] as const;
export type Finish = (typeof FINISH)[number];

export const QUALITY = [
  "faulty",
  "poor",
  "acceptable",
  "good",
  "very-good",
  "outstanding",
] as const;
export type Quality = (typeof QUALITY)[number];

export const READINESS = ["too-young", "drink-now", "potential", "too-old"] as const;
export type Readiness = (typeof READINESS)[number];

export type WineType = "red" | "white" | "rose" | "sparkling";

export const COLORS_BY_TYPE: Record<WineType, readonly string[]> = {
  red: ["purple", "ruby", "garnet", "tawny"],
  white: ["lemon-green", "lemon", "gold", "amber"],
  rose: ["pink", "salmon", "orange"],
  sparkling: ["lemon-green", "lemon", "gold", "pink", "salmon"],
};
