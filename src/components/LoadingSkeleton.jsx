const pulse = 'animate-pulse rounded-lg bg-sand/70';

export default function LoadingSkeleton({ variant = 'card', count = 6, view = 'grid' }) {
  if (variant === 'stat') {
    return Array.from({ length: count }, (_, index) => (
      <div key={index} className="card p-5">
        <div className={`${pulse} mb-4 h-10 w-10`} />
        <div className={`${pulse} h-7 w-14`} />
        <div className={`${pulse} mt-2 h-4 w-24`} />
      </div>
    ));
  }

  if (view === 'list') {
    return (
      <div className="space-y-3" aria-busy="true">
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className="card flex items-center gap-4 p-3">
            <div className={`${pulse} h-20 w-20 shrink-0`} />
            <div className="flex-1 space-y-2">
              <div className={`${pulse} h-4 w-1/3`} />
              <div className={`${pulse} h-3 w-2/3`} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="card overflow-hidden">
          <div className="aspect-[4/5] animate-pulse bg-sand/70" />
          <div className="space-y-2 p-4">
            <div className={`${pulse} h-4 w-2/3`} />
            <div className={`${pulse} h-3 w-1/2`} />
            <div className={`${pulse} h-3 w-1/3`} />
          </div>
        </div>
      ))}
    </div>
  );
}
