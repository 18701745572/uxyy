"use client";

import { cn } from "@/lib/utils";

interface ChartSkeletonProps {
  className?: string;
  height?: number | string;
}

export function ChartSkeleton({ className, height = 224 }: ChartSkeletonProps) {
  return (
    <div
      className={cn(
        "w-full rounded-lg bg-bg-secondary animate-pulse",
        className
      )}
      style={{ height: typeof height === "number" ? `${height}px` : height }}
    >
      <div className="h-full w-full flex items-end justify-around px-4 pb-4 pt-8 gap-2">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="bg-bg-tertiary rounded-sm"
            style={{
              width: `${60 + Math.random() * 40}px`,
              height: `${30 + Math.random() * 60}%`,
              opacity: 0.5 + Math.random() * 0.3,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function ChartCardSkeleton({
  className,
  height = 224,
}: ChartSkeletonProps) {
  return (
    <div
      className={cn(
        "p-4 border border-border-secondary rounded-lg bg-bg-secondary",
        className
      )}
    >
      <div className="h-5 w-32 bg-bg-tertiary rounded animate-pulse mb-1" />
      <div className="h-4 w-48 bg-bg-tertiary/50 rounded animate-pulse mb-4" />
      <ChartSkeleton height={height} />
    </div>
  );
}
