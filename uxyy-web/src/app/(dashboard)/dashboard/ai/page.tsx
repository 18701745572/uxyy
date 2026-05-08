"use client";

import { useState } from "react";
import { AiPanel } from "./ai-panel";
import { ChurnPredictionPanel } from "./churn-prediction-panel";
import { OpportunityPredictionPanel } from "./opportunity-prediction-panel";
import {
  Bot,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";

type TabType = "tasks" | "churn" | "opportunity";

const tabs: Array<{
  id: TabType;
  label: string;
  icon: typeof Bot;
  description: string;
}> = [
  {
    id: "tasks",
    label: "AI 任务",
    icon: Bot,
    description: "发票OCR识别、会计分录建议、智能分类",
  },
  {
    id: "churn",
    label: "客户流失预警",
    icon: AlertTriangle,
    description: "预测客户流失风险，提供挽留策略",
  },
  {
    id: "opportunity",
    label: "商机成单预测",
    icon: TrendingUp,
    description: "预测商机成单概率，优化销售策略",
  },
];

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
      className={`flex flex-col items-start p-4 rounded-lg border text-left transition-all ${
        isActive
          ? "border-zinc-900 bg-zinc-50 shadow-sm"
          : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50"
      }`}
    >
      <div className="flex items-center gap-3 mb-1">
        <div
          className={`p-2 rounded-lg ${
            isActive ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600"
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <span className="font-medium text-zinc-900">{tab.label}</span>
      </div>
      <p className="text-sm text-zinc-500">{tab.description}</p>
    </button>
  );
}

export default function AiPage() {
  const [activeTab, setActiveTab] = useState<TabType>("tasks");

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">AI 智能</h1>
        <p className="text-sm text-zinc-500 mt-1">
          智能识别、数据预测、自动化处理
        </p>
      </div>

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

      {activeTab === "tasks" && <AiPanel />}
      {activeTab === "churn" && <ChurnPredictionPanel />}
      {activeTab === "opportunity" && <OpportunityPredictionPanel />}
    </div>
  );
}