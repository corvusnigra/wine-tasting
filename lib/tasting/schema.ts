import { z } from "zod";
import {
  BODY,
  FINISH,
  INTENSITY_5,
  LEVEL_5,
  QUALITY,
  READINESS,
  SWEETNESS,
} from "./sat-vocabulary";

export const AppearanceSchema = z.object({
  intensity: z.enum(INTENSITY_5).optional(),
  color: z.string().max(40).optional(),
  notes: z.string().max(300).optional(),
});

export const NoseSchema = z.object({
  intensity: z.enum(INTENSITY_5).optional(),
  descriptors: z.array(z.string()).max(20).default([]),
  notes: z.string().max(300).optional(),
});

export const PalateSchema = z.object({
  sweetness: z.enum(SWEETNESS).optional(),
  acidity: z.enum(LEVEL_5).optional(),
  tannin: z.enum(LEVEL_5).optional(),         // red only
  body: z.enum(BODY).optional(),
  finish: z.enum(FINISH).optional(),
  flavor_descriptors: z.array(z.string()).max(20).default([]),
  notes: z.string().max(300).optional(),
});

export const ConclusionSchema = z.object({
  quality: z.enum(QUALITY).optional(),
  readiness: z.enum(READINESS).optional(),
  free_text: z.string().max(500).optional(),
});

export const TastingNoteSchema = z.object({
  appearance: AppearanceSchema,
  nose: NoseSchema,
  palate: PalateSchema,
  conclusion: ConclusionSchema,
  overall_score: z.number().min(0).max(100).nullable().optional(),
  overall_scale_raw: z
    .object({
      scale: z.enum(["5stars", "20pt"]),
      value: z.number(),
    })
    .nullable()
    .optional(),
});

export type AppearanceData = z.infer<typeof AppearanceSchema>;
export type NoseData = z.infer<typeof NoseSchema>;
export type PalateData = z.infer<typeof PalateSchema>;
export type ConclusionData = z.infer<typeof ConclusionSchema>;
export type TastingNoteData = z.infer<typeof TastingNoteSchema>;
