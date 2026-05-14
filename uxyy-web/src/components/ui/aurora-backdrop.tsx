"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

type AuroraBackdropProps = {
  /** fixed：全屏固定；absolute：占满父级（由父级提供定位上下文） */
  position?: "fixed" | "absolute";
  className?: string;
};

/**
 * 登录页专用背景：深色肌理 + 彩色水波涟漪等，与工作区 SimpleGridBackdrop 独立。
 */
export function AuroraBackdrop({
  position = "absolute",
  className,
}: AuroraBackdropProps) {
  const uid = useId().replace(/:/g, "");
  const noiseFilterId = `aurora-noise-${uid}`;
  const patternFineId = `aurora-fine-${uid}`;
  const waterSoftFilterId = `aurora-water-soft-${uid}`;
  const rippleGrad = {
    r1: `aurora-wr1-${uid}`,
    r2: `aurora-wr2-${uid}`,
    r3: `aurora-wr3-${uid}`,
  } as const;

  const posClass = position === "fixed" ? "fixed inset-0" : "absolute inset-0";

  return (
    <div
      className={cn(
        posClass,
        "pointer-events-none overflow-hidden z-0 isolate [contain:strict]",
        className,
      )}
      aria-hidden
    >
      {/* 均匀紫黑底（略暖紫边，无左右大光斑） */}
      <div
        className="absolute inset-0 bg-[#06030c]"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 100% 70% at 50% 0%, rgba(35, 18, 58, 0.22), transparent 50%),
            radial-gradient(ellipse 80% 50% at 50% 100%, rgba(18, 8, 32, 0.35), transparent 45%),
            radial-gradient(ellipse 88% 45% at 50% 48%, rgba(15, 80, 120, 0.1), transparent 58%),
            linear-gradient(180deg, #07040f 0%, #05030a 50%, #040208 100%)
          `,
        }}
      />

      <svg
        className="absolute inset-0 h-full w-full min-h-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1440 900"
      >
        <defs>
          <pattern
            id={patternFineId}
            width={10}
            height={10}
            patternUnits="userSpaceOnUse"
          >
            <circle cx={1.5} cy={1.5} r={0.6} fill="#a78bfa" fillOpacity={0.055} />
          </pattern>

          <filter
            id={noiseFilterId}
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.82"
              numOctaves={3}
              seed="8"
              stitchTiles="stitch"
              result="t"
            />
            <feColorMatrix
              in="t"
              type="matrix"
              values="0.18 0 0 0 0.03  0 0.15 0 0 0.02  0 0 0.22 0 0.05  0 0 0 0.35 0"
            />
          </filter>

          <filter
            id={waterSoftFilterId}
            x="-8%"
            y="-8%"
            width="116%"
            height="116%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation={0.55} />
          </filter>

          {/* 涟漪环：水平炫彩扫描，模拟水面反色 */}
          <linearGradient id={rippleGrad.r1} x1={0} y1={0} x2={1440} y2={0} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.55} />
            <stop offset="35%" stopColor="#3b82f6" stopOpacity={0.52} />
            <stop offset="70%" stopColor="#8b5cf6" stopOpacity={0.48} />
            <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0.5} />
          </linearGradient>
          <linearGradient id={rippleGrad.r2} x1={0} y1={0} x2={1440} y2={0} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#67e8f9" stopOpacity={0.5} />
            <stop offset="40%" stopColor="#6366f1" stopOpacity={0.54} />
            <stop offset="78%" stopColor="#f0abfc" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.5} />
          </linearGradient>
          <linearGradient id={rippleGrad.r3} x1={0} y1={0} x2={1440} y2={0} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4ade80" stopOpacity={0.38} />
            <stop offset="45%" stopColor="#38bdf8" stopOpacity={0.52} />
            <stop offset="100%" stopColor="#e879f9" stopOpacity={0.46} />
          </linearGradient>
        </defs>

        <rect width={1440} height={900} fill={`url(#${patternFineId})`} opacity={0.36} />

        <rect
          width={1440}
          height={900}
          filter={`url(#${noiseFilterId})`}
          opacity={0.06}
        />

        {/* 底层淡色环形（上半区，与海浪区域错开） */}
        <g fill="none" strokeWidth={1} className="login-svg-deco-ambient">
          <circle cx={200} cy={140} r={118} stroke="#5b21b6" strokeOpacity={0.4} />
          <circle cx={1260} cy={200} r={96} stroke="#7c3aed" strokeOpacity={0.36} />
          <circle cx={720} cy={100} r={52} stroke="#a78bfa" strokeOpacity={0.33} />
        </g>

        {/* 双波心椭圆涟漪（屏中水波） */}
        <g
          filter={`url(#${waterSoftFilterId})`}
          fill="none"
          strokeLinecap="round"
          className="login-svg-deco-water-ripples"
        >
          <g transform="translate(662 448) rotate(-4.5)">
            <ellipse cx={0} cy={0} rx={115} ry={15} stroke={`url(#${rippleGrad.r1})`} strokeWidth={1.05} />
            <ellipse cx={0} cy={0} rx={198} ry={26} stroke={`url(#${rippleGrad.r2})`} strokeWidth={0.98} />
            <ellipse cx={0} cy={0} rx={288} ry={36} stroke={`url(#${rippleGrad.r3})`} strokeWidth={0.92} />
            <ellipse cx={0} cy={0} rx={392} ry={48} stroke={`url(#${rippleGrad.r1})`} strokeWidth={0.85} />
            <ellipse cx={0} cy={0} rx={505} ry={62} stroke={`url(#${rippleGrad.r2})`} strokeWidth={0.78} />
            <ellipse cx={0} cy={0} rx={630} ry={76} stroke={`url(#${rippleGrad.r3})`} strokeWidth={0.72} />
          </g>
          <g transform="translate(838 468) rotate(5)">
            <ellipse cx={0} cy={0} rx={95} ry={12} stroke={`url(#${rippleGrad.r2})`} strokeWidth={0.88} />
            <ellipse cx={0} cy={0} rx={168} ry={21} stroke={`url(#${rippleGrad.r3})`} strokeWidth={0.82} />
            <ellipse cx={0} cy={0} rx={248} ry={30} stroke={`url(#${rippleGrad.r1})`} strokeWidth={0.76} />
            <ellipse cx={0} cy={0} rx={338} ry={40} stroke={`url(#${rippleGrad.r2})`} strokeWidth={0.7} />
          </g>
        </g>
      </svg>

      <div
        className="absolute inset-0"
        style={{
          boxShadow:
            "inset 0 0 180px rgba(4, 0, 12, 0.65), inset 0 -80px 120px rgba(2, 0, 8, 0.88)",
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.028]"
        style={{
          backgroundImage: `linear-gradient(rgba(139, 92, 246, 0.32) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.26) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.016]"
        style={{
          backgroundImage: `linear-gradient(rgba(167, 139, 250, 0.35) 1px, transparent 1px),
            linear-gradient(90deg, rgba(167, 139, 250, 0.28) 1px, transparent 1px)`,
          backgroundSize: "16px 16px",
        }}
      />
    </div>
  );
}
