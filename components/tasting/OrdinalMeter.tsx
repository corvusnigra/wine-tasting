/**
 * Static, server-safe ordinal meter — the gold tick-scale used live on the
 * tasting card, echoed on the group-memory and reveal screens so every WSET
 * axis reads in the same visual language (low → high).
 */
export function OrdinalMeter({
  scale,
  value,
}: {
  scale: readonly string[];
  value: string | null | undefined;
}) {
  const idx = value ? scale.indexOf(value) : -1;
  const pct = idx < 0 || scale.length < 2 ? 0 : (idx / (scale.length - 1)) * 100;
  return (
    <div className="scale-meter" aria-hidden>
      <div className="scale-meter__fill" style={{ width: `${pct}%` }} />
      <div className="scale-meter__ticks">
        {scale.map((s, i) => (
          <span
            key={s}
            className={[
              "scale-meter__tick",
              idx >= 0 && i <= idx ? "is-on" : "",
              i === idx ? "is-cursor" : "",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}
