"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
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
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="avatar-initial w-8 h-8 text-[0.85rem] hover:scale-105 transition-transform data-[state=open]:scale-105 outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          title={displayName ?? "Профиль"}
          aria-label="Меню профиля"
        >
          {initials(displayName)}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          collisionPadding={8}
          className="min-w-[14rem] bg-surface border border-border rounded-2xl shadow-2xl p-2 z-50 data-[state=open]:animate-[fade-up_0.2s_ease-out] origin-top-right"
        >
          <div className="px-3 py-2 border-b border-border mb-1">
            <p className="font-display italic text-base truncate">
              {displayName ?? "Гость"}
            </p>
            {email && (
              <p className="text-xs text-muted truncate font-mono">{email}</p>
            )}
          </div>
          <DropdownMenu.Item asChild>
            <Link
              href="/profile"
              className="block px-3 py-2 rounded-xl smallcaps text-xs text-foreground hover:bg-bordeaux/10 data-[highlighted]:bg-bordeaux/10 outline-none cursor-pointer transition-colors"
            >
              Профиль
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="w-full text-left px-3 py-2 rounded-xl smallcaps text-xs text-foreground hover:bg-bordeaux/10 data-[highlighted]:bg-bordeaux/10 outline-none cursor-pointer transition-colors"
              >
                Выйти
              </button>
            </form>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
