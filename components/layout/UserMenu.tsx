"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

function initials(name: string | null | undefined): string {
  if (!name) return "·";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

type Props = {
  displayName: string | null;
  email: string | null;
};

export function UserMenu({ displayName, email }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="avatar-initial w-8 h-8 text-[0.85rem] hover:scale-105 transition-transform"
        title={displayName ?? "Профиль"}
      >
        {initials(displayName)}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 min-w-[14rem] bg-surface border border-border rounded-2xl shadow-2xl p-2 z-30"
        >
          <div className="px-3 py-2 border-b border-border mb-1">
            <p className="font-display italic text-base truncate">
              {displayName ?? "Гость"}
            </p>
            {email && (
              <p className="text-xs text-muted truncate font-mono">{email}</p>
            )}
          </div>
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 rounded-xl smallcaps text-xs text-foreground hover:bg-bordeaux/10 transition-colors"
          >
            Профиль
          </Link>
          <form action="/api/auth/signout" method="post" className="contents">
            <button
              type="submit"
              role="menuitem"
              className="w-full text-left px-3 py-2 rounded-xl smallcaps text-xs text-foreground hover:bg-bordeaux/10 transition-colors"
            >
              Выйти
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
