"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark";
}

/**
 * 优效营 Logo 组件
 * 
 * 设计：2x2 四格方块，带有渐变透明度效果
 * - 左上：100% 不透明度
 * - 右上：60% 不透明度
 * - 左下：60% 不透明度
 * - 右下：30% 不透明度
 */
export function Logo({ className, size = "md", variant = "light" }: LogoProps) {
  const sizeMap = {
    sm: { width: 24, height: 24, rectSize: 7 },
    md: { width: 32, height: 32, rectSize: 10 },
    lg: { width: 48, height: 48, rectSize: 14 },
  };

  const { width, height, rectSize } = sizeMap[size];
  const gap = 4;
  const startOffset = 4;

  const fillColor = variant === "light" ? "white" : "currentColor";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
    >
      {/* 左上 - 100% 不透明度 */}
      <rect
        x={startOffset}
        y={startOffset}
        width={rectSize}
        height={rectSize}
        rx={2}
        fill={fillColor}
      />
      {/* 右上 - 60% 不透明度 */}
      <rect
        x={startOffset + rectSize + gap}
        y={startOffset}
        width={rectSize}
        height={rectSize}
        rx={2}
        fill={fillColor}
        opacity="0.6"
      />
      {/* 左下 - 60% 不透明度 */}
      <rect
        x={startOffset}
        y={startOffset + rectSize + gap}
        width={rectSize}
        height={rectSize}
        rx={2}
        fill={fillColor}
        opacity="0.6"
      />
      {/* 右下 - 30% 不透明度 */}
      <rect
        x={startOffset + rectSize + gap}
        y={startOffset + rectSize + gap}
        width={rectSize}
        height={rectSize}
        rx={2}
        fill={fillColor}
        opacity="0.3"
      />
    </svg>
  );
}
