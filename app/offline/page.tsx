export default function OfflinePage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 text-center wine-vignette">
      <p className="smallcaps text-xs text-gold mb-3">нет связи</p>
      <h1 className="font-display italic text-4xl sm:text-5xl leading-[0.95] mb-4">
        Бокал на паузе
      </h1>
      <p className="text-muted italic max-w-md leading-relaxed">
        Сейчас нет подключения к интернету. Оценки и вечера появятся, как только
        связь вернётся — приложение уже загружено и ждёт.
      </p>
    </div>
  );
}
