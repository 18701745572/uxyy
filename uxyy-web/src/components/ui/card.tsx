import { type HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Card 组件系统 - 深色主题设计
 * 
 * 设计原则：
 * 1. 深色背景：使用 bg-secondary 作为卡片背景
 * 2. 玻璃拟态：可选的半透明毛玻璃效果
 * 3. 微妙边框：使用 border-primary 创建层次感
 * 4. 悬停效果：上浮 + 发光效果
 * 5. 一致性：所有卡片使用相同的圆角和阴影
 */

/**
 * 基础卡片容器
 * 用于包裹任何需要卡片化展示的内容
 */
const Card = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement> & {
    /** 是否可点击，添加悬停效果 */
    hoverable?: boolean;
    /** 是否禁用默认内边距 */
    noPadding?: boolean;
    /** 是否使用玻璃拟态效果 */
    glass?: boolean;
    /** 是否添加发光边框 */
    glow?: boolean;
  }
>(({ className, hoverable = false, noPadding = false, glass = false, glow = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      // 基础样式：深色背景、圆角、边框
      "rounded-xl border border-border-primary bg-bg-secondary",
      // 阴影
      "shadow-md",
      // 过渡动画
      "transition-all duration-200 ease-out",
      // 玻璃拟态效果
      glass && [
        "bg-bg-secondary/80 backdrop-blur-xl",
        "border-white/10",
      ],
      // 发光边框
      glow && "shadow-glow border-accent-blue/30",
      // 可点击状态：悬停时阴影加深、轻微上移、发光
      hoverable && [
        "cursor-pointer",
        "hover:shadow-lg hover:border-border-secondary",
        "hover:-translate-y-0.5 hover:shadow-glow",
        "active:translate-y-0 active:shadow-md",
      ],
      // 内边距控制
      !noPadding && "p-5",
      className,
    )}
    {...props}
  />
));
Card.displayName = "Card";

/**
 * 卡片头部
 * 包含标题和描述，底部有分隔线
 */
const CardHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement> & {
    /** 标题 */
    title?: string;
    /** 描述文字 */
    description?: string;
    /** 右侧操作区域 */
    action?: React.ReactNode;
  }
>(({ className, title, description, action, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col gap-1.5 px-5 py-4 border-b border-border-primary",
      action && "flex-row items-center justify-between gap-4",
      className,
    )}
    {...props}
  >
    {children || (
      <>
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className="text-base font-semibold text-text-primary leading-tight">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-text-secondary mt-1 leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </>
    )}
  </div>
));
CardHeader.displayName = "CardHeader";

/**
 * 卡片标题
 * 单独使用的标题组件
 */
const CardTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight text-text-primary",
      className,
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

/**
 * 卡片描述
 */
const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-text-secondary", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

/**
 * 卡片内容区域
 */
const CardContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-5", className)} {...props} />
));
CardContent.displayName = "CardContent";

/**
 * 卡片页脚
 * 通常包含操作按钮
 */
const CardFooter = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center px-5 py-4 border-t border-border-primary",
      className,
    )}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

/**
 * 数据卡片（用于仪表盘）
 * 展示指标数值和变化趋势
 */
interface StatCardProps {
  /** 卡片标题 */
  title: string;
  /** 数值 */
  value: string | number;
  /** 变化值 */
  change?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  /** 图标 */
  icon?: React.ReactNode;
  /** 图标背景色 */
  iconBg?: string;
  /** 点击回调 */
  onClick?: () => void;
  className?: string;
}

const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
  ({ title, value, change, icon, iconBg = "bg-accent-blue/20", onClick, className }, ref) => {
    return (
      <Card
        ref={ref}
        hoverable={!!onClick}
        className={cn("p-5", className)}
        onClick={onClick}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <p className="text-sm text-text-secondary">{title}</p>
            <p className="text-3xl font-bold text-text-primary">{value}</p>
            {change && (
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "text-sm font-medium",
                    change.isPositive ? "text-success" : "text-error",
                  )}
                >
                  {change.isPositive ? "↑" : "↓"} {Math.abs(change.value)}%
                </span>
                {change.label && (
                  <span className="text-sm text-text-muted">{change.label}</span>
                )}
              </div>
            )}
          </div>
          {icon && (
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl",
                iconBg,
              )}
            >
              <div className="text-accent-blue">{icon}</div>
            </div>
          )}
        </div>
      </Card>
    );
  },
);
StatCard.displayName = "StatCard";

/**
 * 功能卡片（用于首页模块入口）
 */
interface FeatureCardProps {
  /** 标题 */
  title: string;
  /** 描述 */
  description: string;
  /** 图标 */
  icon: React.ReactNode;
  /** 点击回调 */
  onClick?: () => void;
  /** 是否禁用 */
  disabled?: boolean;
  className?: string;
}

const FeatureCard = forwardRef<HTMLDivElement, FeatureCardProps>(
  ({ title, description, icon, onClick, disabled, className }, ref) => {
    return (
      <Card
        ref={ref}
        hoverable={!disabled && !!onClick}
        className={cn("p-5", disabled && "opacity-60 cursor-not-allowed", className)}
        onClick={disabled ? undefined : onClick}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bg-tertiary text-text-secondary">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-text-primary">{title}</h3>
            <p className="mt-1 text-sm text-text-secondary leading-relaxed">
              {description}
            </p>
          </div>
        </div>
      </Card>
    );
  },
);
FeatureCard.displayName = "FeatureCard";

/**
 * 卡片骨架屏
 * 用于动态导入时的 loading 状态
 */
interface CardSkeletonProps {
  className?: string;
  height?: number | string;
}

function CardSkeleton({ className, height }: CardSkeletonProps) {
  return (
    <Card className={cn("animate-pulse", className)} style={{ height }}>
      <div className="space-y-3">
        <div className="h-4 w-1/3 bg-bg-tertiary rounded" />
        <div className="h-4 w-1/2 bg-bg-tertiary/50 rounded" />
        <div className="h-20 w-full bg-bg-tertiary rounded mt-4" />
      </div>
    </Card>
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  StatCard,
  FeatureCard,
  CardSkeleton,
};
