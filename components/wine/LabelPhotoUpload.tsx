"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { useSupabaseBrowser } from "@/lib/supabase/use-browser";

export function LabelPhotoUpload({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const supabase = useSupabaseBrowser();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Фото больше 8 МБ — выберите поменьше");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("wine-labels")
      .upload(path, file, { cacheControl: "31536000", upsert: false });
    if (error) {
      setUploading(false);
      toast.error(error.message);
      return;
    }
    const { data } = supabase.storage.from("wine-labels").getPublicUrl(path);
    setUploading(false);
    onChange(data.publicUrl);
  }

  return (
    <div className="flex items-center gap-4">
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt="Этикетка"
          className="w-16 h-16 rounded-xl object-cover border border-gold/40 shrink-0"
        />
      ) : (
        <div className="w-16 h-16 rounded-xl border border-dashed border-border flex items-center justify-center text-2xl text-muted shrink-0">
          ◷
        </div>
      )}
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="smallcaps text-[11px] text-gold hover:text-gold-light transition-colors text-left disabled:opacity-50"
        >
          {uploading ? "загрузка…" : value ? "заменить фото" : "снять / выбрать фото"}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="smallcaps text-[10px] text-muted hover:text-rust transition-colors text-left"
          >
            убрать
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onPick}
        className="hidden"
      />
    </div>
  );
}
