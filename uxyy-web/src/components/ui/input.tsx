import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Input 组件系统 - 深色主题设计
 * 
 * 设计原则：
 * 1. 深色主题适配：输入框背景适配深色界面
 * 2. 玻璃拟态：半透明背景效果
 * 3. 发光边框：聚焦时蓝色发光效果
 * 4. 自动填充覆盖：处理浏览器自动填充样式
 * 5. 无障碍：正确的 label 关联，支持键盘导航
 */

// ============================================================================
// 基础输入框
// ============================================================================

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** 标签文字 */
  label?: string;
  /** 帮助文字 */
  helpText?: string;
  /** 错误信息 */
  error?: string;
  /** 左侧图标 */
  leftIcon?: React.ReactNode;
  /** 右侧图标 */
  rightIcon?: React.ReactNode;
  /** 是否显示清除按钮（仅在受控组件时有效） */
  clearable?: boolean;
  /** 清除按钮点击回调 */
  onClear?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      helpText,
      error,
      leftIcon,
      rightIcon,
      clearable,
      onClear,
      id,
      value,
      disabled,
      ...props
    },
    ref,
  ) => {
    const inputId = id ?? (label ? `input-${label}` : undefined);
    const hasError = !!error;
    const hasLeftIcon = !!leftIcon;
    const hasRightIcon = !!rightIcon || (clearable && value);

    return (
      <div className="flex flex-col gap-1.5">
        {/* 标签 */}
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-text-secondary"
          >
            {label}
            {props.required && (
              <span className="text-error ml-0.5">*</span>
            )}
          </label>
        )}

        {/* 输入框容器 */}
        <div className="relative">
          {/* 左侧图标 */}
          {hasLeftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
              {leftIcon}
            </div>
          )}

          {/* 输入框 */}
          <input
            id={inputId}
            ref={ref}
            value={value}
            disabled={disabled}
            className={cn(
              // 基础样式
              "w-full h-11 px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted",
              "bg-bg-tertiary border rounded-lg",
              // 聚焦状态 - 发光效果
              "focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue",
              // 禁用状态
              "disabled:bg-bg-secondary disabled:text-text-muted disabled:cursor-not-allowed",
              // 过渡动画
              "transition-all duration-150 ease-out",
              // 错误状态
              hasError
                ? "border-error focus:border-error focus:ring-error/20"
                : "border-border-primary hover:border-border-secondary",
              // 图标偏移
              hasLeftIcon && "pl-10",
              hasRightIcon && "pr-10",
              className,
            )}
            {...props}
          />

          {/* 右侧图标或清除按钮 */}
          {hasRightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {clearable && value ? (
                <button
                  type="button"
                  onClick={onClear}
                  className="text-text-muted hover:text-text-secondary transition-colors"
                  tabIndex={-1}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                </button>
              ) : (
                <div className="text-text-muted pointer-events-none">
                  {rightIcon}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 帮助文字或错误信息 */}
        {(helpText || error) && (
          <p
            className={cn(
              "text-xs",
              error ? "text-error" : "text-text-muted",
            )}
          >
            {error || helpText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

// ============================================================================
// 文本域
// ============================================================================

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helpText?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, helpText, error, id, disabled, ...props }, ref) => {
    const textareaId = id ?? (label ? `textarea-${label}` : undefined);
    const hasError = !!error;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-sm font-medium text-text-secondary"
          >
            {label}
            {props.required && <span className="text-error ml-0.5">*</span>}
          </label>
        )}

        <textarea
          id={textareaId}
          ref={ref}
          disabled={disabled}
          className={cn(
            "w-full min-h-[100px] px-4 py-3 text-sm text-text-primary placeholder:text-text-muted",
            "bg-bg-tertiary border rounded-lg resize-y",
            "focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue",
            "disabled:bg-bg-secondary disabled:text-text-muted disabled:cursor-not-allowed",
            "transition-all duration-150 ease-out",
            hasError
              ? "border-error focus:border-error focus:ring-error/20"
              : "border-border-primary hover:border-border-secondary",
            className,
          )}
          {...props}
        />

        {(helpText || error) && (
          <p className={cn("text-xs", error ? "text-error" : "text-text-muted")}>
            {error || helpText}
          </p>
        )}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";

// ============================================================================
// 搜索输入框
// ============================================================================

export interface SearchInputProps
  extends Omit<InputProps, "leftIcon" | "type"> {
  /** 搜索回调 */
  onSearch?: (value: string) => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, onSearch, onKeyDown, ...props }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && onSearch) {
        onSearch((e.target as HTMLInputElement).value);
      }
      onKeyDown?.(e);
    };

    return (
      <Input
        ref={ref}
        type="search"
        leftIcon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        }
        placeholder="搜索..."
        className={cn("[&_input]:pl-10", className)}
        onKeyDown={handleKeyDown}
        {...props}
      />
    );
  },
);

SearchInput.displayName = "SearchInput";

// ============================================================================
// 带标签的输入框组
// ============================================================================

export interface InputGroupProps {
  children: React.ReactNode;
  className?: string;
}

export const InputGroup = forwardRef<HTMLDivElement, InputGroupProps>(
  ({ children, className }, ref) => {
    return (
      <div ref={ref} className={cn("flex flex-col gap-4", className)}>
        {children}
      </div>
    );
  },
);

InputGroup.displayName = "InputGroup";
