"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

export function EditableTitle({
  sessionId,
  initialTitle,
  canEdit,
}: {
  sessionId: string;
  initialTitle: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [saving, setSaving] = useState(false);

  async function save() {
    const next = title.trim();
    if (!next || next === initialTitle) {
      setEditing(false);
      setTitle(initialTitle);
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: next }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      toast.error(body?.error ?? "Не удалось переименовать");
      setTitle(initialTitle);
      setEditing(false);
      return;
    }
    toast.success("Название обновлено");
    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={title}
        maxLength={120}
        disabled={saving}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") {
            setTitle(initialTitle);
            setEditing(false);
          }
        }}
        className="input-underline font-display italic text-4xl sm:text-5xl md:text-6xl leading-[0.95] w-full"
      />
    );
  }

  return (
    <h1 className="font-display italic text-4xl sm:text-5xl md:text-6xl leading-[0.95] break-words inline-flex items-start gap-3">
      <span>{initialTitle}</span>
      {canEdit && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Переименовать"
          className="shrink-0 mt-2 text-muted hover:text-gold transition-colors"
        >
          <Pencil size={18} />
        </button>
      )}
    </h1>
  );
}
