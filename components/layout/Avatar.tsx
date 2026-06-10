function initials(name: string | null | undefined): string {
  if (!name) return "·";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function Avatar({
  name,
  role,
  subtitle,
  done,
  progress,
}: {
  name: string | null;
  role?: string;
  subtitle?: string;
  done?: boolean;
  /** 0..1 — gold ring fills clockwise as the guest works through the flight */
  progress?: number;
}) {
  // r=21 → circumference ≈ 131.9; dasharray carves the filled arc.
  const CIRC = 2 * Math.PI * 21;
  const clamped =
    progress === undefined ? null : Math.max(0, Math.min(1, progress));
  return (
    <div className="flex flex-col items-center gap-1.5 min-w-[3.5rem]">
      <span className="avatar-initial relative">
        {clamped !== null && (
          <svg
            width="46"
            height="46"
            viewBox="0 0 46 46"
            className="absolute -inset-[5px] pointer-events-none"
            aria-hidden
          >
            <circle
              cx="23"
              cy="23"
              r="21"
              fill="none"
              stroke="var(--border)"
              strokeWidth="2"
            />
            <circle
              cx="23"
              cy="23"
              r="21"
              fill="none"
              stroke="var(--color-gold)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={`${CIRC * clamped} ${CIRC}`}
              transform="rotate(-90 23 23)"
              style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.16,1,0.3,1)" }}
            />
          </svg>
        )}
        {initials(name)}
        {role === "owner" && (
          <span
            className="absolute -top-1 -right-1 text-gold text-[10px] leading-none"
            aria-label="хозяин"
          >
            ★
          </span>
        )}
        {done && (
          <span
            className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-gold text-bordeaux-dark text-[8px] leading-none inline-flex items-center justify-center ring-2 ring-background"
            aria-label="закончил"
          >
            ✓
          </span>
        )}
      </span>
      <span className="text-[11px] text-foreground text-center truncate max-w-[5rem]">
        {name ?? "—"}
      </span>
      {subtitle && (
        <span className="smallcaps text-[9px] text-muted leading-none">{subtitle}</span>
      )}
    </div>
  );
}
