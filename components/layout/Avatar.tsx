function initials(name: string | null | undefined): string {
  if (!name) return "·";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function Avatar({ name, role }: { name: string | null; role?: string }) {
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
      </span>
      <span className="text-[11px] text-muted text-center truncate max-w-[5rem]">
        {name ?? "—"}
      </span>
    </div>
  );
}
