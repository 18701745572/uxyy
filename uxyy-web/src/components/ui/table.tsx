import { type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

const Table = forwardRef<
  HTMLTableElement,
  HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
));
Table.displayName = "Table";

function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("border-b border-zinc-200 bg-zinc-50", className)} {...props} />;
}

function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn("[&_tr:last-child]:border-0 divide-y divide-zinc-100", className)} {...props} />
  );
}

function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-b border-zinc-100 transition-colors hover:bg-zinc-50/70 data-[state=selected]:bg-zinc-100",
        className,
      )}
      {...props}
    />
  );
}

function TableHead({
  className,
  ...props
}: ThHTMLAttributes<HTMLTableHeaderCellElement>) {
  return (
    <th
      className={cn(
        "h-11 px-3 text-left align-middle text-xs font-medium text-zinc-600",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({
  className,
  ...props
}: TdHTMLAttributes<HTMLTableDataCellElement>) {
  return (
    <td className={cn("p-3 align-middle text-zinc-900", className)} {...props} />
  );
}

export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow };
