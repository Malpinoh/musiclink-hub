import { Skeleton } from "@/components/ui/skeleton";

const AnalyticsSkeleton = () => (
  <div className="min-h-screen bg-background">
    <div className="h-16" />

    <main className="pt-24 pb-12 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Back & Header */}
        <div className="mb-8">
          <Skeleton className="h-9 w-40 mb-4" />
          <div className="flex items-center gap-4">
            <Skeleton className="w-20 h-20 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card p-6">
              <Skeleton className="h-4 w-20 mb-3" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>

        {/* Chart Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="glass-card p-6">
            <Skeleton className="h-5 w-32 mb-4" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
          <div className="glass-card p-6">
            <Skeleton className="h-5 w-32 mb-4" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </div>

        {/* Table */}
        <div className="glass-card p-6">
          <Skeleton className="h-5 w-40 mb-4" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  </div>
);

export default AnalyticsSkeleton;
