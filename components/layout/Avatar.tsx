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
}: {
  name: string | null;
  role?: string;
  subtitle?: string;
  done?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 min-w-[3.5rem]">
      <span className="avatar-initial relative">
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
