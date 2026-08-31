// Shape-matched loading placeholders, built on daisyUI's `skeleton` utility
// (adds the shimmer/pulse styling). Swap in wherever `isLoading` currently
// renders a "Loading…" string, matching whatever it's replacing:
// card grid → CardGridSkeleton, table → TableSkeleton, simple row list →
// ListSkeleton.

export function CardGridSkeleton({
  count = 6,
  withImage = false,
}: {
  count?: number;
  withImage?: boolean;
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-base-100 border border-base-300 rounded-box overflow-hidden">
          {withImage && <div className="skeleton h-36 w-full rounded-none" />}
          <div className="p-4 space-y-2">
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-3 w-1/2" />
            <div className="skeleton h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return (
    <div className="overflow-x-auto bg-base-100 border border-base-300 rounded-box">
      <table className="table">
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: columns }).map((__, c) => (
                <td key={c}>
                  <div className="skeleton h-4 w-full max-w-32" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-base-100 border border-base-300 rounded-box p-4 flex items-center justify-between gap-4"
        >
          <div className="space-y-2 flex-1">
            <div className="skeleton h-4 w-1/3" />
            <div className="skeleton h-3 w-1/2" />
          </div>
          <div className="skeleton h-5 w-16 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}
