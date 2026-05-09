"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  AI_TASK_TYPES,
  invoiceDateStringToEntryDateIso,
  mapAiOutputToSuggestedVoucher,
  type AiTaskType,
  type AiTaskResult,
} from "@uxyy/shared";
import {
  applyAiTaskVoucher,
  fetchAiQueueStats,
  submitAiTask,
  fetchAiTask,
} from "@/lib/api/ai";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const taskTypeMap: Record<AiTaskType, string> = {
  ocr_invoice: "发票 OCR 识别",
  accounting_suggestion: "会计分录建议",
  classification: "智能分类",
};

// 将文件转为 base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
  });
}

// OCR 结果展示组件
function OcrResultDisplay({ data }: { data: Record<string, unknown> }) {
  const getString = (key: string): string => {
    const val = data[key];
    return typeof val === 'string' ? val : typeof val === 'number' ? String(val) : '-';
  };

  const getNumber = (key: string): number => {
    const val = data[key];
    return typeof val === 'number' ? val : 0;
  };

  const items = Array.isArray(data.items) ? data.items as Array<Record<string, unknown>> : [];
  const confidence = getNumber('confidence');

  return (
    <div className="space-y-3">
      {/* 基本信息 */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-white p-2 rounded border">
          <span className="text-zinc-500">发票类型</span>
          <p className="font-medium">{getString('invoiceType')}</p>
        </div>
        <div className="bg-white p-2 rounded border">
          <span className="text-zinc-500">开票日期</span>
          <p className="font-medium">{getString('invoiceDate')}</p>
        </div>
        <div className="bg-white p-2 rounded border">
          <span className="text-zinc-500">发票代码</span>
          <p className="font-medium">{getString('invoiceCode')}</p>
        </div>
        <div className="bg-white p-2 rounded border">
          <span className="text-zinc-500">发票号码</span>
          <p className="font-medium">{getString('invoiceNumber')}</p>
        </div>
      </div>

      {/* 金额信息 */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-white p-2 rounded border">
          <span className="text-zinc-500">不含税金额</span>
          <p className="font-medium text-blue-600">¥{getNumber('amount').toFixed(2)}</p>
        </div>
        <div className="bg-white p-2 rounded border">
          <span className="text-zinc-500">税额</span>
          <p className="font-medium">¥{getNumber('taxAmount').toFixed(2)}</p>
        </div>
        <div className="bg-white p-2 rounded border">
          <span className="text-zinc-500">价税合计</span>
          <p className="font-medium text-green-600">¥{getNumber('totalAmount').toFixed(2)}</p>
        </div>
      </div>

      {/* 购买方信息 */}
      <div className="bg-white p-2 rounded border text-xs">
        <p className="text-zinc-500 mb-1">购买方</p>
        <p className="font-medium">{getString('buyerName')}</p>
        <p className="text-zinc-600 mt-1">税号: {getString('buyerTaxId')}</p>
        {Boolean(data.buyerAddress) && (
          <p className="text-zinc-600">地址电话: {getString('buyerAddress')}</p>
        )}
        {Boolean(data.buyerBank) && (
          <p className="text-zinc-600">开户行: {getString('buyerBank')}</p>
        )}
      </div>

      {/* 销售方信息 */}
      <div className="bg-white p-2 rounded border text-xs">
        <p className="text-zinc-500 mb-1">销售方</p>
        <p className="font-medium">{getString('sellerName')}</p>
        <p className="text-zinc-600 mt-1">税号: {getString('sellerTaxId')}</p>
        {Boolean(data.sellerAddress) && (
          <p className="text-zinc-600">地址电话: {getString('sellerAddress')}</p>
        )}
        {Boolean(data.sellerBank) && (
          <p className="text-zinc-600">开户行: {getString('sellerBank')}</p>
        )}
      </div>

      {/* 商品明细 */}
      {items.length > 0 && (
        <div className="bg-white p-2 rounded border text-xs">
          <p className="text-zinc-500 mb-2">商品明细</p>
          <div className="space-y-1">
            {items.map((item, idx) => (
              <div key={idx} className="flex justify-between py-1 border-b border-zinc-100 last:border-0">
                <span className="flex-1">{String(item.name ?? '-')}</span>
                <span className="text-zinc-500 w-16 text-right">
                  {String(item.quantity ?? '0')}{String(item.unit ?? '')}
                </span>
                <span className="w-20 text-right">¥{Number(item.amount ?? 0).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 其他信息 */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {Boolean(data.drawer) && (
          <div className="bg-white p-2 rounded border">
            <span className="text-zinc-500">开票人</span>
            <p className="font-medium">{getString('drawer')}</p>
          </div>
        )}
        {Boolean(data.reviewer) && (
          <div className="bg-white p-2 rounded border">
            <span className="text-zinc-500">复核人</span>
            <p className="font-medium">{getString('reviewer')}</p>
          </div>
        )}
        {Boolean(data.payee) && (
          <div className="bg-white p-2 rounded border">
            <span className="text-zinc-500">收款人</span>
            <p className="font-medium">{getString('payee')}</p>
          </div>
        )}
        <div className="bg-white p-2 rounded border">
          <span className="text-zinc-500">置信度</span>
          <p className="font-medium">{Math.round(confidence * 100)}%</p>
        </div>
      </div>

      {/* 备注 */}
      {Boolean(data.remarks) && (
        <div className="bg-white p-2 rounded border text-xs">
          <span className="text-zinc-500">备注</span>
          <p className="mt-1">{getString('remarks')}</p>
        </div>
      )}

      {/* 原始 JSON */}
      <details className="text-xs">
        <summary className="cursor-pointer text-zinc-500 hover:text-zinc-700">查看原始 JSON</summary>
        <pre className="mt-2 text-xs text-zinc-800 overflow-auto bg-zinc-100 p-2 rounded">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  );
}

const statusMap: Record<string, string> = {
  pending: "等待中",
  processing: "处理中",
  completed: "已完成",
  failed: "失败",
  dead: "已入死信",
};

const statusColorMap: Record<string, string> = {
  pending: "text-yellow-600",
  processing: "text-blue-600",
  completed: "text-green-600",
  failed: "text-red-600",
  dead: "text-zinc-600",
};

export function AiPanel() {
  const [taskType, setTaskType] = useState<AiTaskType>("accounting_suggestion");
  const [clientKey, setClientKey] = useState("");
  const [payload, setPayload] = useState("{}");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submittedTask, setSubmittedTask] = useState<AiTaskResult | null>(null);
  const [error, setError] = useState("");

  const statsQuery = useQuery({
    queryKey: ["ai", "queue-stats"],
    queryFn: fetchAiQueueStats,
    refetchInterval: 5000,
  });

  const submitMutation = useMutation({
    mutationFn: submitAiTask,
    onSuccess: (data) => {
      setSubmittedTask(data);
      setError("");
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "提交失败");
    },
  });

  const taskQuery = useQuery({
    queryKey: ["ai", "task", submittedTask?.id],
    queryFn: () => fetchAiTask(submittedTask!.id),
    /** 勿仅用提交瞬间的 status：初始多为 pending，完成后若不轮询则永远看不到 completed */
    enabled: submittedTask !== null,
    refetchInterval: (q) => {
      const st =
        q.state.data?.status ?? submittedTask?.status;
      // 仅终态停止；勿用 !st —— 否则在首帧或异常缺失 status 时会误停，任务永远停在「等待中」
      if (st === "completed" || st === "failed" || st === "dead") {
        return false;
      }
      return 2000;
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件（JPG、PNG 等）');
      return;
    }

    // 检查文件大小（最大 5MB）
    if (file.size > 5 * 1024 * 1024) {
      setError('图片大小不能超过 5MB');
      return;
    }

    setSelectedFile(file);
    setError('');

    // 生成预览
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);

    // 自动转为 base64 并填充 payload
    try {
      const base64 = await fileToBase64(file);
      setPayload(JSON.stringify({ imageBase64: base64 }, null, 2));
    } catch {
      setError('图片读取失败');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalPayload: Record<string, unknown>;

      if (taskType === 'ocr_invoice' && selectedFile) {
        // OCR 任务使用图片 base64
        const base64 = await fileToBase64(selectedFile);
        finalPayload = { imageBase64: base64 };
      } else {
        // 其他任务使用 JSON payload
        finalPayload = JSON.parse(payload);
      }

      submitMutation.mutate({
        taskType,
        clientKey: clientKey || undefined,
        payload: finalPayload,
      });
    } catch {
      setError("JSON 格式错误或图片读取失败");
    }
  };

  const currentTask = taskQuery.data || submittedTask;

  const suggested = useMemo(() => {
    if (!currentTask || currentTask.status !== "completed" || !currentTask.outputPayload) {
      return null;
    }
    try {
      return mapAiOutputToSuggestedVoucher(
        currentTask.outputPayload as Record<string, unknown>,
      );
    } catch {
      return null;
    }
  }, [currentTask]);

  const [voucherDraft, setVoucherDraft] = useState({
    debitAccount: "",
    creditAccount: "",
    amount: "",
    summary: "",
    entryDate: "",
  });

  const invoiceEntryDateIso = useMemo(() => {
    const p = currentTask?.outputPayload as Record<string, unknown> | null | undefined;
    if (!p || currentTask?.taskType !== "ocr_invoice") return null;
    return invoiceDateStringToEntryDateIso(p.invoiceDate);
  }, [currentTask?.taskType, currentTask?.outputPayload]);

  useEffect(() => {
    if (!suggested || !currentTask) return;
    setVoucherDraft({
      debitAccount: suggested.debitAccount,
      creditAccount: suggested.creditAccount,
      amount: suggested.amount,
      summary: suggested.summary,
      entryDate: invoiceEntryDateIso ?? "",
    });
  }, [currentTask, invoiceEntryDateIso, suggested]);

  const applyVoucherMutation = useMutation({
    mutationFn: async () => {
      if (!currentTask) throw new Error("无任务");
      return applyAiTaskVoucher(currentTask.id, {
        debitAccount: voucherDraft.debitAccount || undefined,
        creditAccount: voucherDraft.creditAccount || undefined,
        amount: voucherDraft.amount || undefined,
        summary: voucherDraft.summary || undefined,
        entryDate: voucherDraft.entryDate || undefined,
      });
    },
    onSuccess: (data) => {
      toast.success(
        data.created ? "已写入财务凭证库" : "该任务已生成过凭证，已返回已有记录",
      );
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "写入凭证失败");
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-zinc-900">AI 助手</h1>

      {/* 队列状态 */}
      <Card>
        <h2 className="font-medium text-zinc-900 mb-4">队列状态</h2>
        {statsQuery.isLoading ? (
          <p className="text-sm text-zinc-600">加载中…</p>
        ) : statsQuery.isError ? (
          <p className="text-sm text-red-600">
            {statsQuery.error instanceof Error ? statsQuery.error.message : "加载失败"}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-zinc-50 rounded-md">
              <p className="text-xs text-zinc-500 mb-1">主队列</p>
              <p className="text-sm font-medium">{statsQuery.data?.queue}</p>
              <div className="flex gap-3 mt-2 text-xs">
                <span className="text-yellow-600">等待: {statsQuery.data?.counts?.waiting ?? 0}</span>
                <span className="text-blue-600">处理中: {statsQuery.data?.counts?.active ?? 0}</span>
                <span className="text-green-600">完成: {statsQuery.data?.counts?.completed ?? 0}</span>
                <span className="text-red-600">失败: {statsQuery.data?.counts?.failed ?? 0}</span>
              </div>
            </div>
            <div className="p-3 bg-zinc-50 rounded-md">
              <p className="text-xs text-zinc-500 mb-1">死信队列</p>
              <p className="text-sm font-medium">{statsQuery.data?.dlqQueue}</p>
              <div className="flex gap-3 mt-2 text-xs">
                <span className="text-yellow-600">等待: {statsQuery.data?.dlqCounts?.waiting ?? 0}</span>
                <span className="text-blue-600">处理中: {statsQuery.data?.dlqCounts?.active ?? 0}</span>
                <span className="text-green-600">完成: {statsQuery.data?.dlqCounts?.completed ?? 0}</span>
                <span className="text-red-600">失败: {statsQuery.data?.dlqCounts?.failed ?? 0}</span>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* 提交任务 */}
      <Card>
        <h2 className="font-medium text-zinc-900 mb-4">提交 AI 任务</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700">任务类型</label>
            <select
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
              value={taskType}
              onChange={(e) => setTaskType(e.target.value as AiTaskType)}
            >
              {AI_TASK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {taskTypeMap[type] || type}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="幂等键（可选）"
            value={clientKey}
            onChange={(e) => setClientKey(e.target.value)}
            placeholder="用于防止重复创建任务"
          />

          {/* OCR 任务显示图片上传 */}
          {taskType === 'ocr_invoice' && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-zinc-700">上传发票图片</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-zinc-900 file:text-white hover:file:bg-zinc-800"
              />
              <p className="text-xs text-zinc-500">支持 JPG、PNG 格式，最大 5MB</p>

              {/* 图片预览 */}
              {imagePreview && (
                <div className="mt-2 p-2 border border-zinc-200 rounded-md">
                  <p className="text-xs text-zinc-500 mb-2">图片预览：</p>
                  <div className="relative max-h-48">
                    <Image
                      src={imagePreview}
                      alt="发票预览"
                      className="max-h-48 object-contain rounded"
                      width={400}
                      height={300}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 非 OCR 任务显示 JSON 输入 */}
          {taskType !== 'ocr_invoice' && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-zinc-700">任务参数 (JSON)</label>
              <textarea
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20 font-mono"
                rows={5}
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                placeholder='{"description": "购买办公用品100元"}'
              />
            </div>
          )}

          {/* OCR 任务也显示 payload（只读） */}
          {taskType === 'ocr_invoice' && selectedFile && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-zinc-700">任务参数（已自动生成）</label>
              <textarea
                className="rounded-md border border-zinc-200 px-3 py-2 text-sm bg-zinc-50 font-mono text-zinc-500"
                rows={3}
                value={payload}
                readOnly
                title="Base64 图片数据"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 rounded-md bg-red-50 px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 justify-end">
            <Button type="submit" loading={submitMutation.isPending}>
              提交任务
            </Button>
          </div>
        </form>
      </Card>

      {/* 任务状态 */}
      {currentTask && (
        <Card>
          <h2 className="font-medium text-zinc-900 mb-4">任务状态</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-zinc-600">任务 ID</span>
              <span className="text-sm font-medium">{currentTask.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-zinc-600">任务类型</span>
              <span className="text-sm font-medium">
                {taskTypeMap[currentTask.taskType] || currentTask.taskType}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-zinc-600">状态</span>
              <span className={`text-sm font-medium ${statusColorMap[currentTask.status]}`}>
                {statusMap[currentTask.status] || currentTask.status}
              </span>
            </div>
            {currentTask.clientKey && (
              <div className="flex justify-between">
                <span className="text-sm text-zinc-600">幂等键</span>
                <span className="text-sm font-medium">{currentTask.clientKey}</span>
              </div>
            )}
            {currentTask.attempts > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-zinc-600">尝试次数</span>
                <span className="text-sm font-medium">{currentTask.attempts}</span>
              </div>
            )}
            {currentTask.errorMessage && (
              <div className="p-3 bg-red-50 rounded-md">
                <p className="text-xs text-red-600 font-medium">错误信息</p>
                <p className="text-sm text-red-700 mt-1">{currentTask.errorMessage}</p>
              </div>
            )}
            {currentTask.outputPayload && (
              <div className="p-3 bg-zinc-50 rounded-md">
                <p className="text-xs text-zinc-600 font-medium mb-2">输出结果</p>
                {/* OCR 发票识别结果格式化展示 */}
                {currentTask.taskType === 'ocr_invoice' && (
                  <OcrResultDisplay data={currentTask.outputPayload as Record<string, unknown>} />
                )}
                {/* 非 OCR 任务显示原始 JSON */}
                {currentTask.taskType !== 'ocr_invoice' && (
                  <pre className="text-xs text-zinc-800 mt-1 overflow-auto">
                    {JSON.stringify(currentTask.outputPayload, null, 2)}
                  </pre>
                )}
              </div>
            )}

            {currentTask.status === "completed" && currentTask.outputPayload && (
              <div className="border-t border-zinc-200 pt-4 mt-4 space-y-4">
                <p className="text-sm font-medium text-zinc-900">写入财务凭证</p>
                {suggested ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {currentTask.taskType === "ocr_invoice" ? (
                      <p className="sm:col-span-2 text-xs text-zinc-600">
                        发票 OCR 成功后，系统按<strong>采购费用</strong>预设为借「管理费用」、贷「应付账款」；若实为销售开票或对公已付款，请在写入前改为「应收账款 / 主营业务收入」「银行存款」等正确科目。
                      </p>
                    ) : null}
                    <Input
                      label="借方科目"
                      value={voucherDraft.debitAccount}
                      onChange={(e) =>
                        setVoucherDraft((d) => ({ ...d, debitAccount: e.target.value }))
                      }
                    />
                    <Input
                      label="贷方科目"
                      value={voucherDraft.creditAccount}
                      onChange={(e) =>
                        setVoucherDraft((d) => ({ ...d, creditAccount: e.target.value }))
                      }
                    />
                    <Input
                      label="金额"
                      value={voucherDraft.amount}
                      onChange={(e) =>
                        setVoucherDraft((d) => ({ ...d, amount: e.target.value }))
                      }
                    />
                    <div className="sm:col-span-2 flex flex-col gap-2">
                      <div className="flex flex-wrap items-end gap-2">
                        <div className="min-w-0 flex-1">
                          <Input
                            label="记账日期（可选，ISO 8601）"
                            value={voucherDraft.entryDate}
                            onChange={(e) =>
                              setVoucherDraft((d) => ({
                                ...d,
                                entryDate: e.target.value,
                              }))
                            }
                            placeholder="留空则用写入凭证时服务器当前时间"
                          />
                        </div>
                        {currentTask.taskType === "ocr_invoice" ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="shrink-0"
                            disabled={!invoiceEntryDateIso}
                            title={
                              invoiceEntryDateIso
                                ? "用 OCR 结构化字段 invoiceDate"
                                : "未识别到可解析的开票日期"
                            }
                            onClick={() => {
                              if (!invoiceEntryDateIso) {
                                toast.error(
                                  "未能从票面解析开票日期，请核对 output 中的 invoiceDate 或手工填写",
                                );
                                return;
                              }
                              setVoucherDraft((d) => ({
                                ...d,
                                entryDate: invoiceEntryDateIso,
                              }));
                              toast.success("已填入票面开票日");
                            }}
                          >
                            一键用发票日期
                          </Button>
                        ) : null}
                      </div>
                      <p className="text-xs text-zinc-500">
                        {currentTask.taskType === "ocr_invoice" ? (
                          <>
                            发票 OCR 完成后会尝试按票面开票日自动填入；若清空后需恢复，点「一键用发票日期」。解析后示例：
                            <code className="mx-1 rounded bg-zinc-100 px-1">
                              {invoiceEntryDateIso ?? "2025-03-26T00:00:00.000Z"}
                            </code>
                          </>
                        ) : (
                          <>留空则使用写入凭证时服务器当前时间。</>
                        )}
                      </p>
                    </div>
                    <div className="sm:col-span-2 flex flex-col gap-1">
                      <label className="text-sm font-medium text-zinc-700">摘要</label>
                      <textarea
                        className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                        rows={2}
                        value={voucherDraft.summary}
                        onChange={(e) =>
                          setVoucherDraft((d) => ({ ...d, summary: e.target.value }))
                        }
                      />
                    </div>
                    <div className="sm:col-span-2 flex flex-wrap gap-2 items-center">
                      <Button
                        type="button"
                        loading={applyVoucherMutation.isPending}
                        onClick={() => applyVoucherMutation.mutate()}
                      >
                        确认并写入凭证
                      </Button>
                      <Link
                        href="/dashboard/finance/vouchers"
                        className="text-sm text-zinc-600 underline hover:text-zinc-900"
                      >
                        查看凭证库
                      </Link>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-amber-700 bg-amber-50 rounded-md px-3 py-2">
                    当前输出无法自动生成凭证草稿：分录类任务需输出{" "}
                    <code className="text-xs">entries</code>（一借一贷、借贷平衡）；发票
                    OCR 需能识别购/销方及价税金额。请核对 OCR 结构化结果后重试，或直接在财务模块手工入账。
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
