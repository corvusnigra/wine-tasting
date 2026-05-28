"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ScaleSlider } from "./ScaleSlider";
import { DescriptorPicker } from "./DescriptorPicker";
import {
  BODY,
  FINISH,
  INTENSITY_5,
  LEVEL_5,
  QUALITY,
  READINESS,
  SWEETNESS,
  type Body,
  type Finish,
  type Intensity5,
  type Level5,
  type Quality,
  type Readiness,
  type Sweetness,
  type WineType,
} from "@/lib/tasting/sat-vocabulary";
import { normalizeScore, type Scale } from "@/lib/tasting/scales";

type DraftNote = {
  appearance: { intensity?: Intensity5; color?: string };
  nose: { intensity?: Intensity5; descriptors: string[] };
  palate: {
    sweetness?: Sweetness;
    acidity?: Level5;
    tannin?: Level5;
    body?: Body;
    finish?: Finish;
  };
  conclusion: { quality?: Quality; readiness?: Readiness; free_text?: string };
  overall_scale_raw: { scale: Scale; value: number } | null;
};

const EMPTY_DRAFT: DraftNote = {
  appearance: {},
  nose: { descriptors: [] },
  palate: {},
  conclusion: {},
  overall_scale_raw: null,
};

const STEP_KEYS = ["appearance", "nose", "palate", "conclusion"] as const;
type StepKey = (typeof STEP_KEYS)[number];
const STEP_ROMAN: Record<StepKey, string> = {
  appearance: "i",
  nose: "ii",
  palate: "iii",
  conclusion: "iv",
};
const STEP_HINT: Record<StepKey, string> = {
  appearance: "Цвет и его интенсивность — что видно в бокале",
  nose: "Сила и характер аромата — что улавливает нос",
  palate: "Сладость, кислота, танины, тельность и послевкусие",
  conclusion: "Общее впечатление и итоговая оценка",
};

