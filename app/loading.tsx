export default function Loading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-16">
      <div className="flex items-center gap-3 text-muted">
        <span className="inline-block w-2 h-2 rounded-full bg-gold animate-[fade-in_0.6s_ease-in-out_infinite_alternate]" />
        <span className="smallcaps text-xs">наполняем бокал…</span>
      </div>
    </div>
  );
}
