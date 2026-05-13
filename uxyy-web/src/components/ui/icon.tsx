"use client";

/**
 * 统一图标组件
 * 提供一致的图标渲染和配置管理
 */

import React from "react";
import type { Icon as PhosphorIcon, IconWeight } from "@phosphor-icons/react";
import {
  DEFAULT_ICON_WEIGHT,
  getIconSize,
  getIconColor,
  getIconConfig,
  type IconSize,
  type IconColor,
} from "@/components/icons/config";

// ==================== 组件 Props ====================
export interface IconProps {
  /** Phosphor 图标组件 */
  icon: PhosphorIcon;
  /** 尺寸 - 使用预设尺寸或自定义像素值 */
  size?: IconSize | number;
  /** 权重 */
  weight?: IconWeight;
  /** 颜色主题 */
  color?: IconColor;
  /** 自定义颜色类名（覆盖 color） */
  className?: string;
  /** 点击事件 */
  onClick?: () => void;
  /** 是否旋转（用于加载状态） */
  spin?: boolean;
  /** aria 标签 */
  ariaLabel?: string;
  /** 是否隐藏（用于无障碍） */
  ariaHidden?: boolean;
}

// ==================== Icon 组件 ====================
export function Icon({
  icon: IconComponent,
  size = "sm",
  weight = DEFAULT_ICON_WEIGHT,
  color = "default",
  className = "",
  onClick,
  spin = false,
  ariaLabel,
  ariaHidden = true,
}: IconProps) {
  // 计算尺寸
  const iconSize = typeof size === "number" ? size : getIconSize(size);

  // 计算颜色
  const colorClass = className || getIconColor(color);

  // 计算动画类
  const spinClass = spin ? "animate-spin" : "";

  // 计算点击样式
  const clickableClass = onClick ? "cursor-pointer hover:opacity-80" : "";

  return (
    <IconComponent
      size={iconSize}
      weight={weight}
      className={`${colorClass} ${spinClass} ${clickableClass}`.trim()}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
    />
  );
}

// ==================== 快捷使用组件 ====================

/**
 * 导航图标
 */
export function NavIcon({
  icon,
  isActive = false,
  ...props
}: Omit<IconProps, "size" | "weight"> & { isActive?: boolean }) {
  const config = getIconConfig("nav", { isActive });
  return <Icon icon={icon} size={config.size} weight={config.weight} {...props} />;
}

/**
 * 按钮图标
 */
export function ButtonIcon({
  icon,
  ...props
}: Omit<IconProps, "size" | "weight">) {
  const config = getIconConfig("button");
  return <Icon icon={icon} size={config.size} weight={config.weight} {...props} />;
}

/**
 * 表单图标
 */
export function FormIcon({
  icon,
  ...props
}: Omit<IconProps, "size" | "weight">) {
  const config = getIconConfig("form");
  return <Icon icon={icon} size={config.size} weight={config.weight} {...props} />;
}

/**
 * 表格操作图标
 */
export function TableIcon({
  icon,
  ...props
}: Omit<IconProps, "size" | "weight">) {
  const config = getIconConfig("table");
  return <Icon icon={icon} size={config.size} weight={config.weight} {...props} />;
}

/**
 * 卡片图标
 */
export function CardIcon({
  icon,
  ...props
}: Omit<IconProps, "size" | "weight">) {
  const config = getIconConfig("card");
  return <Icon icon={icon} size={config.size} weight={config.weight} {...props} />;
}

/**
 * 空状态图标
 */
export function EmptyIcon({
  icon,
  ...props
}: Omit<IconProps, "size" | "weight" | "color">) {
  const config = getIconConfig("empty");
  return (
    <Icon
      icon={icon}
      size={config.size}
      weight={config.weight}
      color="secondary"
      {...props}
    />
  );
}

/**
 * 状态图标
 */
export function StatusIcon({
  icon,
  color = "info",
  ...props
}: Omit<IconProps, "size" | "weight" | "color"> & { color?: IconColor }) {
  const config = getIconConfig("status");
  return (
    <Icon
      icon={icon}
      size={config.size}
      weight={config.weight}
      color={color}
      {...props}
    />
  );
}

/**
 * 加载图标
 */
export function LoadingIcon({
  icon,
  ...props
}: Omit<IconProps, "size" | "weight" | "spin">) {
  const config = getIconConfig("loading");
  return (
    <Icon
      icon={icon}
      size={config.size}
      weight={config.weight}
      spin
      {...props}
    />
  );
}

// ==================== 带文本的图标组件 ====================

export interface IconWithTextProps extends IconProps {
  /** 文本内容 */
  text: string;
  /** 文本位置 */
  textPosition?: "left" | "right";
  /** 间距 */
  gap?: "xs" | "sm" | "md";
}

/**
 * 图标+文本组合
 */
export function IconWithText({
  text,
  textPosition = "right",
  gap = "sm",
  ...iconProps
}: IconWithTextProps) {
  const gapClass = {
    xs: "gap-1",
    sm: "gap-1.5",
    md: "gap-2",
  }[gap];

  const content = (
    <>
      {textPosition === "left" && <span>{text}</span>}
      <Icon {...iconProps} />
      {textPosition === "right" && <span>{text}</span>}
    </>
  );

  return (
    <span className={`inline-flex items-center ${gapClass}`}>{content}</span>
  );
}

// ==================== 导出配置 ====================
export {
  ICON_SIZES,
  ICON_COLORS,
  DEFAULT_ICON_WEIGHT,
  getIconSize,
  getIconColor,
  getIconConfig,
} from "@/components/icons/config";

export type { IconSize, IconColor } from "@/components/icons/config";
