import { type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Table 组件系统 - 深色主题设计
 * 
 * 设计原则：
 * 1. 深色背景：表格头部和行使用深色背景
 * 2. 微妙边框：使用 border-primary 创建分隔
 * 3. 悬停效果：行悬停时显示微妙背景变化
 * 4. 选中状态：支持选中行的高亮显示
 * 5. 响应式：支持横向滚动
 */

const Table = forwardRef<
  HTMLTableElement,
  HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto rounded-xl border border-border-primary">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
));
Table.displayName = "Table";

function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead 
      className={cn(
        "border-b border-border-primary bg-bg-tertiary",
        className
      )} 
      {...props} 
    />
  );
}

function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody 
      className={cn(
        "[&_tr:last-child]:border-0 divide-y divide-border-primary",
        className
      )} 
      {...props} 
    />
  );
}

function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-b border-border-primary transition-colors",
        "hover:bg-bg-tertiary/50",
        "data-[state=selected]:bg-accent-blue/10 data-[state=selected]:border-accent-blue/30",
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
        "h-12 px-4 text-left align-middle text-xs font-semibold text-text-secondary uppercase tracking-wider",
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
    <td 
      className={cn(
        "p-4 align-middle text-text-primary",
        className
      )} 
      {...props} 
    />
  );
}

/**
 * 表格容器 - 带标题和操作的完整表格组件
 */
interface TableContainerProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

function TableContainer({
  title,
  description,
  action,
  children,
  className,
}: TableContainerProps) {
  return (
    <div className={cn(
      "rounded-xl border border-border-primary bg-bg-secondary overflow-hidden",
      className
    )}>
      {(title || description || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-primary">
          <div>
            {title && (
              <h3 className="text-base font-semibold text-text-primary">{title}</h3>
            )}
            {description && (
              <p className="mt-1 text-sm text-text-secondary">{description}</p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-0">
        {children}
      </div>
    </div>
  );
}

/**
 * 表格分页组件
 */
interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  className?: string;
}

function TablePagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  className,
}: TablePaginationProps) {
  const startItem = totalItems ? (currentPage - 1) * (pageSize || 10) + 1 : null;
  const endItem = totalItems ? Math.min(currentPage * (pageSize || 10), totalItems) : null;

  return (
    <div className={cn(
      "flex items-center justify-between px-5 py-4 border-t border-border-primary",
      className
    )}>
      <div className="text-sm text-text-muted">
        {totalItems !== undefined && startItem !== null && endItem !== null && (
          <span>显示 {startItem}-{endItem} 条，共 {totalItems} 条</span>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className={cn(
            "px-3 py-1.5 text-sm rounded-lg border transition-all duration-150",
            currentPage <= 1
              ? "border-border-primary text-text-muted cursor-not-allowed"
              : "border-border-primary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
          )}
        >
          上一页
        </button>
        
        <span className="text-sm text-text-secondary px-2">
          {currentPage} / {totalPages}
        </span>
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={cn(
            "px-3 py-1.5 text-sm rounded-lg border transition-all duration-150",
            currentPage >= totalPages
              ? "border-border-primary text-text-muted cursor-not-allowed"
              : "border-border-primary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
          )}
        >
          下一页
        </button>
      </div>
    </div>
  );
}

/**
 * 表格空状态
 */
interface TableEmptyProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

function TableEmpty({
  title = "暂无数据",
  description = "当前列表为空",
  icon,
  action,
  className,
}: TableEmptyProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 px-4",
      className
    )}>
      {icon && (
        <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center mb-4">
          <div className="text-text-muted">{icon}</div>
        </div>
      )}
      <h3 className="text-base font-medium text-text-primary">{title}</h3>
      <p className="mt-1 text-sm text-text-secondary">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/**
 * 表格加载状态
 */
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

function TableSkeleton({ rows = 5, columns = 4, className }: TableSkeletonProps) {
  return (
    <div className={cn("animate-pulse", className)}>
      {/* 表头骨架 */}
      <div className="flex gap-4 px-4 py-3 border-b border-border-primary bg-bg-tertiary">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-4 bg-bg-tertiary rounded flex-1" />
        ))}
      </div>
      
      {/* 行骨架 */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div 
          key={rowIndex} 
          className="flex gap-4 px-4 py-4 border-b border-border-primary"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="h-4 bg-bg-tertiary rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableContainer,
  TablePagination,
  TableEmpty,
  TableSkeleton,
};
