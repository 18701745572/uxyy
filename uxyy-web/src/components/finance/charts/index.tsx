"use client";

import dynamic from "next/dynamic";
import { ChartCardSkeleton } from "@/components/ui/chart-skeleton";
import type { DashboardData } from "@/lib/api/reports";
import type { IncomeStatementData } from "@/lib/api/reports";

// 动态导入仪表盘图表组件
const DashboardOperationCharts = dynamic(
  () =>
    import("./dashboard-operation-charts").then((mod) => ({
      default: mod.DashboardOperationCharts,
    })),
  {
    ssr: false,
    loading: () => <ChartCardSkeleton height={224} />,
  }
);

// 动态导入利润表图表组件
const IncomeStatementStructureChart = dynamic(
  () =>
    import("./income-statement-structure-chart").then((mod) => ({
      default: mod.IncomeStatementStructureChart,
    })),
  {
    ssr: false,
    loading: () => <ChartCardSkeleton height={208} />,
  }
);

// 重新导出类型和组件
export { DashboardOperationCharts, IncomeStatementStructureChart };
export type { DashboardData, IncomeStatementData };
