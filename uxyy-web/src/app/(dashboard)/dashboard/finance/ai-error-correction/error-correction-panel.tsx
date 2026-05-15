"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  detectVoucherErrors,
  batchDetectErrors,
  getCorrectionSuggestions,
  autoFixBalance,
  getFinancialHealthReport,
  VOUCHER_ENTRY_ID_MAX,
  type ErrorDetectionResult,
  type CorrectionSuggestion,
} from "@/lib/api/ai-error-correction";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { NumberInput } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  MagnifyingGlass,
  FileText,
  ShieldCheck,
  Warning,
  WarningCircle,
  Info,
  ArrowsClockwise,
  ArrowRight,
  CheckCircle,
  XCircle,
  Sparkle,
  ChartBar,
  TrendUp,
  CaretRight,
  FileSearch,
  Activity,
} from "@/components/icons";

const featureCards = [
  {
    id: "single-check" as const,
    label: "单个检测",
    desc: "精准定位单笔凭证问题",
    icon: <MagnifyingGlass className="w-5 h-5" />,
    color: "from-blue-500 to-blue-600",
  },
  {
    id: "batch-check" as const,
    label: "批量检测",
    desc: "全量扫描企业凭证风险",
    icon: <FileSearch className="w-5 h-5" />,
    color: "from-purple-500 to-purple-600",
  },
  {
    id: "health-report" as const,
    label: "健康报告",
    desc: "财务健康度全景分析",
    icon: <Activity className="w-5 h-5" />,
    color: "from-green-500 to-green-600",
  },
];

function getErrorTypeIcon(type: ErrorDetectionResult["type"]) {
  switch (type) {
    case "error":
      return <WarningCircle className="w-4 h-4" />;
    case "warning":
      return <Warning className="w-4 h-4" />;
    case "info":
      return <Info className="w-4 h-4" />;
    default:
      return <Info className="w-4 h-4" />;
  }
}

