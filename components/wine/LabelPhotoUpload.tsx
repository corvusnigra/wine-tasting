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
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Фото слишком большое — выберите поменьше");
      return;
    }
    setUploading(true);
    // Phone cameras shoot multi-MB photos; we only ever show a thumbnail. Shrink
    // to ~1280px / JPEG before upload so guests don't push megabytes over the
    // flaky link. Falls back to the original if the browser can't decode it.
    const upload = (await downscaleImage(file)) ?? file;
    const ext = upload === file ? file.name.split(".").pop() || "jpg" : "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("wine-labels")
      .upload(path, upload, {
        cacheControl: "31536000",
        upsert: false,
        contentType: upload.type || "image/jpeg",
      });
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

/**
 * Resize an image File to fit within MAX_DIM and re-encode as JPEG. Returns null
 * on any failure (caller falls back to the original file).
 */
async function downscaleImage(file: File): Promise<File | null> {
  const MAX_DIM = 1280;
  const QUALITY = 0.8;
  if (typeof document === "undefined" || !file.type.startsWith("image/")) {
    return null;
  }
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, MAX_DIM / Math.max(width, height));
    if (scale >= 1 && file.size < 600 * 1024) {
      bitmap.close();
      return null; // already small enough — keep original
    }
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return null;
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY)
    );
    if (!blob) return null;
    return new File([blob], "label.jpg", { type: "image/jpeg" });
  } catch {
    return null;
  }
}
