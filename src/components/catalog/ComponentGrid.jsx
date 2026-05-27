import { useState } from 'react';
import ComponentCard from './ComponentCard';
import ComponentDetailModal from './ComponentDetailModal';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/common/EmptyState';
import { PackageSearch, FilterX } from 'lucide-react';
import { Button } from '@/components/ui/button';

function CardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <Skeleton className="aspect-[4/3] w-full" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-1">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-3 w-24" />
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}

export default function ComponentGrid({ components, isLoading, hasFilters, onClearFilters }) {
  const [selected, setSelected] = useState(null);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    );
  }

  if (!components?.length) {
    return (
      <EmptyState
        icon={hasFilters ? FilterX : PackageSearch}
        title={hasFilters ? 'No components match your filters' : 'No components found'}
        description={
          hasFilters
            ? 'Try adjusting or clearing your filters to see more results.'
            : 'No components have been added to the catalog yet.'
        }
        action={
          hasFilters && (
            <Button variant="outline" size="sm" onClick={onClearFilters}>
              Clear Filters
            </Button>
          )
        }
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {components.map(component => (
          <ComponentCard
            key={component.id}
            component={component}
            onViewDetail={setSelected}
          />
        ))}
      </div>

      <ComponentDetailModal
        component={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
