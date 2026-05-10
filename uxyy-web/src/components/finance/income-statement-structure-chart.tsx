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
import type { IncomeStatementData } from "@/lib/api/reports";
import { Card } from "@/components/ui/card";

function parseAmount(s: string): number {
  const n = parseFloat(String(s).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** 利润表期间结构：收入 / 成本 / 费用 */
export function IncomeStatementStructureChart({
  data,
}: {
  data: IncomeStatementData;
}) {
  const rows = [
    { name: "营业收入", 金额: parseAmount(data.totalRevenue), fill: "#059669" },
    { name: "营业成本", 金额: parseAmount(data.totalCosts), fill: "#d97706" },
    { name: "期间费用", 金额: parseAmount(data.totalExpenses), fill: "#7c3aed" },
  ];

  return (
    <Card className="mb-6 p-4 border-zinc-100">
      <h3 className="text-sm font-medium text-zinc-900">期间结构（汇总）</h3>
      <p className="mt-0.5 text-xs text-zinc-500">
        与下方明细表口径一致，便于快速对齐收、本、费体量
      </p>
      <div className="mt-4 h-52 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
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
                const x = Number.isFinite(n) ? n : 0;
                return [
                  `¥${x.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  "金额",
                ];
              }}
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #e4e4e7",
              }}
            />
            <Bar dataKey="金额" radius={[6, 6, 0, 0]}>
              {rows.map((r) => (
                <Cell key={r.name} fill={r.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
