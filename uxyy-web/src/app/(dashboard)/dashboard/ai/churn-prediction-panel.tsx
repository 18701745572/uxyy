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
import { Badge } from "@/components/ui/badge";
import {
  Warning,
  TrendDown,
  Users,
  ArrowsClockwise,
  Funnel,
  Phone,
  Calendar,
  CurrencyCircleDollar,
  ShoppingCart,
  ChartLineUp,
  SealWarning,
  SealCheck,
  Info,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type ChurnRiskLevel = ChurnPrediction["churnRisk"];

const riskLevelConfig: Record<
  ChurnRiskLevel,
  { label: string; color: string; icon: typeof Warning; gradient: string; glowColor: string }
> = {
  high: {
    label: "高风险",
    color: "bg-red-500/10 text-red-400 border-red-500/20",
    icon: SealWarning,
    gradient: "from-red-500 to-red-600",
    glowColor: "shadow-red-500/20",
  },
  medium: {
    label: "中风险",
    color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    icon: TrendDown,
    gradient: "from-yellow-500 to-yellow-600",
    glowColor: "shadow-yellow-500/20",
  },
  low: {
    label: "低风险",
    color: "bg-green-500/10 text-green-400 border-green-500/20",
    icon: SealCheck,
    gradient: "from-green-500 to-green-600",
    glowColor: "shadow-green-500/20",
  },
};

function daysSinceDate(isoDate?: string): number | null {
  if (!isoDate) return null;
  const t = Date.parse(isoDate);
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24));
}

function factorBadgeClass(severity: ChurnPrediction["riskFactors"][number]["severity"]) {
  if (severity === "critical") return "bg-red-500/10 text-red-400 border-red-500/20";
  if (severity === "warning") return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
  return "bg-bg-tertiary/50 text-text-secondary border-border-primary/50";
}

