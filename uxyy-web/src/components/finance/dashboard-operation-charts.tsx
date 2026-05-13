"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardData } from "@/lib/api/reports";
import { Card } from "@/components/ui/card";

function parseAmount(s: string): number {
  const n = parseFloat(String(s).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

const SALES_COLOR = "#18181b";
const PURCHASE_COLOR = "#a1a1aa";
const PRODUCT_COLORS = [
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#f97316",
];

function formatCurrencyTooltip(value: number) {
  return `¥${value.toLocaleString("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/** 经营仪表盘：销售/采购对比 + 热销商品 TOP（基于 `fetchDashboard`） */
export function DashboardOperationCharts({ data }: { data: DashboardData }) {
  const compare = [
    { name: "销售金额", 金额: parseAmount(data.salesAmount), fill: SALES_COLOR },
    { name: "采购金额", 金额: parseAmount(data.purchaseAmount), fill: PURCHASE_COLOR },
  ];

  const topBar =
    data.topSalesProducts?.slice(0, 8).map((p, i) => ({
      name:
        p.productName.length > 14
          ? `${p.productName.slice(0, 14)}…`
          : p.productName,
      fullName: p.productName,
      销售额: parseAmount(p.salesAmount),
      fill: PRODUCT_COLORS[i % PRODUCT_COLORS.length],
    })) ?? [];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="p-4 border-border-secondary">
        <h3 className="text-sm font-medium text-text-primary">销售 vs 采购</h3>
        <p className="mt-0.5 text-xs text-text-tertiary">
          当前筛选周期内订单金额合计，用于快速对比进销规模
        </p>
        <div className="mt-4 h-56 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={compare} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#71717a" />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="#71717a"
                tickFormatter={(v) =>
                  v >= 1e4 ? `${(v / 1e4).toFixed(1)}万` : String(v)
                }
              />
              <Tooltip
                formatter={(value) => {
                  const n =
                    typeof value === "number"
                      ? value
                      : parseFloat(String(value ?? ""));
                  return [
                    formatCurrencyTooltip(Number.isFinite(n) ? n : 0),
                    "",
                  ];
                }}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid #e4e4e7",
                }}
              />
              <Bar dataKey="金额" radius={[6, 6, 0, 0]}>
                {compare.map((_, index) => (
                  <Cell key={index} fill={compare[index].fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-4 border-border-secondary">
        <h3 className="text-sm font-medium text-text-primary">热销商品（销售额）</h3>
        <p className="mt-0.5 text-xs text-text-tertiary">
          同周期内按明细汇总；无数据时多为本期无销售或未匹配商品
        </p>
        {topBar.length === 0 ? (
          <p className="mt-8 text-sm text-text-tertiary">本期暂无热销排行数据</p>
        ) : (
          <div className="mt-4 h-56 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topBar}
                layout="vertical"
                margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  stroke="#71717a"
                  tickFormatter={(v) =>
                    v >= 1e4 ? `${(v / 1e4).toFixed(1)}万` : String(v)
                  }
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={88}
                  tick={{ fontSize: 10 }}
                  stroke="#71717a"
                />
                <Tooltip
                  formatter={(value) => {
                    const n =
                      typeof value === "number"
                        ? value
                        : parseFloat(String(value ?? ""));
                    return [
                      formatCurrencyTooltip(Number.isFinite(n) ? n : 0),
                      "销售额",
                    ];
                  }}
                  labelFormatter={(_, payload) =>
                    (payload?.[0] as { payload?: { fullName?: string } } | undefined)?.payload
                      ?.fullName ?? ""
                  }
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid #e4e4e7",
                  }}
                />
                <Bar dataKey="销售额" radius={[0, 6, 6, 0]}>
                  {topBar.map((e, i) => (
                    <Cell key={i} fill={e.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}
