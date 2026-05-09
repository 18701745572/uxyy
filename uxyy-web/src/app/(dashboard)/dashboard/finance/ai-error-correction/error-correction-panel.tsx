"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  detectVoucherErrors,
  batchDetectErrors,
  getCorrectionSuggestions,
  autoFixBalance,
  getFinancialHealthReport,
  type ErrorDetectionResult,
  type CorrectionSuggestion,
} from "@/lib/api/ai-error-correction";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

function getErrorTypeColor(type: ErrorDetectionResult["type"]): string {
  switch (type) {
    case "error":
      return "bg-red-50 text-red-700 border-red-200";
    case "warning":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "info":
      return "bg-blue-50 text-blue-700 border-blue-200";
    default:
      return "bg-zinc-50 text-zinc-700 border-zinc-200";
  }
}

function getErrorTypeBadge(type: ErrorDetectionResult["type"]): string {
  switch (type) {
    case "error":
      return "bg-red-100 text-red-700";
    case "warning":
      return "bg-amber-100 text-amber-700";
    case "info":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-zinc-100 text-zinc-700";
  }
}

function getErrorTypeName(type: ErrorDetectionResult["type"]): string {
  switch (type) {
    case "error":
      return "错误";
    case "warning":
      return "警告";
    case "info":
      return "提示";
    default:
      return "未知";
  }
}

function getPriorityColor(priority: CorrectionSuggestion["priority"]): string {
  switch (priority) {
    case "high":
      return "text-red-600 bg-red-50";
    case "medium":
      return "text-amber-600 bg-amber-50";
    case "low":
      return "text-blue-600 bg-blue-50";
    default:
      return "text-zinc-600 bg-zinc-50";
  }
}

function getPriorityName(priority: CorrectionSuggestion["priority"]): string {
  switch (priority) {
    case "high":
      return "高";
    case "medium":
      return "中";
    case "low":
      return "低";
    default:
      return "未知";
  }
}

