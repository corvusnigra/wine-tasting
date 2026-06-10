import { wineTypeColor } from "@/lib/tasting/wine-type";

/**
 * "Looking down into the glass" — concentric rings in the wine's colour.
 * The signature replacement for the plain 8px type dot: the outer ring is the
 * deep core, inner rings lighten toward the rim the way wine pales at the
 * meniscus. Pure presentational SVG, colour derives from wine_type.
 */
export function WineDisc({
  type,
  size = 40,
  className,
}: {
  type: string | null | undefined;
  size?: number;
  className?: string;
}) {
  const base = wineTypeColor(type);
  // CSS-var fallback (unknown type) gets a flat neutral disc.
  const isVar = base.startsWith("var(");
  const mid = isVar ? base : `color-mix(in srgb, ${base} 72%, #f2e9d8)`;
  const rim = isVar ? base : `color-mix(in srgb, ${base} 45%, #f2e9d8)`;
  const r = size / 2;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      role="img"
      aria-hidden
    >
      <circle cx={r} cy={r} r={r - 1} fill={base} />
      <circle
        cx={r}
        cy={r}
        r={r - 1}
        fill="none"
        stroke="rgba(242,233,216,0.25)"
        strokeWidth="1"
      />
      <circle cx={r} cy={r} r={r * 0.62} fill={mid} opacity={0.85} />
      <circle cx={r} cy={r} r={r * 0.3} fill={rim} opacity={0.8} />
      {/* glint — candlelight on the surface */}
      <ellipse
        cx={r * 0.68}
        cy={r * 0.58}
        rx={r * 0.28}
        ry={r * 0.16}
        fill="rgba(242,233,216,0.28)"
      />
    </svg>
  );
}