function getErrorTypeColor(type: ErrorDetectionResult["type"]): string {
  switch (type) {
    case "error":
      return "bg-red-50 text-red-700 border-red-200";
    case "warning":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "info":
      return "bg-blue-50 text-blue-700 border-blue-200";
    default:
      return "bg-bg-secondary text-text-secondary border-border-primary";
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
      return "bg-bg-tertiary text-text-secondary";
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
      return "text-text-secondary bg-bg-secondary";
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

  // 单个凭证检测（仅「开始检测」触发；refetch 会绕过 enabled，故在 queryFn 内必须再校验 id）
  const singleCheckQuery = useQuery({
    queryKey: ["ai-error-correction", "single", voucherId],
    queryFn: () => {
      const id = Number.parseInt(String(voucherId).trim(), 10);
      if (!Number.isFinite(id) || id < 1 || id > VOUCHER_ENTRY_ID_MAX) {
        return Promise.reject(
          new Error(
            `请填写凭证录入列表中的分录 id（1～${VOUCHER_ENTRY_ID_MAX}），勿填凭证号或过长编号`,
          ),
        );
      }
      return detectVoucherErrors(id);
    },
    enabled: false,
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">AI智能纠错</h1>
            <p className="text-sm text-text-tertiary">智能检测凭证错误，保障财务健康</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {featureCards.map((card) => (
          <Card
            key={card.id}
            className={`p-5 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
              activeTab === card.id
                ? "ring-2 ring-purple-500 bg-purple-50/50"
                : "hover:bg-bg-secondary/50"
            }`}
            onClick={() => setActiveTab(card.id)}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white shadow-lg`}>
                {card.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-text-primary flex items-center gap-2">
                  {card.label}
                  {activeTab === card.id && (
                    <CaretRight className="w-4 h-4 text-purple-500" />
                  )}
                </h3>
                <p className="text-sm text-text-tertiary mt-1">{card.desc}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 单个凭证检测 */}
      {activeTab === "single-check" && (
        <div className="flex flex-col gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <MagnifyingGlass className="w-4 h-4 text-blue-600" />
              </div>
              <h2 className="font-semibold text-text-primary">输入凭证分录 ID</h2>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <NumberInput
                min={1}
                max={VOUCHER_ENTRY_ID_MAX}
                step={1}
                placeholder="请输入分录 ID（非凭证号）"
                value={voucherId}
                onChange={(e) => setVoucherId(e.target.value)}
                className="flex-1"
              />
              <Button
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/20"
                onClick={() => {
                  const id = Number.parseInt(voucherId.trim(), 10);
                  if (!Number.isFinite(id) || id < 1) {
                    toast.error("请先输入有效的分录 id（正整数）");
                    return;
                  }
                  if (id > VOUCHER_ENTRY_ID_MAX) {
                    toast.error(
                      `分录 id 不能超过 ${VOUCHER_ENTRY_ID_MAX}。请在「凭证录入」列表查看该行 id，勿填凭证号（如日期+序号长码）`,
                    );
                    return;
                  }
                  void singleCheckQuery.refetch();
                }}
              >
                <Sparkle className="w-4 h-4 mr-2" />
                开始检测
              </Button>
            </div>
            <div className="mt-4 p-3 bg-bg-secondary rounded-lg border border-border-secondary">
              <p className="text-xs text-text-secondary flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
                <span>
                  请打开{" "}
                  <Link
                    href="/dashboard/finance/vouchers"
                    className="text-purple-600 font-medium underline underline-offset-2 hover:text-purple-700"
                  >
                    财务 → 凭证录入
                  </Link>
                  ，每条分录标题左侧有灰色小字「分录 id xxx」——复制该数字填入此处。
                </span>
              </p>
            </div>
          </Card>

          {singleCheckQuery.isLoading && (
            <Card className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center animate-pulse">
                <MagnifyingGlass className="w-8 h-8 text-white" />
              </div>
              <Spinner className="mx-auto mb-3 w-6 h-6" />
              <p className="text-sm text-text-secondary font-medium">正在智能检测凭证...</p>
              <p className="text-xs text-text-muted mt-1">AI 正在分析凭证的完整性和准确性</p>
            </Card>
          )}

          {singleCheckQuery.isError && (
            <Card className="p-6 bg-gradient-to-br from-red-50 to-red-50/50 border-red-200">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-red-900 mb-1">检测失败</h3>
                  <p className="text-sm text-red-700">
                    {(singleCheckQuery.error as Error).message}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {singleCheckQuery.data && (
            <Card className="p-6">
              {singleCheckQuery.data.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-green-700 mb-2">检测通过</h3>
                  <p className="text-sm text-green-600">该凭证未检测到任何错误，财务状况良好</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                        <Warning className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-text-primary">检测结果</h3>
                        <p className="text-sm text-text-tertiary">发现 {singleCheckQuery.data.length} 个问题需要关注</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {singleCheckQuery.data.map((error, index) => (
                      <div
                        key={index}
                        className={`rounded-xl border p-5 ${getErrorTypeColor(error.type)} transition-all hover:shadow-md`}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            error.type === "error" ? "bg-red-100 text-red-600" :
                            error.type === "warning" ? "bg-amber-100 text-amber-600" :
                            "bg-blue-100 text-blue-600"
                          }`}>
                            {getErrorTypeIcon(error.type)}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getErrorTypeBadge(error.type)}>
                              {getErrorTypeName(error.type)}
                            </Badge>
                            <span className="text-xs text-text-tertiary bg-white/50 px-2 py-0.5 rounded">{error.category}</span>
                          </div>
                        </div>
                        <h3 className="font-semibold text-text-primary mb-2">{error.title}</h3>
                        <p className="text-sm text-text-secondary mb-3">{error.description}</p>
                        <div className="flex items-start gap-2 p-3 bg-white/50 rounded-lg">
                          <Sparkle className="w-4 h-4 mt-0.5 text-purple-500 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-text-secondary mb-1">修复建议</p>
                            <p className="text-sm text-text-secondary">{error.suggestion}</p>
                          </div>
                        </div>
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
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <FileSearch className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-text-primary">批量凭证检测</h2>
                  <p className="text-sm text-text-tertiary">对所有凭证进行全量风险扫描</p>
                </div>
              </div>
              <Button
                onClick={() => batchCheckQuery.refetch()}
                disabled={batchCheckQuery.isLoading}
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg shadow-purple-500/20"
              >
                {batchCheckQuery.isLoading ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    检测中...
                  </>
                ) : (
                  <>
                    <ArrowsClockwise className="w-4 h-4 mr-2" />
                    重新检测
                  </>
                )}
              </Button>
            </div>
          </Card>

          {batchCheckQuery.isLoading && (
            <Card className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center animate-pulse">
                <FileSearch className="w-8 h-8 text-white" />
              </div>
              <Spinner className="mx-auto mb-3 w-6 h-6" />
              <p className="text-sm text-text-secondary font-medium">正在批量检测凭证...</p>
              <p className="text-xs text-text-muted mt-1">正在扫描 {VOUCHER_ENTRY_ID_MAX} 个分录</p>
            </Card>
          )}

          {batchCheckQuery.isError && (
            <Card className="p-6 bg-gradient-to-br from-red-50 to-red-50/50 border-red-200">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-red-900 mb-1">批量检测失败</h3>
                  <p className="text-sm text-red-700">
                    {(batchCheckQuery.error as Error).message}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {batchCheckQuery.data && (
            <>
              <Card className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center p-4 bg-gradient-to-br from-bg-secondary to-bg-tertiary rounded-xl">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-bg-tertiary flex items-center justify-center">
                      <FileText className="w-6 h-6 text-text-secondary" />
                    </div>
                    <p className="text-3xl font-bold text-text-primary">
                      {batchCheckQuery.data.totalChecked}
                    </p>
                    <p className="text-sm text-text-secondary mt-1">检测凭证数</p>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-200 flex items-center justify-center">
                      <WarningCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <p className="text-3xl font-bold text-red-600">
                      {batchCheckQuery.data.errorVouchers}
                    </p>
                    <p className="text-sm text-red-600 mt-1">异常凭证数</p>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-200 flex items-center justify-center">
                      <Warning className="w-6 h-6 text-amber-600" />
                    </div>
                    <p className="text-3xl font-bold text-amber-600">
                      {batchCheckQuery.data.details.reduce((sum, d) => sum + d.errorCount, 0)}
                    </p>
                    <p className="text-sm text-amber-600 mt-1">问题总数</p>
                  </div>
                  <div className={`text-center p-4 rounded-xl ${
                    batchCheckQuery.data.errorVouchers === 0
                      ? "bg-gradient-to-br from-green-50 to-green-100"
                      : "bg-gradient-to-br from-amber-50 to-amber-100"
                  }`}>
                    <div className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center ${
                      batchCheckQuery.data.errorVouchers === 0
                        ? "bg-green-200"
                        : "bg-amber-200"
                    }`}>
                      <TrendUp className={`w-6 h-6 ${
                        batchCheckQuery.data.errorVouchers === 0
                          ? "text-green-600"
                          : "text-amber-600"
                      }`} />
                    </div>
                    <p className={`text-3xl font-bold ${
                      batchCheckQuery.data.errorVouchers === 0
                        ? "text-green-600"
                        : "text-amber-600"
                    }`}>
                      {((batchCheckQuery.data.errorVouchers / batchCheckQuery.data.totalChecked) * 100).toFixed(1)}%
                    </p>
                    <p className={`text-sm mt-1 ${
                      batchCheckQuery.data.errorVouchers === 0
                        ? "text-green-600"
                        : "text-amber-600"
                    }`}>异常率</p>
                  </div>
                </div>
              </Card>

              <Card className="overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-bg-secondary to-bg-tertiary border-b border-border-primary">
                  <div className="flex items-center gap-3">
                    <ChartBar className="w-5 h-5 text-text-secondary" />
                    <h3 className="font-semibold text-text-primary">异常凭证列表</h3>
                    <Badge variant="secondary" className="ml-auto">
                      共 {batchCheckQuery.data.details.length} 条异常
                    </Badge>
                  </div>
                </div>
                {batchCheckQuery.data.details.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-green-700 mb-2">全部通过</h3>
                    <p className="text-sm text-green-600">所有凭证检测正常，未发现异常情况</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border-secondary">
                    {batchCheckQuery.data.details.map((detail) => (
                      <div key={detail.voucherId} className="px-6 py-4 hover:bg-bg-secondary/50 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                              <FileText className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                              <span className="font-semibold text-text-primary">
                                {detail.voucherNo}
                              </span>
                              <Badge variant="secondary" className="ml-2 text-xs bg-red-100 text-red-700">
                                {detail.errorCount} 个问题
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedVoucherId(detail.voucherId);
                              setActiveTab("single-check");
                              setVoucherId(String(detail.voucherId));
                            }}
                            className="flex items-center gap-1"
                          >
                            查看详情
                            <ArrowRight className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-text-tertiary mb-3">
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {detail.voucherDate.slice(0, 10)}
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendUp className="w-3 h-3" />
                            ¥{detail.totalAmount}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {detail.errors.slice(0, 3).map((error, idx) => (
                            <span
                              key={idx}
                              className={`text-xs px-3 py-1 rounded-full ${getErrorTypeBadge(error.type)}`}
                            >
                              {error.title}
                            </span>
                          ))}
                          {detail.errors.length > 3 && (
                            <span className="text-xs text-text-tertiary px-3 py-1 bg-bg-tertiary rounded-full">
                              +{detail.errors.length - 3} 更多
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
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-text-primary">财务健康报告</h2>
                  <p className="text-sm text-text-tertiary">全面评估企业财务健康状况</p>
                </div>
              </div>
              <Button
                onClick={() => healthReportQuery.refetch()}
                disabled={healthReportQuery.isLoading}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg shadow-green-500/20"
              >
                {healthReportQuery.isLoading ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    生成中...
                  </>
                ) : (
                  <>
                    <ArrowsClockwise className="w-4 h-4 mr-2" />
                    刷新报告
                  </>
                )}
              </Button>
            </div>
          </Card>

          {healthReportQuery.isLoading && (
            <Card className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center animate-pulse">
                <Activity className="w-8 h-8 text-white" />
              </div>
              <Spinner className="mx-auto mb-3 w-6 h-6" />
              <p className="text-sm text-text-secondary font-medium">正在生成财务健康报告...</p>
              <p className="text-xs text-text-muted mt-1">AI 正在分析您的财务数据</p>
            </Card>
          )}

          {healthReportQuery.isError && (
            <Card className="p-6 bg-gradient-to-br from-red-50 to-red-50/50 border-red-200">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-red-900 mb-1">报告生成失败</h3>
                  <p className="text-sm text-red-700">
                    {(healthReportQuery.error as Error).message}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {healthReportQuery.data && (
            <>
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-text-primary">
                        财务健康度报告
                      </h2>
                      <p className="text-sm text-text-tertiary">
                        {healthReportQuery.data.period}
                      </p>
                    </div>
                  </div>
                  <Badge className={`px-4 py-1.5 text-sm font-medium ${
                    healthReportQuery.data.summary.healthLevel === '优秀' ? "bg-green-100 text-green-700" :
                    healthReportQuery.data.summary.healthLevel === '良好' ? "bg-amber-100 text-amber-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {healthReportQuery.data.summary.healthLevel}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="text-center p-5 bg-gradient-to-br from-bg-secondary to-bg-tertiary rounded-xl border border-border-primary">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-bg-tertiary flex items-center justify-center">
                      <FileText className="w-6 h-6 text-text-secondary" />
                    </div>
                    <p className="text-3xl font-bold text-text-primary">
                      {healthReportQuery.data.summary.totalVoucherEntries}
                    </p>
                    <p className="text-sm text-text-secondary mt-1">分录总数</p>
                  </div>
                  <div className="text-center p-5 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-200 flex items-center justify-center">
                      <WarningCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <p className="text-3xl font-bold text-red-600">
                      {healthReportQuery.data.summary.errorEntries}
                    </p>
                    <p className="text-sm text-red-600 mt-1">异常分录</p>
                  </div>
                  <div className="text-center p-5 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-200 flex items-center justify-center">
                      <Warning className="w-6 h-6 text-amber-600" />
                    </div>
                    <p className="text-3xl font-bold text-amber-600">
                      {healthReportQuery.data.summary.errorRate}
                    </p>
                    <p className="text-sm text-amber-600 mt-1">异常率</p>
                  </div>
                  <div className="text-center p-5 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-200 flex items-center justify-center">
                      <Activity className="w-6 h-6 text-green-600" />
                    </div>
                    <p className="text-3xl font-bold text-green-600">
                      {healthReportQuery.data.summary.healthLevel}
                    </p>
                    <p className="text-sm text-green-600 mt-1">健康等级</p>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
                    <ChartBar className="w-5 h-5 text-purple-500" />
                    问题分类统计
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(healthReportQuery.data.errorCategories).map(
                      ([category, count]) => (
                        <div key={category} className="flex items-center gap-4 p-3 bg-bg-secondary rounded-lg">
                          <span className="text-sm text-text-secondary w-32 truncate font-medium">
                            {category}
                          </span>
                          <div className="flex-1 h-3 bg-bg-tertiary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-500"
                              style={{
                                width: `${(count / Math.max(...Object.values(healthReportQuery.data.errorCategories))) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm text-text-secondary w-10 text-right font-medium">
                            {count}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
                    <TrendUp className="w-5 h-5 text-amber-500" />
                    主要问题 TOP5
                  </h3>
                  <ul className="space-y-3">
                    {healthReportQuery.data.topIssues.map(([issue, count], index) => (
                      <li
                        key={index}
                        className="flex items-center gap-4 p-4 bg-bg-secondary rounded-lg hover:bg-bg-tertiary transition-colors"
                      >
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? "bg-red-500 text-white" :
                          index === 1 ? "bg-amber-500 text-white" :
                          index === 2 ? "bg-yellow-500 text-white" :
                          "bg-bg-tertiary text-text-secondary"
                        }`}>
                          {index + 1}
                        </span>
                        <span className="flex-1 text-sm text-text-secondary font-medium">{issue}</span>
                        <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                          {count} 次
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* 纠错建议 */}
      {selectedVoucherId && suggestionsQuery.data && suggestionsQuery.data.length > 0 && (
        <Dialog open={true} onOpenChange={() => setSelectedVoucherId(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center">
                  <Sparkle className="w-4 h-4 text-white" />
                </div>
                凭证 #{selectedVoucherId} 的纠错建议
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-4">
              {suggestionsQuery.data.map((suggestion, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 bg-bg-secondary rounded-xl border border-border-secondary"
                >
                  <Badge className={`mt-0.5 ${getPriorityColor(suggestion.priority)}`}>
                    {getPriorityName(suggestion.priority)}
                  </Badge>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">{suggestion.error}</p>
                    <p className="text-xs text-text-secondary mt-1">{suggestion.action}</p>
                  </div>
                  {suggestion.autoFixable && (
                    <Button
                      size="sm"
                      onClick={() => {
                        autoFixMutation.mutate(selectedVoucherId);
                      }}
                      disabled={autoFixMutation.status === 'pending'}
                      className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
                    >
                      {autoFixMutation.status === 'pending' ? (
                        <>
                          <Spinner className="w-3 h-3 mr-1" />
                          修复中
                        </>
                      ) : (
                        <>
                          <Sparkle className="w-3 h-3 mr-1" />
                          一键修复
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {autoFixMutation.isSuccess && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {autoFixMutation.data?.message}
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}