export function ErrorCorrectionPanel() {
  const [activeTab, setActiveTab] = useState<
    "single-check" | "batch-check" | "health-report"
  >("single-check");
  const [voucherId, setVoucherId] = useState("");
  const [selectedVoucherId, setSelectedVoucherId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  // 单个凭证检测
  const singleCheckQuery = useQuery({
    queryKey: ["ai-error-correction", "single", voucherId],
    queryFn: () => detectVoucherErrors(parseInt(voucherId)),
    enabled: voucherId !== "" && !isNaN(parseInt(voucherId)),
    retry: 1,
  });

  // 批量检测
  const batchCheckQuery = useQuery({
    queryKey: ["ai-error-correction", "batch"],
    queryFn: () => batchDetectErrors(),
    enabled: activeTab === "batch-check",
    retry: 1,
  });

  // 纠错建议
  const suggestionsQuery = useQuery({
    queryKey: ["ai-error-correction", "suggestions", selectedVoucherId],
    queryFn: () => getCorrectionSuggestions(selectedVoucherId!),
    enabled: selectedVoucherId !== null,
    retry: 1,
  });

  // 财务健康度报告
  const healthReportQuery = useQuery({
    queryKey: ["ai-error-correction", "health-report"],
    queryFn: () => getFinancialHealthReport(),
    enabled: activeTab === "health-report",
    retry: 1,
  });

  // 自动修复
  const autoFixMutation = useMutation({
    mutationFn: (id: number) => autoFixBalance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ai-error-correction"],
      });
    },
  });

  const tabs = [
    { id: "single-check", label: "单个检测" },
    { id: "batch-check", label: "批量检测" },
    { id: "health-report", label: "健康报告" },
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-zinc-900">AI智能纠错</h1>
        <p className="text-sm text-zinc-600">系统自动检测凭证错误，提供修复建议</p>
      </div>

      {/* 标签页切换 */}
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <Button
              key={tab.id}
              variant={activeTab === tab.id ? "primary" : "secondary"}
              onClick={() => setActiveTab(tab.id)}
            >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* 单个凭证检测 */}
      {activeTab === "single-check" && (
        <div className="flex flex-col gap-4">
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="number"
                placeholder="输入凭证ID"
                value={voucherId}
                onChange={(e) => setVoucherId(e.target.value)}
                className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
              />
              <Button onClick={() => singleCheckQuery.refetch()}>
                开始检测
              </Button>
            </div>
          </Card>

          {singleCheckQuery.isLoading && (
            <Card className="p-8 text-center">
              <Spinner className="mx-auto mb-2" />
              <p className="text-sm text-zinc-600">正在检测凭证...</p>
            </Card>
          )}

          {singleCheckQuery.isError && (
            <Card className="p-4 bg-red-50 border-red-200">
              <p className="text-sm text-red-700">
                检测失败：{(singleCheckQuery.error as Error).message}
              </p>
            </Card>
          )}

          {singleCheckQuery.data && (
            <Card className="p-4">
              {singleCheckQuery.data.length === 0 ? (
                <p className="text-sm text-green-700">✓ 该凭证未检测到错误</p>
              ) : (
                <>
                  <p className="text-sm text-zinc-700 mb-4">
                    检测到 {singleCheckQuery.data.length} 个问题：
                  </p>
                  <div className="space-y-3">
                    {singleCheckQuery.data.map((error, index) => (
                      <div
                        key={index}
                        className={`rounded-lg border p-4 ${getErrorTypeColor(error.type)}`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getErrorTypeBadge(error.type)}>
                            {getErrorTypeName(error.type)}
                          </Badge>
                          <span className="text-xs text-zinc-500">{error.category}</span>
                        </div>
                        <h3 className="font-medium text-sm mb-1">{error.title}</h3>
                        <p className="text-xs text-zinc-600 mb-2">{error.description}</p>
                        <p className="text-xs">
                          <span className="text-zinc-500">建议：</span>
                          {error.suggestion}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          )}
        </div>
      )}

      {/* 批量检测 */}
      {activeTab === "batch-check" && (
        <div className="flex flex-col gap-4">
          <Button onClick={() => batchCheckQuery.refetch()}>
            重新检测全部凭证
          </Button>

          {batchCheckQuery.isLoading && (
            <Card className="p-8 text-center">
              <Spinner className="mx-auto mb-2" />
              <p className="text-sm text-zinc-600">正在批量检测凭证...</p>
            </Card>
          )}

          {batchCheckQuery.isError && (
            <Card className="p-4 bg-red-50 border-red-200">
              <p className="text-sm text-red-700">
                检测失败：{(batchCheckQuery.error as Error).message}
              </p>
            </Card>
          )}

          {batchCheckQuery.data && (
            <>
              <Card className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-zinc-900">
                      {batchCheckQuery.data.totalChecked}
                    </p>
                    <p className="text-xs text-zinc-600">检测凭证数</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">
                      {batchCheckQuery.data.errorVouchers}
                    </p>
                    <p className="text-xs text-zinc-600">异常凭证数</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-zinc-900">
                      {batchCheckQuery.data.details.reduce((sum, d) => sum + d.errorCount, 0)}
                    </p>
                    <p className="text-xs text-zinc-600">问题总数</p>
                  </div>
                  <div className="text-center">
                    <p
                      className={`text-2xl font-bold ${
                        batchCheckQuery.data.errorVouchers === 0
                          ? "text-green-600"
                          : "text-amber-600"
                      }`}
                    >
                      {((batchCheckQuery.data.errorVouchers / batchCheckQuery.data.totalChecked) * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-zinc-600">异常率</p>
                  </div>
                </div>
              </Card>

              <Card className="p-0 overflow-hidden">
                <div className="px-4 py-3 text-sm text-zinc-600 border-b border-zinc-100">
                  异常凭证列表
                </div>
                {batchCheckQuery.data.details.length === 0 ? (
                  <p className="p-8 text-center text-sm text-zinc-500">暂无异常凭证</p>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {batchCheckQuery.data.details.map((detail) => (
                      <div key={detail.voucherId} className="px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-zinc-900">
                              {detail.voucherNo}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {detail.errorCount} 个问题
                            </Badge>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedVoucherId(detail.voucherId);
                              setActiveTab("single-check");
                              setVoucherId(String(detail.voucherId));
                            }}
                          >
                            查看详情
                          </Button>
                        </div>
                        <div className="text-xs text-zinc-500 mb-2">
                          日期：{detail.voucherDate.slice(0, 10)} | 金额：¥{detail.totalAmount}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {detail.errors.slice(0, 3).map((error, idx) => (
                            <span
                              key={idx}
                              className={`text-xs px-2 py-0.5 rounded ${getErrorTypeBadge(error.type)}`}
                            >
                              {error.title}
                            </span>
                          ))}
                          {detail.errors.length > 3 && (
                            <span className="text-xs text-zinc-500 px-2 py-0.5">
                              +{detail.errors.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      )}

      {/* 财务健康度报告 */}
      {activeTab === "health-report" && (
        <div className="flex flex-col gap-4">
          <Button onClick={() => healthReportQuery.refetch()}>
            刷新报告
          </Button>

          {healthReportQuery.isLoading && (
            <Card className="p-8 text-center">
              <Spinner className="mx-auto mb-2" />
              <p className="text-sm text-zinc-600">正在生成报告...</p>
            </Card>
          )}

          {healthReportQuery.isError && (
            <Card className="p-4 bg-red-50 border-red-200">
              <p className="text-sm text-red-700">
                生成失败：{(healthReportQuery.error as Error).message}
              </p>
            </Card>
          )}

          {healthReportQuery.data && (
            <>
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-zinc-900">
                    财务健康度报告
                  </h2>
                  <span className="text-sm text-zinc-500">
                    {healthReportQuery.data.period}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-zinc-50 rounded-lg">
                    <p className="text-2xl font-bold text-zinc-900">
                      {healthReportQuery.data.summary.totalVouchers}
                    </p>
                    <p className="text-xs text-zinc-600">凭证总数</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">
                      {healthReportQuery.data.summary.errorVouchers}
                    </p>
                    <p className="text-xs text-red-600">异常凭证</p>
                  </div>
                  <div className="text-center p-4 bg-amber-50 rounded-lg">
                    <p className="text-2xl font-bold text-amber-600">
                      {healthReportQuery.data.summary.errorRate}
                    </p>
                    <p className="text-xs text-amber-600">异常率</p>
                  </div>
                  <div className="text-center p-4 rounded-lg"
                    style={{
                      backgroundColor: healthReportQuery.data.summary.healthLevel === '优秀' ? '#dcfce7' : 
                        healthReportQuery.data.summary.healthLevel === '良好' ? '#fef3c7' : '#fecaca'
                    }}
                  >
                    <p className="text-2xl font-bold"
                      style={{
                        color: healthReportQuery.data.summary.healthLevel === '优秀' ? '#16a34a' : 
                          healthReportQuery.data.summary.healthLevel === '良好' ? '#d97706' : '#dc2626'
                      }}
                    >
                      {healthReportQuery.data.summary.healthLevel}
                    </p>
                    <p className="text-xs text-zinc-600">健康等级</p>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-medium text-zinc-900 mb-3">
                    问题分类统计
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(healthReportQuery.data.errorCategories).map(
                      ([category, count]) => (
                        <div key={category} className="flex items-center gap-3">
                          <span className="text-xs text-zinc-600 w-24 truncate">
                            {category}
                          </span>
                          <div className="flex-1 h-2 bg-zinc-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 transition-all"
                              style={{
                                width: `${(count / Math.max(...Object.values(healthReportQuery.data.errorCategories))) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-zinc-600 w-8 text-right">
                            {count}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-zinc-900 mb-3">
                    主要问题 TOP5
                  </h3>
                  <ul className="space-y-2">
                    {healthReportQuery.data.topIssues.map(([issue, count], index) => (
                      <li
                        key={index}
                        className="flex items-center gap-2 text-sm text-zinc-700"
                      >
                        <span className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center text-xs">
                          {index + 1}
                        </span>
                        <span className="flex-1">{issue}</span>
                        <span className="text-zinc-500">{count} 次</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* 纠错建议弹窗 */}
      {selectedVoucherId && suggestionsQuery.data && suggestionsQuery.data.length > 0 && (
        <Card className="p-4 bg-amber-50 border-amber-200">
          <h3 className="font-medium text-amber-900 mb-3">
            凭证 #{selectedVoucherId} 的纠错建议
          </h3>
          <div className="space-y-2 mb-4">
            {suggestionsQuery.data.map((suggestion, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-3 bg-white rounded-lg border"
              >
                <Badge className={getPriorityColor(suggestion.priority)}>
                  {getPriorityName(suggestion.priority)}
                </Badge>
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-900">{suggestion.error}</p>
                  <p className="text-xs text-zinc-600">{suggestion.action}</p>
                </div>
                {suggestion.autoFixable && (
                  <Button
                    size="sm"
                    onClick={() => {
                      autoFixMutation.mutate(selectedVoucherId);
                    }}
                    disabled={autoFixMutation.status === 'pending'}
                  >
                    {autoFixMutation.status === 'pending' ? (
                      <>
                        <Spinner className="w-3 h-3 mr-1" />
                        修复中
                      </>
                    ) : (
                      "一键修复"
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
          {autoFixMutation.isSuccess && (
            <p className="text-sm text-green-700">
              ✓ {autoFixMutation.data?.message}
            </p>
          )}
        </Card>
      )}
    </div>
  );
}