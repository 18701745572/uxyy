"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  batchPredictChurn,
  getChurnRiskStats,
  type ChurnPrediction,
  type ChurnStats,
} from "@/lib/api/ai";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, Users, RefreshCw } from "lucide-react";

type ChurnRiskLevel = ChurnPrediction["churnRisk"];

const riskLevelConfig: Record<
  ChurnRiskLevel,
  { label: string; color: string; icon: typeof AlertTriangle }
> = {
  high: {
    label: "高风险",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: AlertTriangle,
  },
  medium: {
    label: "中风险",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: TrendingDown,
  },
  low: {
    label: "低风险",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: Users,
  },
};

function daysSinceDate(isoDate?: string): number | null {
  if (!isoDate) return null;
  const t = Date.parse(isoDate);
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24));
}

function factorBadgeClass(severity: ChurnPrediction["riskFactors"][number]["severity"]) {
  if (severity === "critical") return "bg-red-50 text-red-800";
  if (severity === "warning") return "bg-amber-50 text-amber-800";
  return "bg-zinc-100 text-zinc-700";
}

function StatsCards({ stats }: { stats: ChurnStats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-100 rounded-lg">
            <Users className="w-5 h-5 text-zinc-600" />
          </div>
          <div>
            <p className="text-xs text-zinc-500">客户总数</p>
            <p className="text-xl font-semibold">{stats.totalCustomers}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-xs text-zinc-500">高风险</p>
            <p className="text-xl font-semibold text-red-600">{stats.highRiskCount}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-100 rounded-lg">
            <TrendingDown className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <p className="text-xs text-zinc-500">中风险</p>
            <p className="text-xl font-semibold text-yellow-600">{stats.mediumRiskCount}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Users className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-zinc-500">低风险</p>
            <p className="text-xl font-semibold text-green-600">{stats.lowRiskCount}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ChurnRiskCard({ prediction }: { prediction: ChurnPrediction }) {
  const config = riskLevelConfig[prediction.churnRisk];
  const Icon = config.icon;
  const score = prediction.churnProbability;
  const daysNoOrder = daysSinceDate(prediction.lastOrderDate);
  const daysNoFollowUp = daysSinceDate(prediction.lastFollowUpDate);

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${config.color.split(" ")[0]}`}>
            <Icon className={`w-5 h-5 ${config.color.split(" ")[0].replace("bg-", "text-").replace("-100", "-600")}`} />
          </div>
          <div>
            <h3 className="font-medium text-zinc-900">{prediction.customerName}</h3>
            <p className="text-xs text-zinc-500">
              累计订单 {prediction.totalOrders} · 金额 ¥{prediction.totalAmount}
            </p>
          </div>
        </div>
        <Badge className={config.color}>{config.label}</Badge>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">流失概率</span>
          <span className={`font-medium ${
            score >= 60 ? "text-red-600" :
            score >= 30 ? "text-yellow-600" : "text-green-600"
          }`}>
            {score}%
          </span>
        </div>
        <div className="w-full bg-zinc-100 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${
              score >= 60 ? "bg-red-500" :
              score >= 30 ? "bg-yellow-500" : "bg-green-500"
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs mb-4">
        <div>
          <p className="text-zinc-500">距最近下单</p>
          <p className="font-medium">{daysNoOrder != null ? `${daysNoOrder} 天` : "—"}</p>
        </div>
        <div>
          <p className="text-zinc-500">距最近跟进</p>
          <p className="font-medium">{daysNoFollowUp != null ? `${daysNoFollowUp} 天` : "—"}</p>
        </div>
      </div>

      {prediction.riskFactors.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-zinc-500 mb-1">风险因素</p>
          <div className="flex flex-wrap gap-1">
            {prediction.riskFactors.map((factor, idx) => (
              <span
                key={idx}
                title={factor.description}
                className={`px-2 py-0.5 text-xs rounded ${factorBadgeClass(factor.severity)}`}
              >
                {factor.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {prediction.recommendedActions.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500 mb-1">挽留建议</p>
          <ul className="text-xs text-zinc-700 space-y-1">
            {prediction.recommendedActions.map((line, idx) => (
              <li key={idx} className="flex items-start gap-1">
                <span className="text-green-600 shrink-0">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

export function ChurnPredictionPanel() {
  const [riskFilter, setRiskFilter] = useState<"high" | "medium" | "low" | undefined>(undefined);

  const statsQuery = useQuery({
    queryKey: ["ai", "churn-stats"],
    queryFn: getChurnRiskStats,
  });

  const predictionsQuery = useQuery({
    queryKey: ["ai", "churn-predictions", riskFilter],
    queryFn: () => batchPredictChurn(riskFilter),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">客户流失预警</h2>
          <p className="text-sm text-zinc-500">基于客户行为分析，预测流失风险并提供挽留建议</p>
        </div>
        <div className="flex gap-2">
          <select
            className="px-3 py-1.5 text-sm border border-zinc-300 rounded-md"
            value={riskFilter || ""}
            onChange={(e) => {
              const v = e.target.value;
              setRiskFilter(v === "" ? undefined : (v as "high" | "medium" | "low"));
            }}
          >
            <option value="">全部风险等级</option>
            <option value="high">高风险</option>
            <option value="medium">中风险</option>
            <option value="low">低风险</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              statsQuery.refetch();
              predictionsQuery.refetch();
            }}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            刷新
          </Button>
        </div>
      </div>

      {statsQuery.isLoading ? (
        <Card className="p-8 text-center text-zinc-500">加载中...</Card>
      ) : statsQuery.data ? (
        <StatsCards stats={statsQuery.data} />
      ) : null}

      {predictionsQuery.isLoading ? (
        <Card className="p-8 text-center text-zinc-500">加载中...</Card>
      ) : predictionsQuery.error ? (
        <Card className="p-8 text-center text-red-600">
          {predictionsQuery.error instanceof Error ? predictionsQuery.error.message : "加载失败"}
        </Card>
      ) : predictionsQuery.data?.length === 0 ? (
        <Card className="p-8 text-center text-zinc-500">
          暂无可疑流失客户，数据正常
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {predictionsQuery.data?.map((prediction) => (
            <ChurnRiskCard key={prediction.customerId} prediction={prediction} />
          ))}
        </div>
      )}
    </div>
  );
}