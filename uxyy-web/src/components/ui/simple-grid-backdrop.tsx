"use client";

import { cn } from "@/lib/utils";

type SimpleGridBackdropProps = {
  position?: "fixed" | "absolute";
  className?: string;
};

/**
 * 系统内部工作区背景：仅浅色细线网格 + 纯色底，与登录页 AuroraBackdrop 完全独立。
 */
export function SimpleGridBackdrop({
  position = "fixed",
  className,
}: SimpleGridBackdropProps) {
  const posClass = position === "fixed" ? "fixed inset-0" : "absolute inset-0";

  return (
    <div
      className={cn(
        posClass,
        "pointer-events-none z-0 overflow-hidden [contain:strict]",
        className,
      )}
      aria-hidden
      style={{
        backgroundColor: "#05050a",
        backgroundImage: `
          linear-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.045) 1px, transparent 1px)
        `,
        backgroundSize: "20px 20px",
        backgroundPosition: "0 0, 0 0",
      }}
    />
  );
}
