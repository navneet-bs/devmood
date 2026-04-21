export default function Skeleton({ className = '', rounded = 'rounded-md' }) {
  return <div className={`skeleton-shimmer ${rounded} ${className}`} />
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-44 w-full" rounded="rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Skeleton className="h-24" rounded="rounded-xl" />
        <Skeleton className="h-24" rounded="rounded-xl" />
        <Skeleton className="h-24" rounded="rounded-xl" />
        <Skeleton className="h-24" rounded="rounded-xl" />
      </div>
      <Skeleton className="h-48" rounded="rounded-2xl" />
      <Skeleton className="h-56" rounded="rounded-2xl" />
    </div>
  )
}

export function HistorySkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex gap-3">
        <Skeleton className="h-9 w-48" rounded="rounded-lg" />
        <Skeleton className="h-9 w-32" rounded="rounded-lg" />
      </div>
      <Skeleton className="h-72" rounded="rounded-2xl" />
      <Skeleton className="h-72" rounded="rounded-2xl" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20" rounded="rounded-xl" />
        ))}
      </div>
    </div>
  )
}
