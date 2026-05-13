import { type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Badge 组件 - 深色主题设计
 * 
 * 设计原则：
 * 1. 深色背景：适配深色主题
 * 2. 多种变体：支持不同语义的颜色
 * 3. 微妙边框：创建层次感
 * 4. 发光效果：重点徽章可添加发光
 */

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        // 默认 - 中性色
        default: "border border-border-primary bg-bg-tertiary text-text-secondary",
        // 主要 - 品牌蓝色
        primary: "border border-accent-blue/30 bg-accent-blue/10 text-accent-blue",
        // 次要 - 紫色
        secondary: "border border-accent-purple/30 bg-accent-purple/10 text-accent-purple",
        // 成功 - 绿色
        success: "border border-success/30 bg-success/10 text-success",
        // 警告 - 黄色
        warning: "border border-warning/30 bg-warning/10 text-warning",
        // 错误 - 红色
        error: "border border-error/30 bg-error/10 text-error",
        // 信息 - 青色
        info: "border border-info/30 bg-info/10 text-info",
        // 轮廓 - 仅边框
        outline: "border border-border-secondary text-text-secondary",
        // 发光 - 带发光效果
        glow: "border border-accent-blue/50 bg-accent-blue/20 text-accent-blue shadow-glow",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

/**
 * 状态徽章 - 用于显示状态
 */
interface StatusBadgeProps {
  status: "pending" | "processing" | "completed" | "cancelled" | "error";
  text?: string;
  className?: string;
}

export function StatusBadge({ status, text, className }: StatusBadgeProps) {
  const config = {
    pending: { variant: "default" as const, text: text || "待处理" },
    processing: { variant: "info" as const, text: text || "处理中" },
    completed: { variant: "success" as const, text: text || "已完成" },
    cancelled: { variant: "warning" as const, text: text || "已取消" },
    error: { variant: "error" as const, text: text || "错误" },
  };

  const { variant, text: defaultText } = config[status];

  return (
    <Badge variant={variant} className={className}>
      {defaultText}
    </Badge>
  );
}
