"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

type AuroraBackdropProps = {
  /** fixed：全屏固定；absolute：占满父级（由父级提供定位上下文） */
  position?: "fixed" | "absolute";
  className?: string;
};

/**
 * 紫黑肌理背景：无大块色光，仅基底 + 刻线/点阵/轻噪点/网格 + 细线装饰。
 * 避免 SVG 模糊大色块 + mix-blend 叠层动画带来的闪屏与重绘抖动。
 */
export function AuroraBackdrop({
  position = "absolute",
  className,
}: AuroraBackdropProps) {
  const uid = useId().replace(/:/g, "");
  const noiseFilterId = `aurora-noise-${uid}`;
  const patternHatchId = `aurora-hatch-${uid}`;
  const patternFineId = `aurora-fine-${uid}`;

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
            id={patternHatchId}
            width={24}
            height={24}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-28)"
          >
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={24}
              stroke="#8b5cf6"
              strokeOpacity={0.12}
              strokeWidth={1}
            />
          </pattern>
          <pattern
            id={patternFineId}
            width={10}
            height={10}
            patternUnits="userSpaceOnUse"
          >
            <circle cx={1.5} cy={1.5} r={0.6} fill="#a78bfa" fillOpacity={0.07} />
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
        </defs>

        <rect width={1440} height={900} fill={`url(#${patternHatchId})`} opacity={0.85} />
        <rect width={1440} height={900} fill={`url(#${patternFineId})`} opacity={0.5} />

        <rect
          width={1440}
          height={900}
          filter={`url(#${noiseFilterId})`}
          opacity={0.09}
        />

        <g fill="none" strokeWidth={1} className="login-svg-deco">
          <circle cx={200} cy={140} r={118} stroke="#5b21b6" strokeOpacity={1} />
          <circle cx={1260} cy={200} r={96} stroke="#7c3aed" strokeOpacity={1} />
          <circle cx={720} cy={100} r={52} stroke="#a78bfa" strokeOpacity={1} />
          <path d="M 60 780 L 340 620" stroke="#6d28d9" strokeOpacity={1} strokeLinecap="round" />
          <path d="M 1180 740 L 1340 500" stroke="#9333ea" strokeOpacity={1} strokeLinecap="round" />
          <path d="M 400 860 Q 640 780 880 800" stroke="#581c87" strokeOpacity={1} strokeLinecap="round" />
          <path
            d="M 1040 120 L 1240 80 M 1120 40 L 1120 200"
            stroke="#4c1d95"
            strokeOpacity={0.9}
            strokeLinecap="round"
          />
          <circle cx={360} cy={300} r={2.5} fill="#c4b5fd" stroke="none" />
          <circle cx={1000} cy={160} r={2} fill="#c084fc" stroke="none" />
          <circle cx={1080} cy={640} r={2.5} fill="#818cf8" stroke="none" />
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
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: `linear-gradient(rgba(139, 92, 246, 0.32) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.26) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.032]"
        style={{
          backgroundImage: `linear-gradient(rgba(167, 139, 250, 0.35) 1px, transparent 1px),
            linear-gradient(90deg, rgba(167, 139, 250, 0.28) 1px, transparent 1px)`,
          backgroundSize: "16px 16px",
        }}
      />
    </div>
  );
}
