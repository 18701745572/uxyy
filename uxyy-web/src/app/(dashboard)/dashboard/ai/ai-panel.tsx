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
  submitAiTask,
  fetchAiTask,
} from "@/lib/api/ai";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  FileText,
  Sparkles,
  Tag,
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Brain,
  Receipt,
  ArrowRight,
  Wand2,
} from "lucide-react";

const taskTypeMap: Record<AiTaskType, { label: string; desc: string; icon: React.ReactNode }> = {
  ocr_invoice: {
    label: "发票 OCR 识别",
    desc: "上传发票图片，自动识别票面信息并生成会计分录",
    icon: <Receipt className="w-5 h-5" />,
  },
  accounting_suggestion: {
    label: "会计分录建议",
    desc: "输入业务描述，AI 智能推荐合适的借贷科目",
    icon: <Sparkles className="w-5 h-5" />,
  },
  classification: {
    label: "智能分类",
    desc: "对发票、凭证进行智能分类与标签标注",
    icon: <Tag className="w-5 h-5" />,
  },
};

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

      {Boolean(data.remarks) && (
        <div className="bg-white p-2 rounded border text-xs">
          <span className="text-zinc-500">备注</span>
          <p className="mt-1">{getString('remarks')}</p>
        </div>
      )}
    </div>
  );
}

const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "等待中", color: "text-yellow-600", icon: <Clock className="w-4 h-4" /> },
  processing: { label: "处理中", color: "text-blue-600", icon: <Loader2 className="w-4 h-4 animate-spin" /> },
  completed: { label: "已完成", color: "text-green-600", icon: <CheckCircle2 className="w-4 h-4" /> },
  failed: { label: "失败", color: "text-red-600", icon: <XCircle className="w-4 h-4" /> },
  dead: { label: "已入死信", color: "text-zinc-600", icon: <XCircle className="w-4 h-4" /> },
};

