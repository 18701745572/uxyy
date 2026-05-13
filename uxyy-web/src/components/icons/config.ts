"use client";

/**
 * 优效营图标配置规范
 * 统一全站图标的大小、权重、颜色规范
 */

import type { IconWeight } from "@phosphor-icons/react";

// ==================== 图标尺寸规范 ====================
export const ICON_SIZES = {
  /** 超小 - 紧凑按钮内 */
  xs: 14,
  /** 小 - 列表项、表格操作 */
  sm: 16,
  /** 中 - 导航、表单 */
  md: 20,
  /** 大 - 空状态、卡片标题 */
  lg: 24,
  /** 超大 - 特色功能、Hero区域 */
  xl: 32,
  /** 特大 - 页面标题 */
  "2xl": 40,
} as const;

export type IconSize = keyof typeof ICON_SIZES;

// ==================== 图标权重规范 ====================
export const ICON_WEIGHTS = {
  /** 极细 - 装饰性图标 */
  thin: "thin",
  /** 细 - 次要信息 */
  light: "light",
  /** 常规 - 默认权重 */
  regular: "regular",
  /** 粗 - 强调、激活状态 */
  bold: "bold",
  /** 填充 - 选中状态、高对比 */
  fill: "fill",
  /** 双色 - 特殊效果 */
  duotone: "duotone",
} as const;

export type IconWeightType = keyof typeof ICON_WEIGHTS;

/** 默认权重 */
export const DEFAULT_ICON_WEIGHT: IconWeight = "regular";

/** 激活/选中状态权重 */
export const ACTIVE_ICON_WEIGHT: IconWeight = "bold";

/** 禁用/次要状态权重 */
export const SUBTLE_ICON_WEIGHT: IconWeight = "light";

// ==================== 图标使用场景规范 ====================
export const ICON_USAGE = {
  // 导航
  nav: {
    size: "sm" as IconSize,
    weight: "regular" as IconWeight,
    activeWeight: "bold" as IconWeight,
  },
  // 按钮
  button: {
    size: "sm" as IconSize,
    weight: "regular" as IconWeight,
  },
  // 表单
  form: {
    size: "sm" as IconSize,
    weight: "regular" as IconWeight,
  },
  // 表格操作
  table: {
    size: "xs" as IconSize,
    weight: "regular" as IconWeight,
  },
  // 卡片标题
  card: {
    size: "md" as IconSize,
    weight: "regular" as IconWeight,
  },
  // 空状态
  empty: {
    size: "xl" as IconSize,
    weight: "light" as IconWeight,
  },
  // 状态指示
  status: {
    size: "sm" as IconSize,
    weight: "fill" as IconWeight,
  },
  // 加载中
  loading: {
    size: "sm" as IconSize,
    weight: "regular" as IconWeight,
  },
} as const;

// ==================== 图标颜色规范 ====================
export const ICON_COLORS = {
  /** 默认 */
  default: "text-text-secondary",
  /** 主要 */
  primary: "text-text-primary",
  /** 次要 */
  secondary: "text-text-muted",
  /** 禁用 */
  disabled: "text-text-quaternary",
  /** 成功 */
  success: "text-emerald-600",
  /** 警告 */
  warning: "text-amber-600",
  /** 错误 */
  error: "text-red-600",
  /** 信息 */
  info: "text-blue-600",
} as const;

export type IconColor = keyof typeof ICON_COLORS;

// ==================== 辅助函数 ====================

/**
 * 获取图标尺寸像素值
 */
export function getIconSize(size: IconSize): number {
  return ICON_SIZES[size];
}

/**
 * 获取图标颜色类名
 */
export function getIconColor(color: IconColor): string {
  return ICON_COLORS[color];
}

/**
 * 根据使用场景获取图标配置
 */
export function getIconConfig(
  usage: keyof typeof ICON_USAGE,
  options?: {
    isActive?: boolean;
    customSize?: IconSize;
    customWeight?: IconWeight;
  }
) {
  const config = ICON_USAGE[usage];
  const { isActive, customSize, customWeight } = options || {};

  return {
    size: getIconSize(customSize || config.size),
    weight: customWeight || (isActive && 'activeWeight' in config ? config.activeWeight : config.weight),
  };
}
