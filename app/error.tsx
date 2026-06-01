"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 text-center wine-vignette">
      <p className="smallcaps text-xs text-gold mb-3">осечка</p>
      <h1 className="font-display italic text-4xl sm:text-5xl leading-[0.95] mb-4">
        Бутылка не открылась
      </h1>
      <p className="text-muted italic max-w-md mb-8 leading-relaxed">
        Что-то пошло не так на нашей стороне. Попробуйте ещё раз — обычно
        помогает.
      </p>
      <button
        onClick={reset}
        className="btn-seal h-12 px-8 rounded-full inline-flex items-center"
      >
        Попробовать снова
      </button>
    </div>
  );
}
