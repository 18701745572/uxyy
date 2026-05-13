"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { CardSkeleton } from "@/components/ui/card";
import {
  Robot,
  Warning,
  TrendUp,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type TabType = "tasks" | "churn" | "opportunity";

const tabs: Array<{
  id: TabType;
  label: string;
  icon: typeof Robot;
  description: string;
  gradient: string;
}> = [
  {
    id: "tasks",
    label: "AI 任务",
    icon: Robot,
    description: "发票OCR识别、会计分录建议、智能分类",
    gradient: "from-accent-blue/20 to-accent-purple/20",
  },
  {
    id: "churn",
    label: "客户流失预警",
    icon: Warning,
    description: "预测客户流失风险，提供挽留策略",
    gradient: "from-warning/20 to-error/20",
  },
  {
    id: "opportunity",
    label: "商机成单预测",
    icon: TrendUp,
    description: "预测商机成单概率，优化销售策略",
    gradient: "from-success/20 to-accent-blue/20",
  },
];

// 动态导入面板组件
const AiPanel = dynamic(
  () => import("./ai-panel").then((mod) => ({ default: mod.AiPanel })),
  {
    loading: () => <CardSkeleton className="h-96" />,
  }
);

const ChurnPredictionPanel = dynamic(
  () => import("./churn-prediction-panel").then((mod) => ({ default: mod.ChurnPredictionPanel })),
  {
    loading: () => <CardSkeleton className="h-96" />,
  }
);

const OpportunityPredictionPanel = dynamic(
  () => import("./opportunity-prediction-panel").then((mod) => ({ default: mod.OpportunityPredictionPanel })),
  {
    loading: () => <CardSkeleton className="h-96" />,
  }
);

function TabCard({
  tab,
  isActive,
  onClick,
}: {
  tab: (typeof tabs)[0];
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = tab.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-start p-4 rounded-xl border text-left transition-all duration-200",
        isActive
          ? "border-accent-blue/50 bg-accent-blue/10 shadow-glow"
          : "border-border-primary bg-bg-secondary hover:border-border-secondary hover:bg-bg-tertiary"
      )}
    >
      <div className="flex items-center gap-3 mb-2">
        <div
          className={cn(
            "p-2 rounded-lg transition-colors",
            isActive
              ? "bg-gradient-to-br from-accent-blue to-accent-purple text-white"
              : "bg-bg-tertiary text-text-secondary"
          )}
        >
          <Icon className="w-5 h-5" weight="regular" />
        </div>
        <span className={cn(
          "font-medium",
          isActive ? "text-text-primary" : "text-text-secondary"
        )}>
          {tab.label}
        </span>
      </div>
      <p className="text-sm text-text-muted">{tab.description}</p>
    </button>
  );
}

/**
 * AI 智能页面 - 深色主题
 * 优化：Tab 面板动态导入，减少首屏加载体积
 */
export default function AiPage() {
  const [activeTab, setActiveTab] = useState<TabType>("tasks");

  return (
    <div className="flex flex-col gap-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-xl font-bold text-text-primary">AI 智能</h1>
        <p className="text-sm text-text-secondary mt-1">
          智能识别、数据预测、自动化处理
        </p>
      </div>

      {/* 选项卡 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tabs.map((tab) => (
          <TabCard
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          />
        ))}
      </div>

      {/* 内容面板 - 动态加载 */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeTab === "tasks" && <AiPanel />}
        {activeTab === "churn" && <ChurnPredictionPanel />}
        {activeTab === "opportunity" && <OpportunityPredictionPanel />}
      </div>
    </div>
  );
}
