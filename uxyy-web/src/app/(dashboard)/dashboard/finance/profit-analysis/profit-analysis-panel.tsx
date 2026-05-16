"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchIncomeStatement,
  fetchDashboard,
} from "@/lib/api/reports";
import { ApiErrorCallout } from "@/components/ui/api-error-callout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const selectCls =
  "rounded-md border border-border-primary bg-bg-secondary text-text-primary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all";

// 模拟获取多期数据用于趋势分析
async function fetchProfitTrend(
  startDate: string,
  endDate: string,
): Promise<ProfitTrendItem[]> {
  // 生成月度数据点
  const start = new Date(startDate);
  const end = new Date(endDate);
  const months: string[] = [];

  const current = new Date(start);
  while (current <= end) {
    months.push(current.toISOString().slice(0, 7));
    current.setMonth(current.getMonth() + 1);
  }

  // 并行获取各月数据
  const results = await Promise.all(
    months.map(async (month) => {
      try {
        const data = await fetchIncomeStatement(month);
        return {
          period: month,
          revenue: parseFloat(data.totalRevenue) || 0,
          costs: parseFloat(data.totalCosts) || 0,
          expenses: parseFloat(data.totalExpenses) || 0,
          netProfit: parseFloat(data.netProfit) || 0,
          grossProfit:
            (parseFloat(data.totalRevenue) || 0) - (parseFloat(data.totalCosts) || 0),
        };
      } catch {
        return null;
      }
    }),
  );

  return results.filter((r): r is ProfitTrendItem => r !== null);
}

interface ProfitTrendItem {
  period: string;
  revenue: number;
  costs: number;
  expenses: number;
  netProfit: number;
  grossProfit: number;
}