export function SatCard({
  wineInSessionId,
  wineType,
  wineName,
  wineVintage,
  wineProducer,
  wineRegion,
  initial,
  initialScale,
  backHref,
}: {
  wineInSessionId: string;
  wineType: WineType;
  wineName: string;
  wineVintage: number | null;
  wineProducer: string | null;
  wineRegion: string | null;
  initial: DraftNote | null;
  initialScale: Scale;
  backHref: string;
}) {
  const t = useTranslations("sat");
  const tStep = useTranslations("sat.step");
  const tIntensity = useTranslations("sat.intensity");
  const tLevel = useTranslations("sat.level");
  const tSweet = useTranslations("sat.sweetness");
  const tBody = useTranslations("sat.body");
  const tFinish = useTranslations("sat.finish");
  const tQuality = useTranslations("sat.quality");
  const tReadiness = useTranslations("sat.readiness");
  const router = useRouter();
  const supabase = useRef(createSupabaseBrowserClient()).current;

  const [step, setStep] = useState<StepKey>("appearance");
  const [draft, setDraft] = useState<DraftNote>(initial ?? EMPTY_DRAFT);
  const [scale, setScale] = useState<Scale>(initialScale);
  const [submitting, setSubmitting] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void save(false), 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  async function save(submit: boolean) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const overall_score = draft.overall_scale_raw
      ? normalizeScore(draft.overall_scale_raw)
      : null;
    const payload = {
      wine_in_session_id: wineInSessionId,
      user_id: userData.user.id,
      appearance: draft.appearance,
      nose: draft.nose,
      palate: draft.palate,
      conclusion: draft.conclusion,
      overall_score,
      overall_scale_raw: draft.overall_scale_raw,
      ...(submit ? { submitted_at: new Date().toISOString() } : {}),
    };
    const { error } = await supabase
      .from("tasting_notes")
      .upsert(payload, { onConflict: "wine_in_session_id,user_id" });
    if (error && submit) {
      toast.error(error.message);
      throw error;
    }
  }

  async function onSubmit() {
    setSubmitting(true);
    try {
      await save(true);
      toast.success("Оценка сохранена");
      router.push(backHref);
      router.refresh();
    } catch {
      // toast already shown
    } finally {
      setSubmitting(false);
    }
  }

  const stepIdx = STEP_KEYS.indexOf(step);
  const nextStepKey = STEP_KEYS[stepIdx + 1];
  function go(direction: 1 | -1) {
    const next = STEP_KEYS[stepIdx + direction];
    if (next) {
      setStep(next);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }

  function gotoStep(s: StepKey) {
    setStep(s);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-8 lg:px-12 pt-6 pb-28 w-full flex flex-col gap-7 min-h-[calc(100dvh-5rem)]">
      {/* Wine epigraph — integrated identity */}
      <div className="anim-fade-in">
        <p className="font-display italic text-lg sm:text-xl text-foreground/85 leading-tight">
          {wineName}
          {wineVintage && (
            <span className="text-gold ml-2">{wineVintage}</span>
          )}
        </p>
        <p className="text-[11px] text-muted italic mt-0.5">
          {[wineProducer, wineRegion]
            .filter(Boolean)
            .join(" · ") || "—"}
        </p>
      </div>

      {/* Stepper */}
      <header className="anim-fade-up stagger-1">
        <p className="smallcaps text-[10px] text-muted mb-2">
          Шаг {stepIdx + 1} из {STEP_KEYS.length}
        </p>
        <nav className="grid grid-cols-4 gap-1.5 mb-4" aria-label="шаги">
          {STEP_KEYS.map((s, i) => {
            const isCurrent = s === step;
            const isPast = i < stepIdx;
            return (
              <button
                key={s}
                type="button"
                onClick={() => gotoStep(s)}
                aria-current={isCurrent ? "step" : undefined}
                className={`flex flex-col items-center gap-1.5 py-2 rounded-2xl transition-colors ${
                  isCurrent ? "bg-bordeaux/10" : "hover:bg-bordeaux/5"
                }`}
              >
                <span
                  className={`w-8 h-8 rounded-full inline-flex items-center justify-center text-sm font-display italic transition-all ${
                    isCurrent
                      ? "bg-bordeaux text-cream shadow-[0_0_0_2px_var(--color-gold-soft)]"
                      : isPast
                        ? "bg-gold/15 text-gold border border-gold/30"
                        : "bg-surface text-muted border border-border"
                  }`}
                >
                  {isPast ? "✓" : STEP_ROMAN[s]}
                </span>
                <span
                  className={`smallcaps text-[9px] sm:text-[10px] truncate max-w-full px-1 ${
                    isCurrent ? "text-foreground" : "text-muted"
                  }`}
                >
                  {tStep(s)}
                </span>
              </button>
            );
          })}
        </nav>
        <div className="h-px bg-border relative">
          <div
            className="absolute left-0 top-0 h-px bg-gold transition-all"
            style={{ width: `${((stepIdx + 1) / STEP_KEYS.length) * 100}%` }}
          />
        </div>
      </header>

      {/* Step body */}
      <div className="flex-1">
        {step === "appearance" && (
          <section className="flex flex-col gap-7">
            <div>
              <h2 className="font-display italic text-3xl sm:text-4xl">{tStep("appearance")}</h2>
              <p className="text-sm text-muted italic mt-1">{STEP_HINT.appearance}</p>
            </div>
            <ScaleSlider
              label="Интенсивность цвета"
              options={INTENSITY_5}
              optionLabels={Object.fromEntries(
                INTENSITY_5.map((k) => [k, tIntensity(k)])
              ) as Record<Intensity5, string>}
              value={draft.appearance.intensity}
              onChange={(v) =>
                setDraft({ ...draft, appearance: { ...draft.appearance, intensity: v } })
              }
            />
            <div>
              <label className="smallcaps text-[10px] text-muted block mb-2">
                Оттенок своими словами
              </label>
              <input
                type="text"
                value={draft.appearance.color ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    appearance: { ...draft.appearance, color: e.target.value },
                  })
                }
                maxLength={40}
                placeholder="рубиновый, лимонно-зелёный, медный …"
                className="input-underline text-xl"
              />
            </div>
          </section>
        )}

        {step === "nose" && (
          <section className="flex flex-col gap-7">
            <div>
              <h2 className="font-display italic text-3xl sm:text-4xl">{tStep("nose")}</h2>
              <p className="text-sm text-muted italic mt-1">{STEP_HINT.nose}</p>
            </div>
            <ScaleSlider
              label="Интенсивность аромата"
              options={INTENSITY_5}
              optionLabels={Object.fromEntries(
                INTENSITY_5.map((k) => [k, tIntensity(k)])
              ) as Record<Intensity5, string>}
              value={draft.nose.intensity}
              onChange={(v) =>
                setDraft({ ...draft, nose: { ...draft.nose, intensity: v } })
              }
            />
            <DescriptorPicker
              selected={draft.nose.descriptors}
              onChange={(next) =>
                setDraft({ ...draft, nose: { ...draft.nose, descriptors: next } })
              }
            />
          </section>
        )}

        {step === "palate" && (
          <section className="flex flex-col gap-7">
            <div>
              <h2 className="font-display italic text-3xl sm:text-4xl">{tStep("palate")}</h2>
              <p className="text-sm text-muted italic mt-1">{STEP_HINT.palate}</p>
            </div>
            <ScaleSlider
              label="Сладость"
              options={SWEETNESS}
              optionLabels={Object.fromEntries(
                SWEETNESS.map((k) => [k, tSweet(k)])
              ) as Record<Sweetness, string>}
              value={draft.palate.sweetness}
              onChange={(v) =>
                setDraft({ ...draft, palate: { ...draft.palate, sweetness: v } })
              }
            />
            <ScaleSlider
              label="Кислотность"
              options={LEVEL_5}
              optionLabels={Object.fromEntries(
                LEVEL_5.map((k) => [k, tLevel(k)])
              ) as Record<Level5, string>}
              value={draft.palate.acidity}
              onChange={(v) =>
                setDraft({ ...draft, palate: { ...draft.palate, acidity: v } })
              }
            />
            {wineType === "red" && (
              <ScaleSlider
                label="Танины"
                options={LEVEL_5}
                optionLabels={Object.fromEntries(
                  LEVEL_5.map((k) => [k, tLevel(k)])
                ) as Record<Level5, string>}
                value={draft.palate.tannin}
                onChange={(v) =>
                  setDraft({ ...draft, palate: { ...draft.palate, tannin: v } })
                }
              />
            )}
            <ScaleSlider
              label="Тельность"
              options={BODY}
              optionLabels={Object.fromEntries(
                BODY.map((k) => [k, tBody(k)])
              ) as Record<Body, string>}
              value={draft.palate.body}
              onChange={(v) => setDraft({ ...draft, palate: { ...draft.palate, body: v } })}
            />
            <ScaleSlider
              label="Послевкусие"
              options={FINISH}
              optionLabels={Object.fromEntries(
                FINISH.map((k) => [k, tFinish(k)])
              ) as Record<Finish, string>}
              value={draft.palate.finish}
              onChange={(v) =>
                setDraft({ ...draft, palate: { ...draft.palate, finish: v } })
              }
            />
          </section>
        )}

        {step === "conclusion" && (
          <section className="flex flex-col gap-7">
            <div>
              <h2 className="font-display italic text-3xl sm:text-4xl">{tStep("conclusion")}</h2>
              <p className="text-sm text-muted italic mt-1">{STEP_HINT.conclusion}</p>
            </div>
            <ScaleSlider
              label="Качество"
              options={QUALITY}
              optionLabels={Object.fromEntries(
                QUALITY.map((k) => [k, tQuality(k)])
              ) as Record<Quality, string>}
              value={draft.conclusion.quality}
              onChange={(v) =>
                setDraft({ ...draft, conclusion: { ...draft.conclusion, quality: v } })
              }
            />
            <ScaleSlider
              label="Готовность пить"
              options={READINESS}
              optionLabels={Object.fromEntries(
                READINESS.map((k) => [k, tReadiness(k)])
              ) as Record<Readiness, string>}
              value={draft.conclusion.readiness}
              onChange={(v) =>
                setDraft({ ...draft, conclusion: { ...draft.conclusion, readiness: v } })
              }
            />
            <div>
              <label className="smallcaps text-[10px] text-muted block mb-2">
                {t("freeTextLabel")}
              </label>
              <textarea
                maxLength={500}
                rows={3}
                value={draft.conclusion.free_text ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    conclusion: { ...draft.conclusion, free_text: e.target.value },
                  })
                }
                placeholder={t("freeTextPlaceholder")}
                className="w-full bg-transparent border-0 border-b border-border-strong focus:border-gold focus:outline-none transition-colors py-2 font-display italic text-lg resize-none placeholder:text-muted/60"
              />
            </div>
            <ScalePicker
              label={t("scaleLabel")}
              scale={scale}
              value={draft.overall_scale_raw?.value ?? null}
              onChange={(value) => {
                setDraft({
                  ...draft,
                  overall_scale_raw: value == null ? null : { scale, value },
                });
              }}
              onScaleSwitch={(next) => {
                setScale(next);
                if (draft.overall_scale_raw) {
                  setDraft({
                    ...draft,
                    overall_scale_raw: { scale: next, value: draft.overall_scale_raw.value },
                  });
                }
              }}
            />
          </section>
        )}
      </div>

      <footer className="fixed bottom-0 inset-x-0 z-40 px-5 sm:px-8 lg:px-12 pt-3 pb-safe bg-background/90 backdrop-blur-md border-t border-border">
        <div className="max-w-2xl mx-auto flex gap-3">
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={stepIdx === 0}
            className="btn-ghost h-13 min-h-[3rem] px-5 rounded-full smallcaps text-xs disabled:opacity-30"
          >
            {t("back")}
          </button>
          {step === "conclusion" ? (
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting}
              className="btn-seal flex-1 h-13 min-h-[3rem] rounded-full inline-flex items-center justify-center gap-2"
            >
                            <span>Сохранить оценку</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => go(1)}
              className="btn-seal flex-1 h-13 min-h-[3rem] rounded-full inline-flex items-center justify-center gap-2"
            >
              <span>Дальше</span>
              {nextStepKey && (
                <span className="font-display italic text-gold-light/90">
                  → {tStep(nextStepKey)}
                </span>
              )}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

