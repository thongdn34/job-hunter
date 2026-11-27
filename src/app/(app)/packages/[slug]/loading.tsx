import { Skeleton } from "@/components/ui/skeleton";

/** Package page skeleton: toolbar, header and a few section placeholders. */
export default function PackageLoading() {
  return (
    <div className="flex" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading package…</span>
      <div className="min-w-0 flex-1">
        <div className="border-b px-4 py-2.5 sm:px-6">
          <Skeleton className="mx-auto h-9 max-w-4xl" />
        </div>
        <div className="mx-auto max-w-4xl space-y-10 px-4 pt-6 sm:px-6">
          <div className="space-y-3 border-b pb-6">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-2">
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-7 w-24" />
            </div>
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-7 w-2/3" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="hidden w-72 shrink-0 space-y-2 border-l px-3 py-4 xl:block">
        {Array.from({ length: 12 }, (_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
    </div>
  );
}
