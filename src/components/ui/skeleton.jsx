import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn('rounded-md skeleton-animate', className)}
      {...props}
    />
  );
}

export { Skeleton };