function StatsCards({ stats }: { stats: ChurnStats }) {
  const cards = [
    {
      label: "客户总数",
      value: stats.totalCustomers,
      icon: Users,
      color: "text-text-primary",
      bgColor: "bg-bg-tertiary/50",
      iconColor: "text-text-secondary",
    },
    {
      label: "高风险",
      value: stats.highRiskCount,
      icon: SealWarning,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
      iconColor: "text-red-400",
    },
    {
      label: "中风险",
      value: stats.mediumRiskCount,
      icon: TrendDown,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10",
      iconColor: "text-yellow-400",
    },
    {
      label: "低风险",
      value: stats.lowRiskCount,
      icon: SealCheck,
      color: "text-green-400",
      bgColor: "bg-green-500/10",
      iconColor: "text-green-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {cards.map((card, index) => (
        <Card
          key={index}
          className="p-5 bg-bg-secondary/50 border-border-primary/50 hover:border-border-primary transition-all duration-200"
        >
          <div className="flex items-center gap-4">
            <div className={cn("p-3 rounded-xl", card.bgColor)}>
              <card.icon className={cn("w-5 h-5", card.iconColor)} weight="duotone" />
            </div>
            <div>
              <p className="text-xs text-text-tertiary mb-0.5">{card.label}</p>
              <p className={cn("text-2xl font-bold", card.color)}>{card.value}</p>
            </div>
          </div>
        </Card>
      ))}
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
    <Card className="p-5 bg-bg-secondary/50 border-border-primary/50 hover:border-border-primary hover:shadow-lg hover:shadow-black/5 transition-all duration-300 group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2.5 rounded-xl", config.color.split(" ")[0])}>
            <Icon className={cn("w-5 h-5", config.color.split(" ")[1])} weight="duotone" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">{prediction.customerName}</h3>
            <p className="text-xs text-text-tertiary mt-0.5">
              累计订单 {prediction.totalOrders} · 金额 ¥{prediction.totalAmount.toLocaleString()}
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn("text-xs font-medium px-2.5 py-1", config.color)}
        >
          {config.label}
        </Badge>
      </div>

      {/* Progress Bar */}
      <div className="mb-5">
        <div className="flex justify-between items-center text-sm mb-2">
          <span className="text-text-tertiary flex items-center gap-1.5">
            <ChartLineUp className="w-4 h-4" />
            流失概率
          </span>
          <span
            className={cn(
              "font-bold text-lg",
              score >= 60 ? "text-red-400" : score >= 30 ? "text-yellow-400" : "text-green-400"
            )}
          >
            {score}%
          </span>
        </div>
        <div className="w-full bg-bg-tertiary/50 rounded-full h-2.5 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r",
              score >= 60
                ? "from-red-500 to-red-400"
                : score >= 30
                ? "from-yellow-500 to-yellow-400"
                : "from-green-500 to-green-400"
            )}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-bg-tertiary/30 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-text-tertiary mb-1">
            <ShoppingCart className="w-3.5 h-3.5" />
            <span className="text-xs">距最近下单</span>
          </div>
          <p className="font-semibold text-text-primary">
            {daysNoOrder != null ? `${daysNoOrder} 天` : "—"}
          </p>
        </div>
        <div className="bg-bg-tertiary/30 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-text-tertiary mb-1">
            <Phone className="w-3.5 h-3.5" />
            <span className="text-xs">距最近跟进</span>
          </div>
          <p className="font-semibold text-text-primary">
            {daysNoFollowUp != null ? `${daysNoFollowUp} 天` : "—"}
          </p>
        </div>
      </div>

      {/* Risk Factors */}
      {prediction.riskFactors.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-text-tertiary mb-2 flex items-center gap-1.5">
            <Warning className="w-3.5 h-3.5" />
            风险因素
          </p>
          <div className="flex flex-wrap gap-1.5">
            {prediction.riskFactors.map((factor, idx) => (
              <span
                key={idx}
                title={factor.description}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md border font-medium",
                  factorBadgeClass(factor.severity)
                )}
              >
                {factor.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Actions */}
      {prediction.recommendedActions.length > 0 && (
        <div className="bg-gradient-to-r from-accent-blue/5 to-accent-purple/5 rounded-lg p-4 border border-border-primary/50">
          <p className="text-xs text-text-tertiary mb-2 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            挽留建议
          </p>
          <ul className="text-sm text-text-secondary space-y-2">
            {prediction.recommendedActions.map((line, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-blue mt-2 shrink-0" />
                <span className="leading-relaxed">{line}</span>
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary mb-1">客户流失预警</h2>
          <p className="text-sm text-text-tertiary">基于客户行为分析，预测流失风险并提供挽留建议</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Filter Select */}
          <div className="relative">
            <Funnel className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <select
              className="h-10 pl-9 pr-8 text-sm bg-bg-secondary border border-border-primary rounded-lg text-text-primary appearance-none cursor-pointer hover:border-border-secondary focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue transition-all min-w-[140px]"
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
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => {
              statsQuery.refetch();
              predictionsQuery.refetch();
            }}
            className="h-10 px-4 flex items-center justify-center gap-2 bg-bg-secondary border border-border-primary rounded-lg text-sm text-text-primary hover:bg-bg-tertiary hover:border-border-secondary transition-all duration-200"
          >
            <ArrowsClockwise
              className={cn(
                "w-4 h-4",
                (statsQuery.isFetching || predictionsQuery.isFetching) && "animate-spin"
              )}
            />
            刷新
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {statsQuery.isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-5 bg-bg-secondary/50 border-border-primary/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-bg-tertiary/50 animate-pulse" />
                <div className="space-y-2">
                  <div className="w-16 h-3 bg-bg-tertiary/50 rounded animate-pulse" />
                  <div className="w-8 h-6 bg-bg-tertiary/50 rounded animate-pulse" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : statsQuery.data ? (
        <StatsCards stats={statsQuery.data} />
      ) : null}

      {/* Predictions Grid */}
      {predictionsQuery.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-5 bg-bg-secondary/50 border-border-primary/50">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-bg-tertiary/50 animate-pulse" />
                  <div className="space-y-2 flex-1">
                    <div className="w-24 h-4 bg-bg-tertiary/50 rounded animate-pulse" />
                    <div className="w-32 h-3 bg-bg-tertiary/50 rounded animate-pulse" />
                  </div>
                </div>
                <div className="w-full h-2 bg-bg-tertiary/50 rounded-full animate-pulse" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-14 bg-bg-tertiary/50 rounded-lg animate-pulse" />
                  <div className="h-14 bg-bg-tertiary/50 rounded-lg animate-pulse" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : predictionsQuery.error ? (
        <Card className="p-8 text-center bg-bg-secondary/50 border-border-primary/50">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <Warning className="w-8 h-8 text-red-400" weight="duotone" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">加载失败</h3>
          <p className="text-sm text-text-tertiary">
            {predictionsQuery.error instanceof Error
              ? predictionsQuery.error.message
              : "请稍后重试"}
          </p>
        </Card>
      ) : predictionsQuery.data?.length === 0 ? (
        <Card className="p-12 text-center bg-bg-secondary/50 border-border-primary/50">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
            <SealCheck className="w-8 h-8 text-green-400" weight="duotone" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">数据正常</h3>
          <p className="text-sm text-text-tertiary">暂无可疑流失客户，继续保持关注</p>
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
