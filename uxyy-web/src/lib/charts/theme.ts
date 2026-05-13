/**
 * 图表主题配置 - 深色主题
 * 
 * 设计原则：
 * 1. 深色背景适配：所有颜色适配深色背景
 * 2. 品牌渐变：使用蓝紫粉渐变作为品牌色
 * 3. 高对比度：确保数据可读性
 * 4. 统一风格：与系统整体风格一致
 */

// ============================================================================
// 基础颜色
// ============================================================================

/** 品牌主色 - 蓝紫粉渐变 */
export const BRAND_COLORS = {
  blue: "#3b82f6",
  purple: "#8b5cf6",
  pink: "#ec4899",
  cyan: "#06b6d4",
};

/** 图表配色方案 */
export const CHART_COLORS = {
  // 主要数据系列
  primary: ["#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#6366f1"],
  // 次要数据系列（更柔和）
  secondary: ["#60a5fa", "#a78bfa", "#f472b6", "#22d3ee", "#34d399", "#fbbf24", "#f87171", "#818cf8"],
  // 单色渐变（用于单一系列）
  monochrome: ["#1e40af", "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"],
};

/** 语义化颜色 */
export const SEMANTIC_COLORS = {
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  info: "#06b6d4",
  neutral: "#71717a",
};

// ============================================================================
// 深色主题图表配置
// ============================================================================

/** 深色主题通用配置 */
export const DARK_THEME_CONFIG = {
  // 背景色
  backgroundColor: "transparent",
  
  // 文字颜色
  textColor: "#a1a1aa",
  textColorSecondary: "#71717a",
  textColorPrimary: "#ffffff",
  
  // 网格线
  gridColor: "#27272a",
  gridColorLight: "#3f3f46",
  
  // 轴线
  axisColor: "#3f3f46",
  
  // Tooltip 样式
  tooltip: {
    backgroundColor: "rgba(28, 28, 30, 0.95)",
    borderColor: "#3f3f46",
    borderWidth: 1,
    borderRadius: 8,
    textStyle: {
      color: "#ffffff",
      fontSize: 12,
    },
    padding: [12, 16],
    shadowBlur: 20,
    shadowColor: "rgba(0, 0, 0, 0.5)",
  },
  
  // 图例样式
  legend: {
    textStyle: {
      color: "#a1a1aa",
      fontSize: 12,
    },
    pageTextStyle: {
      color: "#a1a1aa",
    },
  },
};

// ============================================================================
// Recharts 专用配置
// ============================================================================

/** Recharts 深色主题配置 */
export const RECHARTS_DARK_THEME = {
  // 坐标轴
  xAxis: {
    stroke: "#3f3f46",
    tick: { fill: "#71717a", fontSize: 11 },
    tickLine: { stroke: "#3f3f46" },
    axisLine: { stroke: "#3f3f46" },
  },
  yAxis: {
    stroke: "#3f3f46",
    tick: { fill: "#71717a", fontSize: 11 },
    tickLine: { stroke: "#3f3f46" },
    axisLine: { stroke: "#3f3f46" },
  },
  
  // 网格
  cartesianGrid: {
    stroke: "#27272a",
    strokeDasharray: "3 3",
  },
  
  // Tooltip
  tooltip: {
    contentStyle: {
      backgroundColor: "rgba(28, 28, 30, 0.95)",
      border: "1px solid #3f3f46",
      borderRadius: "8px",
      color: "#ffffff",
      fontSize: "12px",
      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
    },
    itemStyle: {
      color: "#ffffff",
    },
    labelStyle: {
      color: "#a1a1aa",
    },
  },
  
  // 图例
  legend: {
    wrapperStyle: {
      color: "#a1a1aa",
    },
  },
};

// ============================================================================
// 图表类型专用配色
// ============================================================================

/** 柱状图配色 */
export const BAR_CHART_COLORS = {
  sales: "#3b82f6",
  purchase: "#8b5cf6",
  profit: "#10b981",
  expense: "#ef4444",
};

/** 折线图配色 */
export const LINE_CHART_COLORS = {
  primary: "#3b82f6",
  secondary: "#8b5cf6",
  tertiary: "#ec4899",
  quaternary: "#06b6d4",
};

/** 饼图配色 */
export const PIE_CHART_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#6366f1",
  "#14b8a6",
  "#f97316",
];

/** 面积图渐变 */
export const AREA_GRADIENTS = {
  blue: ["#3b82f6", "#3b82f620"],
  purple: ["#8b5cf6", "#8b5cf620"],
  pink: ["#ec4899", "#ec489920"],
  cyan: ["#06b6d4", "#06b6d420"],
  green: ["#10b981", "#10b98120"],
};

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 格式化货币
 */
export function formatCurrency(value: number): string {
  return `¥${value.toLocaleString("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * 格式化大数字（万/亿）
 */
export function formatLargeNumber(value: number): string {
  if (value >= 1e8) {
    return `${(value / 1e8).toFixed(1)}亿`;
  }
  if (value >= 1e4) {
    return `${(value / 1e4).toFixed(1)}万`;
  }
  return String(value);
}

/**
 * 格式化百分比
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * 获取颜色数组（循环使用）
 */
export function getColorByIndex(index: number, palette: string[] = CHART_COLORS.primary): string {
  return palette[index % palette.length];
}

/**
 * 创建渐变定义配置（用于 SVG）
 * 返回配置对象，在组件中使用
 */
export function createGradientConfig(
  id: string,
  colors: [string, string],
  direction: "vertical" | "horizontal" = "vertical"
): {
  id: string;
  x1: string;
  y1: string;
  x2: string;
  y2: string;
  stops: { offset: string; color: string }[];
} {
  const x1 = direction === "vertical" ? "0" : "0";
  const y1 = direction === "vertical" ? "0" : "0";
  const x2 = direction === "vertical" ? "0" : "1";
  const y2 = direction === "vertical" ? "1" : "0";

  return {
    id,
    x1,
    y1,
    x2,
    y2,
    stops: [
      { offset: "0%", color: colors[0] },
      { offset: "100%", color: colors[1] },
    ],
  };
}