function StarMark({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="36"
      height="36"
      fill={filled ? "var(--color-gold)" : "none"}
      stroke={filled ? "var(--color-gold)" : "var(--color-gold-soft)"}
      strokeWidth={filled ? 1 : 1.4}
      strokeLinejoin="round"
      className="transition-all duration-200"
    >
      <path d="M12 2.6 L14.5 9 L21.3 9.5 L16 14.05 L17.7 20.8 L12 17 L6.3 20.8 L8 14.05 L2.7 9.5 L9.5 9 Z" />
    </svg>
  );
}

function ScalePicker({
  label,
  scale,
  value,
  onChange,
  onScaleSwitch,
}: {
  label: string;
  scale: Scale;
  value: number | null;
  onChange: (v: number | null) => void;
  onScaleSwitch: (next: Scale) => void;
}) {
  return (
    <div className="card-edge rounded-2xl p-5 sm:p-6">
      <div className="flex items-baseline justify-between mb-5">
        <span className="smallcaps text-[11px] text-foreground">{label}</span>
        <div className="flex gap-1 text-[10px]">
          <button
            type="button"
            onClick={() => onScaleSwitch("5stars")}
            aria-pressed={scale === "5stars"}
            className={`px-3 py-1 rounded-full transition-colors smallcaps ${
              scale === "5stars"
                ? "bg-bordeaux text-cream"
                : "bg-background text-muted border border-border hover:border-gold"
            }`}
          >
            звёзды
          </button>
          <button
            type="button"
            onClick={() => onScaleSwitch("20pt")}
            aria-pressed={scale === "20pt"}
            className={`px-3 py-1 rounded-full transition-colors smallcaps ${
              scale === "20pt"
                ? "bg-bordeaux text-cream"
                : "bg-background text-muted border border-border hover:border-gold"
            }`}
          >
            12-20 pt
          </button>
        </div>
      </div>
      {scale === "5stars" ? (
        <div>
          <div className="flex justify-center gap-2 sm:gap-3 mb-3">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onChange(value === v ? null : v)}
                className="w-12 h-12 flex items-center justify-center transition-transform active:scale-90"
                aria-label={`${v} звёзд из 5`}
                aria-pressed={value === v}
              >
                <StarMark filled={!!value && v <= value} />
              </button>
            ))}
          </div>
          <div className="text-center font-display italic text-base text-gold min-h-[1.5em]">
            {value === null ? "коснитесь звезды" : starLabel(value)}
          </div>
        </div>
      ) : (
        <div>
          <div className="text-center mb-4">
            <div className="font-display italic text-5xl text-gold leading-none">
              {value ?? "—"}
            </div>
            <div className="smallcaps text-[10px] text-muted mt-1">
              {value === null
                ? "потяните ползунок"
                : robinsonLabel(value)}
            </div>
          </div>
          <input
            type="range"
            min={12}
            max={20}
            step={0.5}
            value={value ?? 16}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-2 accent-bordeaux cursor-pointer"
            aria-label={label}
          />
          <div className="flex items-center justify-between text-[10px] text-muted italic mt-1.5 px-0.5">
            <span>12 · с дефектом</span>
            <span>20 · выдающееся</span>
          </div>
        </div>
      )}
    </div>
  );
}

function starLabel(v: number): string {
  switch (v) {
    case 1: return "слабо — не моё";
    case 2: return "так себе";
    case 3: return "нормально";
    case 4: return "хорошо — куплю ещё";
    case 5: return "великолепно";
    default: return "";
  }
}

function robinsonLabel(v: number): string {
  if (v < 14) return "слабое";
  if (v < 15.5) return "приемлемое";
  if (v < 17) return "хорошее";
  if (v < 18.5) return "очень хорошее";
  return "выдающееся";
}
