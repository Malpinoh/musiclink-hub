import { Skeleton } from "@/components/ui/skeleton";

const StatCardSkeleton = () => (
  <div className="glass-card p-6">
    <div className="flex items-center gap-3 mb-3">
      <Skeleton className="w-10 h-10 rounded-lg" />
      <Skeleton className="h-4 w-24" />
    </div>
    <Skeleton className="h-8 w-16 mb-1" />
    <Skeleton className="h-3 w-32" />
  </div>
);

const ListItemSkeleton = () => (
  <div className="glass-card p-4 flex items-center gap-4">
    <Skeleton className="w-14 h-14 rounded-xl flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-3 w-24" />
    </div>
    <div className="hidden md:flex items-center gap-2">
      <Skeleton className="h-4 w-16" />
    </div>
    <div className="flex items-center gap-1">
      <Skeleton className="w-9 h-9 rounded-lg" />
      <Skeleton className="w-9 h-9 rounded-lg" />
      <Skeleton className="w-9 h-9 rounded-lg" />
    </div>
  </div>
);

const DashboardSkeleton = () => (
  <div className="min-h-screen bg-background">
    {/* Header placeholder */}
    <div className="h-16" />

    <main className="pt-24 pb-12 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-36 rounded-xl" />
            <Skeleton className="h-10 w-36 rounded-xl" />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        {/* Tabs */}
        <Skeleton className="h-10 w-64 rounded-lg mb-6" />

        {/* List Items */}
        <div className="space-y-4">
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
        </div>
      </div>
    </main>
  </div>
);

export default DashboardSkeleton;
