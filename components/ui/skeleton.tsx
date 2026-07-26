import { HTMLAttributes } from 'react';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {}

/**
 * Shimmering placeholder used while content loads.
 * Uses the `.skeleton` shimmer defined in globals.css.
 */
export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return <div className={`skeleton ${className}`} {...props} />;
}

/**
 * A ready-made skeleton for table rows.
 */
export function SkeletonTableRows({
  rows = 5,
  cols = 6,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-6 py-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className={`h-4 ${c === 0 ? 'w-32' : c === cols - 1 ? 'w-10' : 'flex-1'}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