export function AiPanel() {
  const [taskType, setTaskType] = useState<AiTaskType>("accounting_suggestion");
  const [clientKey, setClientKey] = useState("");
  const [payload, setPayload] = useState('{"description": ""}');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submittedTask, setSubmittedTask] = useState<AiTaskResult | null>(null);
  const [error, setError] = useState("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

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
    enabled: submittedTask !== null,
    refetchInterval: (q) => {
      const st = q.state.data?.status ?? submittedTask?.status;
      if (st === "completed" || st === "failed" || st === "dead") {
        return false;
      }
      return 2000;
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件（JPG、PNG 等）');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('图片大小不能超过 5MB');
      return;
    }

    setSelectedFile(file);
    setError('');

    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);

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
        const base64 = await fileToBase64(selectedFile);
        finalPayload = { imageBase64: base64 };
      } else {
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
      setShowSuccessDialog(true);
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
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
          <Brain className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">AI 助手</h1>
          <p className="text-sm text-zinc-500">智能发票识别 · 会计分录建议 · 智能分类</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {AI_TASK_TYPES.map((type) => (
          <Card
            key={type}
            className={`p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
              taskType === type
                ? "ring-2 ring-purple-500 bg-purple-50"
                : "hover:bg-zinc-50"
            }`}
            onClick={() => setTaskType(type)}
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                taskType === type ? "bg-purple-500 text-white" : "bg-zinc-100 text-zinc-600"
              }`}>
                {taskTypeMap[type]?.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-zinc-900">{taskTypeMap[type]?.label}</h3>
                <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                  {taskTypeMap[type]?.desc}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-zinc-400" />
          <h2 className="font-medium text-zinc-900">提交 AI 任务</h2>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700">任务类型</label>
            <div className="flex items-center gap-2 p-3 bg-zinc-50 rounded-md">
              <div className={`w-8 h-8 rounded flex items-center justify-center ${
                taskType === 'ocr_invoice' ? "bg-purple-500 text-white" : "bg-zinc-200 text-zinc-500"
              }`}>
                {taskTypeMap[taskType]?.icon}
              </div>
              <span className="font-medium">{taskTypeMap[taskType]?.label}</span>
            </div>
          </div>

          <Input
            label="幂等键（可选）"
            value={clientKey}
            onChange={(e) => setClientKey(e.target.value)}
            placeholder="用于防止重复创建任务"
          />

          {taskType === 'ocr_invoice' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-zinc-700 flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  上传发票图片
                </label>
                <div className="border-2 border-dashed border-zinc-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="invoice-upload"
                  />
                  <label htmlFor="invoice-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center">
                        <Upload className="w-6 h-6 text-zinc-400" />
                      </div>
                      <p className="text-sm text-zinc-600">
                        点击上传或拖拽图片到此处
                      </p>
                      <p className="text-xs text-zinc-400">支持 JPG、PNG 格式，最大 5MB</p>
                    </div>
                  </label>
                </div>
              </div>

              {imagePreview && (
                <div className="relative p-2 border border-zinc-200 rounded-md">
                  <p className="text-xs text-zinc-500 mb-2">图片预览：</p>
                  <div className="relative max-h-48 mx-auto">
                    <Image
                      src={imagePreview}
                      alt="发票预览"
                      className="max-h-48 object-contain rounded"
                      width={400}
                      height={300}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setSelectedFile(null);
                      setImagePreview(null);
                      setPayload('{"description": ""}');
                    }}
                  >
                    移除
                  </Button>
                </div>
              )}
            </div>
          )}

          {taskType !== 'ocr_invoice' && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-zinc-700">任务参数 (JSON)</label>
              <textarea
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono"
                rows={5}
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                placeholder='{"description": "购买办公用品100元"}'
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 rounded-md bg-red-50 px-3 py-2 flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              {error}
            </p>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              loading={submitMutation.isPending}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              提交任务
            </Button>
          </div>
        </form>
      </Card>

      {currentTask && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-zinc-400" />
            <h2 className="font-medium text-zinc-900">任务状态</h2>
            {taskQuery.isFetching && (
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            )}
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-zinc-50 rounded-lg">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                currentTask.status === 'completed' ? 'bg-green-100' :
                currentTask.status === 'failed' ? 'bg-red-100' :
                currentTask.status === 'processing' ? 'bg-blue-100' : 'bg-yellow-100'
              }`}>
                <span className={statusMap[currentTask.status]?.color}>
                  {statusMap[currentTask.status]?.icon}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">任务 #{currentTask.id}</span>
                  <Badge className={
                    currentTask.status === 'completed' ? 'bg-green-100 text-green-700' :
                    currentTask.status === 'failed' ? 'bg-red-100 text-red-700' :
                    currentTask.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }>
                    {statusMap[currentTask.status]?.label}
                  </Badge>
                </div>
                <p className="text-sm text-zinc-500 mt-1">
                  {taskTypeMap[currentTask.taskType]?.label || currentTask.taskType}
                </p>
              </div>
              {currentTask.status === 'completed' && (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-medium">完成</span>
                </div>
              )}
            </div>

            {currentTask.clientKey && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">幂等键</span>
                <span className="font-medium">{currentTask.clientKey}</span>
              </div>
            )}
            {currentTask.attempts > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">尝试次数</span>
                <span className="font-medium">{currentTask.attempts}</span>
              </div>
            )}
            {currentTask.errorMessage && (
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-red-700 font-medium flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  错误信息
                </p>
                <p className="text-sm text-red-600 mt-2">{currentTask.errorMessage}</p>
              </div>
            )}
            {currentTask.outputPayload && (
              <div className="p-4 bg-zinc-50 rounded-lg">
                <p className="text-sm font-medium text-zinc-700 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  输出结果
                </p>
                {currentTask.taskType === 'ocr_invoice' && (
                  <OcrResultDisplay data={currentTask.outputPayload as Record<string, unknown>} />
                )}
                {currentTask.taskType !== 'ocr_invoice' && (
                  <pre className="text-xs text-zinc-800 overflow-auto bg-white p-3 rounded border">
                    {JSON.stringify(currentTask.outputPayload, null, 2)}
                  </pre>
                )}
              </div>
            )}

            {currentTask.status === "completed" && currentTask.outputPayload && (
              <div className="border-t border-zinc-200 pt-4 mt-4">
                <div className="flex items-center gap-2 mb-4">
                  <Wand2 className="w-5 h-5 text-purple-500" />
                  <h3 className="font-medium text-zinc-900">写入财务凭证</h3>
                </div>
                {suggested ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {currentTask.taskType === "ocr_invoice" && (
                      <p className="sm:col-span-2 text-xs text-zinc-600 bg-blue-50 rounded-md px-3 py-2">
                        发票 OCR 成功后，系统按<strong>采购费用</strong>预设为借「管理费用」、贷「应付账款」；若实为销售开票或对公已付款，请在写入前改为「应收账款 / 主营业务收入」「银行存款」等正确科目。
                      </p>
                    )}
                    <Input
                      label="借方科目"
                      value={voucherDraft.debitAccount}
                      onChange={(e) =>
                        setVoucherDraft((d) => ({ ...d, debitAccount: e.target.value }))
                      }
                      className="focus:ring-purple-500/20 focus:border-purple-500"
                    />
                    <Input
                      label="贷方科目"
                      value={voucherDraft.creditAccount}
                      onChange={(e) =>
                        setVoucherDraft((d) => ({ ...d, creditAccount: e.target.value }))
                      }
                      className="focus:ring-purple-500/20 focus:border-purple-500"
                    />
                    <Input
                      label="金额"
                      value={voucherDraft.amount}
                      onChange={(e) =>
                        setVoucherDraft((d) => ({ ...d, amount: e.target.value }))
                      }
                      className="focus:ring-purple-500/20 focus:border-purple-500"
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
                        {currentTask.taskType === "ocr_invoice" && (
                          <Button
                            type="button"
                            variant="outline"
                            className="shrink-0 gap-1"
                            disabled={!invoiceEntryDateIso}
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
                            <Receipt className="w-4 h-4" />
                            一键用发票日期
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="sm:col-span-2 flex flex-col gap-1">
                      <label className="text-sm font-medium text-zinc-700">摘要</label>
                      <textarea
                        className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                        rows={2}
                        value={voucherDraft.summary}
                        onChange={(e) =>
                          setVoucherDraft((d) => ({ ...d, summary: e.target.value }))
                        }
                      />
                    </div>
                    <div className="sm:col-span-2 flex flex-wrap gap-3 items-center pt-2">
                      <Button
                        type="button"
                        loading={applyVoucherMutation.isPending}
                        className="gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        确认并写入凭证
                      </Button>
                      <Link
                        href="/dashboard/finance/vouchers"
                        className="text-sm text-zinc-600 hover:text-zinc-900 flex items-center gap-1"
                      >
                        查看凭证库
                        <ArrowRight className="w-4 h-4" />
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

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center py-6">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">凭证写入成功</h3>
            <p className="text-sm text-zinc-600 text-center">
              AI 任务结果已成功写入财务凭证库
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <Button variant="secondary" onClick={() => setShowSuccessDialog(false)}>
              继续处理
            </Button>
            <Link href="/dashboard/finance/vouchers">
              <Button>查看凭证库</Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}