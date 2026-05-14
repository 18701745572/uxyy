import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Button 组件 - 深色主题设计
 *
 * 设计原则：
 * 1. 深色主题适配：所有变体适配深色背景
 * 2. 蓝紫粉渐变：主按钮使用品牌渐变
 * 3. 玻璃拟态：次级按钮使用半透明效果
 * 4. 发光效果：重点按钮悬停时发光
 * 5. 微交互：悬停 150ms，点击 100ms 反馈
 */

const buttonVariants = cva(
  // 基础样式
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98] active:duration-100",
  {
    variants: {
      variant: {
        // 主按钮：蓝紫粉渐变，最高视觉权重
        primary:
          "bg-gradient-to-r from-accent-blue via-accent-purple to-accent-pink text-white " +
          "hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 " +
          "active:from-blue-700 active:via-purple-700 active:to-pink-700 " +
          "focus-visible:ring-accent-blue/50 shadow-md hover:shadow-glow",

        // 次级按钮：玻璃拟态效果
        secondary:
          "bg-bg-tertiary/80 backdrop-blur-sm border border-border-primary text-text-primary " +
          "hover:bg-bg-tertiary hover:border-border-secondary " +
          "active:bg-bg-secondary active:border-border-primary " +
          "focus-visible:ring-accent-blue/30",

        // 危险按钮：红色背景，用于删除等危险操作
        danger:
          "bg-error/90 text-white hover:bg-error active:bg-error/80 " +
          "focus-visible:ring-error/50 shadow-sm hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]",

        // 幽灵按钮：透明背景，最低视觉权重
        ghost:
          "bg-transparent text-text-secondary " +
          "hover:bg-bg-tertiary hover:text-text-primary " +
          "active:bg-bg-secondary " +
          "focus-visible:ring-accent-blue/30",

        // 轮廓按钮：带边框的透明背景
        outline:
          "border border-border-secondary bg-transparent text-text-primary " +
          "hover:bg-bg-tertiary hover:border-border-primary " +
          "active:bg-bg-secondary " +
          "focus-visible:ring-accent-blue/30",

        // 链接按钮：看起来像链接
        link:
          "bg-transparent text-accent-blue underline-offset-4 " +
          "hover:underline hover:text-blue-400 " +
          "active:text-blue-500 " +
          "focus-visible:ring-accent-blue/30",
      },
      size: {
        // 小尺寸：用于表格操作、紧凑布局
        sm: "h-8 rounded-md px-3 text-xs gap-1.5",
        // 默认尺寸：大多数场景使用
        default: "h-10 px-4 py-2 rounded-lg",
        // 大尺寸：用于主要操作、弹窗确认
        lg: "h-11 px-6 rounded-lg text-base",
        // 图标按钮：正方形，用于工具栏
        icon: "h-10 w-10 rounded-lg p-2",
        // 小图标按钮
        "icon-sm": "h-8 w-8 rounded-md p-1.5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** 将样式合并到唯一子节点 */
  asChild?: boolean;
  /** 加载状态 */
  loading?: boolean;
  /** 加载时显示的文字 */
  loadingText?: string;
}

/**
 * 加载动画组件
 */
function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * Button 组件
 *
 * @example
 * // 主按钮（渐变）
 * <Button>确认提交</Button>
 *
 * // 次级按钮（玻璃拟态）
 * <Button variant="secondary">取消</Button>
 *
 * // 危险按钮
 * <Button variant="danger">删除</Button>
 *
 * // 加载状态
 * <Button loading>提交中...</Button>
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "default",
      asChild = false,
      loading = false,
      loadingText,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const isDisabled = disabled || loading;

    // asChild 模式下，直接传递 children，不添加加载状态包装
    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          disabled={isDisabled}
          {...props}
        >
          {children}
        </Comp>
      );
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {loading && (
          <LoadingSpinner
            className={cn(
              "flex-shrink-0",
              size === "sm" || size === "icon-sm" ? "h-3.5 w-3.5" : "h-4 w-4",
            )}
          />
        )}
        <span
          className={cn(
            loading && "opacity-0",
            "inline-flex items-center gap-2 whitespace-nowrap relative",
          )}
        >
          {loading && loadingText ? loadingText : children}
        </span>
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            {loadingText || children}
          </span>
        )}
      </Comp>
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
