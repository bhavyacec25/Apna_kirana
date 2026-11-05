// Simple pulse skeletons for loading states, used instead of plain
// "Loading..." text across the app.

export function SkeletonCard() {
  return (
    <div className="card p-4 animate-pulse">
      <div className="w-full aspect-square rounded-xl bg-gray-200 mb-3" />
      <div className="h-3.5 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-1/2 mb-3" />
      <div className="flex items-center justify-between">
        <div className="h-4 bg-gray-200 rounded w-10" />
        <div className="h-7 bg-gray-200 rounded-lg w-16" />
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="card p-4 animate-pulse flex items-center gap-4">
      <div className="w-14 h-14 rounded-xl bg-gray-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-gray-200 rounded w-2/3" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="w-10 h-10 rounded-lg bg-gray-200 mb-3" />
      <div className="h-6 bg-gray-200 rounded w-1/2 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-2/3" />
    </div>
  );
}

export function SkeletonGrid({ count = 6, Component = SkeletonCard, className = "" }) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <Component key={i} />
      ))}
    </div>
  );
}