export function ProfitAnalysisPanel() {
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("month");
  const [date, setDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 7);
  });
  const [trendRange, setTrendRange] = useState<"3m" | "6m" | "12m">("6m");

  // 获取当前期间数据
  const currentQuery = useQuery({
    queryKey: ["finance", "income-statement", date],
    queryFn: () => fetchIncomeStatement(date),
  });

  // 获取仪表盘数据补充毛利率信息
  useQuery({
    queryKey: ["finance", "dashboard", "month", date],
    queryFn: () => fetchDashboard("month", date),
  });

  // 获取趋势数据
  const trendQuery = useQuery({
    queryKey: ["finance", "profit-trend", trendRange, date],
    queryFn: () => {
      const end = new Date(date);
      const start = new Date(end);
      const months = trendRange === "3m" ? 3 : trendRange === "6m" ? 6 : 12;
      start.setMonth(start.getMonth() - months + 1);
      return fetchProfitTrend(
        start.toISOString().slice(0, 7),
        end.toISOString().slice(0, 7),
      );
    },
    enabled: currentQuery.isSuccess,
  });

  // 计算指标
  const metrics = useMemo(() => {
    if (!currentQuery.data) return null;

    const revenue = parseFloat(currentQuery.data.totalRevenue) || 0;
    const costs = parseFloat(currentQuery.data.totalCosts) || 0;
    const expenses = parseFloat(currentQuery.data.totalExpenses) || 0;
    const netProfit = parseFloat(currentQuery.data.netProfit) || 0;
    const grossProfit = revenue - costs;

    return {
      revenue,
      costs,
      expenses,
      netProfit,
      grossProfit,
      grossProfitRate: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
      netProfitRate: revenue > 0 ? (netProfit / revenue) * 100 : 0,
      costRate: revenue > 0 ? (costs / revenue) * 100 : 0,
      expenseRate: revenue > 0 ? (expenses / revenue) * 100 : 0,
    };
  }, [currentQuery.data]);

  // 计算趋势分析
  const trendAnalysis = useMemo(() => {
    if (!trendQuery.data || trendQuery.data.length < 2) return null;

    const data = trendQuery.data;
    const current = data[data.length - 1];
    const previous = data[data.length - 2];

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return { value: 0, percent: 0 };
      const change = current - previous;
      const percent = (change / previous) * 100;
      return { value: change, percent };
    };

    return {
      revenue: calculateChange(current.revenue, previous.revenue),
      netProfit: calculateChange(current.netProfit, previous.netProfit),
      grossProfit: calculateChange(current.grossProfit, previous.grossProfit),
      avgNetProfitRate:
        data.reduce((sum, item) => {
          return item.revenue > 0
            ? sum + (item.netProfit / item.revenue) * 100
            : sum;
        }, 0) / data.length,
      trend: data,
    };
  }, [trendQuery.data]);

  // 简单的趋势图组件
  function SimpleTrendChart({
    data,
    dataKey,
    color,
  }: {
    data: ProfitTrendItem[];
    dataKey: keyof ProfitTrendItem;
    color: string;
  }) {
    if (data.length === 0) return null;

    const values = data.map((d) => d[dataKey] as number);
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;

    return (
      <div className="h-32 flex items-end gap-1">
        {data.map((item, index) => {
          const value = item[dataKey] as number;
          const height = Math.max(
            5,
            ((value - min) / range) * 100,
          );
          const isNegative = value < 0;

          return (
            <div
              key={index}
              className="flex-1 flex flex-col items-center gap-1"
              title={`${item.period}: ¥${value.toLocaleString()}`}
            >
              <div
                className={`w-full rounded-t-sm transition-all ${
                  isNegative ? "bg-red-400" : color
                }`}
                style={{ height: `${height}%` }}
              />
              <span className="text-xs text-text-muted truncate w-full text-center">
                {item.period.slice(5)}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  // 指标卡片组件
  function MetricCard({
    title,
    value,
    unit = "¥",
    trend,
    trendValue,
    color = "zinc",
  }: {
    title: string;
    value: number;
    unit?: string;
    trend?: "up" | "down" | "neutral";
    trendValue?: string;
    color?: "green" | "red" | "blue" | "zinc";
  }) {
    const colorClasses = {
      green: "bg-green-50 border-green-100",
      red: "bg-red-50 border-red-100",
      blue: "bg-blue-50 border-blue-100",
      zinc: "bg-bg-secondary border-border-secondary",
    };

    const valueColorClasses = {
      green: "text-green-700",
      red: "text-red-700",
      blue: "text-blue-700",
      zinc: "text-text-secondary",
    };

    return (
      <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
        <p className="text-sm text-text-tertiary mb-1">{title}</p>
        <p className={`text-xl font-semibold ${valueColorClasses[color]}`}>
          {unit === "¥" ? "¥" : ""}
          {value.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          {unit === "%" ? "%" : ""}
        </p>
        {trend && trendValue && (
          <p
            className={`text-xs mt-1 ${
              trend === "up"
                ? "text-green-600"
                : trend === "down"
                  ? "text-red-600"
                  : "text-text-tertiary"
            }`}
          >
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendValue}
          </p>
        )}
      </div>
    );
  }

  const isLoading = currentQuery.isLoading || trendQuery.isLoading;
  const isError = currentQuery.isError || trendQuery.isError;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text-primary">利润分析</h1>
        <div className="flex items-center gap-2">
          <select
            className={selectCls}
            value={period}
            onChange={(e) => setPeriod(e.target.value as typeof period)}
          >
            <option value="month">按月</option>
            <option value="quarter">按季</option>
            <option value="year">按年</option>
          </select>
          <input
            type="month"
            className="text-sm rounded-md border border-border-primary bg-bg-tertiary px-2 py-1 text-text-primary [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:hover:opacity-100"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      {isError ? (
        <ApiErrorCallout
          error={currentQuery.error || trendQuery.error}
          title="加载数据失败"
          onRetry={() => {
            currentQuery.refetch();
            trendQuery.refetch();
          }}
          retrying={currentQuery.isFetching || trendQuery.isFetching}
        />
      ) : isLoading ? (
        <div className="py-8 text-center text-text-tertiary">加载中...</div>
      ) : metrics ? (
        <>
          {/* 核心指标 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              title="营业收入"
              value={metrics.revenue}
              trend={trendAnalysis?.revenue.percent && trendAnalysis.revenue.percent > 0 ? "up" : "down"}
              trendValue={
                trendAnalysis
                  ? `${trendAnalysis.revenue.percent >= 0 ? "+" : ""}${trendAnalysis.revenue.percent.toFixed(1)}% 环比`
                  : undefined
              }
              color="blue"
            />
            <MetricCard
              title="毛利润"
              value={metrics.grossProfit}
              trend={
                trendAnalysis?.grossProfit.percent && trendAnalysis.grossProfit.percent > 0
                  ? "up"
                  : "down"
              }
              trendValue={
                trendAnalysis
                  ? `${trendAnalysis.grossProfit.percent >= 0 ? "+" : ""}${trendAnalysis.grossProfit.percent.toFixed(1)}% 环比`
                  : undefined
              }
              color="green"
            />
            <MetricCard
              title="净利润"
              value={metrics.netProfit}
              trend={
                trendAnalysis?.netProfit.percent && trendAnalysis.netProfit.percent > 0
                  ? "up"
                  : "down"
              }
              trendValue={
                trendAnalysis
                  ? `${trendAnalysis.netProfit.percent >= 0 ? "+" : ""}${trendAnalysis.netProfit.percent.toFixed(1)}% 环比`
                  : undefined
              }
              color={metrics.netProfit >= 0 ? "green" : "red"}
            />
            <MetricCard
              title="净利率"
              value={metrics.netProfitRate}
              unit="%"
              trendValue={
                trendAnalysis
                  ? `平均 ${trendAnalysis.avgNetProfitRate.toFixed(1)}%`
                  : undefined
              }
              color="zinc"
            />
          </div>

          {/* 利润构成 */}
          <Card className="p-4">
            <h3 className="text-sm font-medium text-text-primary mb-4">利润构成分析</h3>
            <div className="space-y-4">
              {/* 收入 */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-text-secondary">营业收入</span>
                  <span className="font-medium">
                    ¥{metrics.revenue.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: "100%" }} />
                </div>
              </div>

              {/* 成本 */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-text-secondary">营业成本</span>
                  <span className="font-medium">
                    ¥{metrics.costs.toLocaleString()}
                    <span className="text-text-muted text-xs ml-1">
                      ({metrics.costRate.toFixed(1)}%)
                    </span>
                  </span>
                </div>
                <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-400 rounded-full"
                    style={{ width: `${metrics.costRate}%` }}
                  />
                </div>
              </div>

              {/* 费用 */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-text-secondary">期间费用</span>
                  <span className="font-medium">
                    ¥{metrics.expenses.toLocaleString()}
                    <span className="text-text-muted text-xs ml-1">
                      ({metrics.expenseRate.toFixed(1)}%)
                    </span>
                  </span>
                </div>
                <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full"
                    style={{ width: `${metrics.expenseRate}%` }}
                  />
                </div>
              </div>

              {/* 净利润 */}
              <div className="pt-2 border-t border-border-secondary">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-text-primary">净利润</span>
                  <span
                    className={`font-semibold ${
                      metrics.netProfit >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    ¥{metrics.netProfit.toLocaleString()}
                    <span className="text-text-muted text-xs ml-1">
                      ({metrics.netProfitRate.toFixed(1)}%)
                    </span>
                  </span>
                </div>
                <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      metrics.netProfit >= 0 ? "bg-green-500" : "bg-red-500"
                    }`}
                    style={{
                      width: `${Math.min(Math.abs(metrics.netProfitRate) * 2, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* 趋势分析 */}
          {trendQuery.data && trendQuery.data.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-text-primary">利润趋势</h3>
                <div className="flex gap-1">
                  {(["3m", "6m", "12m"] as const).map((range) => (
                    <Button
                      key={range}
                      variant={trendRange === range ? "primary" : "secondary"}
                      size="sm"
                      onClick={() => setTrendRange(range)}
                    >
                      {range === "3m" ? "近3月" : range === "6m" ? "近6月" : "近1年"}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-sm text-text-tertiary mb-2">营业收入趋势</p>
                  <SimpleTrendChart
                    data={trendQuery.data}
                    dataKey="revenue"
                    color="bg-blue-400"
                  />
                </div>

                <div>
                  <p className="text-sm text-text-tertiary mb-2">净利润趋势</p>
                  <SimpleTrendChart
                    data={trendQuery.data}
                    dataKey="netProfit"
                    color="bg-green-400"
                  />
                </div>
              </div>
            </Card>
          )}

          {/* 关键洞察 */}
          <Card className="p-4">
            <h3 className="text-sm font-medium text-text-primary mb-3">智能洞察</h3>
            <div className="space-y-2 text-sm">
              {metrics.netProfitRate > 20 ? (
                <p className="text-green-600">
                  ✅ 净利率表现优秀（{metrics.netProfitRate.toFixed(1)}%），高于行业平均水平
                </p>
              ) : metrics.netProfitRate > 10 ? (
                <p className="text-blue-600">
                  ℹ️ 净利率良好（{metrics.netProfitRate.toFixed(1)}%），有进一步提升空间
                </p>
              ) : metrics.netProfitRate > 0 ? (
                <p className="text-orange-600">
                  ⚠️ 净利率较低（{metrics.netProfitRate.toFixed(1)}%），建议优化成本结构
                </p>
              ) : (
                <p className="text-red-600">
                  ❌ 当前处于亏损状态，建议立即审查成本和费用支出
                </p>
              )}

              {metrics.grossProfitRate > 40 ? (
                <p className="text-green-600">
                  ✅ 毛利率健康（{metrics.grossProfitRate.toFixed(1)}%），产品定价合理
                </p>
              ) : metrics.grossProfitRate < 20 ? (
                <p className="text-orange-600">
                  ⚠️ 毛利率偏低（{metrics.grossProfitRate.toFixed(1)}%），建议优化采购成本或调整定价
                </p>
              ) : null}

              {metrics.expenseRate > 20 ? (
                <p className="text-orange-600">
                  ⚠️ 费用率较高（{metrics.expenseRate.toFixed(1)}%），建议控制期间费用
                </p>
              ) : (
                <p className="text-green-600">
                  ✅ 费用控制良好（{metrics.expenseRate.toFixed(1)}%）
                </p>
              )}

              {trendAnalysis && trendAnalysis.netProfit.percent < -10 && (
                <p className="text-red-600">
                  ❌ 净利润环比下降 {Math.abs(trendAnalysis.netProfit.percent).toFixed(1)}%，需要关注经营风险
                </p>
              )}
            </div>
          </Card>
        </>
      ) : (
        <div className="py-12 text-center">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-text-tertiary">暂无数据，请先录入财务凭证</p>
        </div>
      )}
    </div>
  );
}
