"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  batchPredictOpportunities,
  getSalesFunnelPrediction,
  type OpportunityPrediction,
  type SalesFunnelPrediction,
} from "@/lib/api/ai";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Target,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Minus,
} from "lucide-react";

const riskLevelConfig = {
  high: {
    label: "高风险",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: AlertCircle,
  },
  medium: {
    label: "中风险",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: Minus,
  },
  low: {
    label: "低风险",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle,
  },
};

const stageLabels: Record<string, string> = {
  potential: "潜在客户",
  intention: "有意向",
  quotation: "已报价",
  deal: "已成交",
  after_sales: "售后中",
  lost: "已流失",
};

function parseMoney(s: string | undefined): number {
  const n = parseFloat(s ?? "0");
  return Number.isFinite(n) ? n : 0;
}

function SalesFunnelSection({ data }: { data: SalesFunnelPrediction[] }) {
  const totalPredicted = data.reduce((sum, item) => sum + parseMoney(item.weightedAmount), 0);
  const totalCount = data.reduce((sum, item) => sum + item.opportunityCount, 0);

  return (
    <Card className="p-4 mb-6">
      <h3 className="font-medium text-zinc-900 mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-blue-600" />
        销售漏斗预测
      </h3>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-600 mb-1">预计成交总额</p>
          <p className="text-xl font-semibold text-blue-700">
            ¥{totalPredicted.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="p-3 bg-green-50 rounded-lg">
          <p className="text-xs text-green-600 mb-1">商机总数</p>
          <p className="text-xl font-semibold text-green-700">{totalCount}</p>
        </div>
      </div>

      <div className="space-y-3">
        {data.map((item) => {
          const avgPct = parseFloat(item.avgWinProbability);
          const avgSafe = Number.isFinite(avgPct) ? avgPct : 0;
          const barWidth = Math.min(100, Math.max(avgSafe, 2));
          const weighted = parseMoney(item.weightedAmount);
          return (
            <div key={item.stage} className="flex items-center gap-4">
              <div className="w-24 text-sm text-zinc-600">
                {stageLabels[item.stage] || item.stage}
              </div>
              <div className="flex-1">
                <div className="w-full bg-zinc-100 rounded-full h-6 relative">
                  <div
                    className="h-6 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-end pr-2"
                    style={{ width: `${barWidth}%` }}
                  >
                    <span className="text-xs text-white font-medium">
                      {avgSafe >= 0.01 ? `${avgSafe.toFixed(1)}%` : ""}
                    </span>
                  </div>
                </div>
              </div>
              <div className="w-20 text-right text-sm">
                <span className="font-medium">{item.opportunityCount}</span>
                <span className="text-zinc-400"> 个</span>
              </div>
              <div className="w-32 text-right text-sm text-zinc-600">
                ¥{weighted.toLocaleString("zh-CN", { minimumFractionDigits: 0 })}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function OpportunityCard({ prediction }: { prediction: OpportunityPrediction }) {
  const config = riskLevelConfig[prediction.riskLevel];
  const Icon = config.icon;

  const getProbabilityColor = (prob: number) => {
    if (prob >= 70) return "text-green-600";
    if (prob >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${config.color.split(" ")[0]}`}>
            <Icon className={`w-5 h-5 ${config.color.split(" ")[0].replace("bg-", "text-").replace("-100", "-600")}`} />
          </div>
          <div>
            <h3 className="font-medium text-zinc-900">{prediction.opportunityName}</h3>
            <p className="text-xs text-zinc-500">{prediction.customerName}</p>
          </div>
        </div>
        <Badge className={config.color}>{config.label}</Badge>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-zinc-500">成单概率</span>
          <span className={`font-medium ${getProbabilityColor(prediction.winProbability)}`}>
            {prediction.winProbability}%
          </span>
        </div>
        <div className="w-full bg-zinc-100 rounded-full h-3">
          <div
            className={`h-3 rounded-full ${
              prediction.winProbability >= 70 ? "bg-green-500" :
              prediction.winProbability >= 40 ? "bg-yellow-500" : "bg-red-500"
            }`}
            style={{ width: `${prediction.winProbability}%` }}
          />
        </div>
      </div>

      {prediction.predictionFactors.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-zinc-500 mb-2">影响因素</p>
          <div className="space-y-2">
            {prediction.predictionFactors.slice(0, 3).map((factor, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs">
                <span className={
                  factor.impact === "positive" ? "text-green-500" :
                  factor.impact === "negative" ? "text-red-500" : "text-zinc-400"
                }>
                  {factor.impact === "positive" ? "↑" :
                   factor.impact === "negative" ? "↓" : "—"}
                </span>
                <span className="text-zinc-700">{factor.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {prediction.recommendedActions.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-zinc-500 mb-1">AI建议</p>
          <ul className="text-xs text-zinc-700 space-y-1">
            {prediction.recommendedActions.map((suggestion, idx) => (
              <li key={idx} className="flex items-start gap-1">
                <span className="text-blue-500">•</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {prediction.expectedCloseDate ? (
        <div className="flex items-center gap-2 text-xs text-zinc-500 pt-2 border-t border-zinc-100">
          <Target className="w-4 h-4" />
          预计成交日：{prediction.expectedCloseDate}
        </div>
      ) : null}
    </Card>
  );
}

export function OpportunityPredictionPanel() {
  const [stageFilter, setStageFilter] = useState<string | undefined>(undefined);

  const funnelQuery = useQuery({
    queryKey: ["ai", "sales-funnel"],
    queryFn: getSalesFunnelPrediction,
  });

  const predictionsQuery = useQuery({
    queryKey: ["ai", "opportunity-predictions", stageFilter],
    queryFn: () => batchPredictOpportunities(stageFilter),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">商机成单预测</h2>
          <p className="text-sm text-zinc-500">基于商机信息分析，预测成单概率并提供跟进建议</p>
        </div>
        <div className="flex gap-2">
          <select
            className="px-3 py-1.5 text-sm border border-zinc-300 rounded-md"
            value={stageFilter || ""}
            onChange={(e) => setStageFilter(e.target.value || undefined)}
          >
            <option value="">全部阶段</option>
            <option value="potential">潜在客户</option>
            <option value="intention">有意向</option>
            <option value="quotation">已报价</option>
            <option value="deal">已成交</option>
            <option value="after_sales">售后中</option>
            <option value="lost">已流失</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              funnelQuery.refetch();
              predictionsQuery.refetch();
            }}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            刷新
          </Button>
        </div>
      </div>

      {funnelQuery.isLoading ? (
        <Card className="p-8 text-center text-zinc-500">加载中...</Card>
      ) : funnelQuery.data ? (
        <SalesFunnelSection data={funnelQuery.data} />
      ) : null}

      {predictionsQuery.isLoading ? (
        <Card className="p-8 text-center text-zinc-500">加载中...</Card>
      ) : predictionsQuery.error ? (
        <Card className="p-8 text-center text-red-600">
          {predictionsQuery.error instanceof Error ? predictionsQuery.error.message : "加载失败"}
        </Card>
      ) : predictionsQuery.data?.length === 0 ? (
        <Card className="p-8 text-center text-zinc-500">
          暂无商机数据
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {predictionsQuery.data?.map((prediction) => (
            <OpportunityCard key={prediction.opportunityId} prediction={prediction} />
          ))}
        </div>
      )}
    </div>
  );
}