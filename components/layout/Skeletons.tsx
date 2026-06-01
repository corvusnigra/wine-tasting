export function Bar({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

/** Hero + list skeleton shared by the group / archive / session pages. */
export function PageListSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 lg:px-12 py-10 sm:py-16 w-full">
      <Bar className="h-3 w-28 mb-4 rounded-full" />
      <Bar className="h-12 w-2/3 mb-3 rounded-xl" />
      <Bar className="h-4 w-40 mb-12 rounded-full" />
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-4 py-2">
            <Bar className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1">
              <Bar className="h-5 w-1/2 mb-2 rounded-md" />
              <Bar className="h-3 w-2/3 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
