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
import { applyAiTaskVoucher, submitAiTask, fetchAiTask } from "@/lib/api/ai";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  FileText,
  Sparkle,
  Tag,
  UploadSimple,
  CheckCircle,
  XCircle,
  Clock,
  Spinner,
  Brain,
  Receipt,
  ArrowRight,
  MagicWand,
} from "@phosphor-icons/react";

const taskTypeMap: Record<
  AiTaskType,
  { label: string; desc: string; icon: React.ReactNode }
> = {
  ocr_invoice: {
    label: "发票 OCR 识别",
    desc: "上传发票图片，自动识别票面信息并生成会计分录",
    icon: <Receipt className="w-5 h-5" />,
  },
  accounting_suggestion: {
    label: "会计分录建议",
    desc: "输入业务描述，AI 智能推荐合适的借贷科目",
    icon: <Sparkle className="w-5 h-5" />,
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
      const base64 = (reader.result as string).split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
  });
}

function OcrResultDisplay({ data }: { data: Record<string, unknown> }) {
  const getString = (key: string): string => {
    const val = data[key];
    return typeof val === "string"
      ? val
      : typeof val === "number"
        ? String(val)
        : "-";
  };

  const getNumber = (key: string): number => {
    const val = data[key];
    return typeof val === "number" ? val : 0;
  };

  const items = Array.isArray(data.items)
    ? (data.items as Array<Record<string, unknown>>)
    : [];
  const confidence = getNumber("confidence");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-bg-secondary p-2 rounded-lg border border-border-primary">
          <span className="text-text-tertiary">发票类型</span>
          <p className="font-medium text-text-primary">
            {getString("invoiceType")}
          </p>
        </div>
        <div className="bg-bg-secondary p-2 rounded-lg border border-border-primary">
          <span className="text-text-tertiary">开票日期</span>
          <p className="font-medium text-text-primary">
            {getString("invoiceDate")}
          </p>
        </div>
        <div className="bg-bg-secondary p-2 rounded-lg border border-border-primary">
          <span className="text-text-tertiary">发票代码</span>
          <p className="font-medium text-text-primary">
            {getString("invoiceCode")}
          </p>
        </div>
        <div className="bg-bg-secondary p-2 rounded-lg border border-border-primary">
          <span className="text-text-tertiary">发票号码</span>
          <p className="font-medium text-text-primary">
            {getString("invoiceNumber")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-bg-secondary p-2 rounded-lg border border-border-primary">
          <span className="text-text-tertiary">不含税金额</span>
          <p className="font-medium text-text-brand">
            ¥{getNumber("amount").toFixed(2)}
          </p>
        </div>
        <div className="bg-bg-secondary p-2 rounded-lg border border-border-primary">
          <span className="text-text-tertiary">税额</span>
          <p className="font-medium text-text-primary">
            ¥{getNumber("taxAmount").toFixed(2)}
          </p>
        </div>
        <div className="bg-bg-secondary p-2 rounded-lg border border-border-primary">
          <span className="text-text-tertiary">价税合计</span>
          <p className="font-medium text-text-success">
            ¥{getNumber("totalAmount").toFixed(2)}
          </p>
        </div>
      </div>

      <div className="bg-bg-secondary p-2 rounded-lg border border-border-primary text-xs">
        <p className="text-text-tertiary mb-1">购买方</p>
        <p className="font-medium text-text-primary">
          {getString("buyerName")}
        </p>
        <p className="text-text-secondary mt-1">
          税号: {getString("buyerTaxId")}
        </p>
        {Boolean(data.buyerAddress) && (
          <p className="text-text-secondary">
            地址电话: {getString("buyerAddress")}
          </p>
        )}
        {Boolean(data.buyerBank) && (
          <p className="text-text-secondary">
            开户行: {getString("buyerBank")}
          </p>
        )}
      </div>

      <div className="bg-bg-secondary p-2 rounded-lg border border-border-primary text-xs">
        <p className="text-text-tertiary mb-1">销售方</p>
        <p className="font-medium text-text-primary">
          {getString("sellerName")}
        </p>
        <p className="text-text-secondary mt-1">
          税号: {getString("sellerTaxId")}
        </p>
        {Boolean(data.sellerAddress) && (
          <p className="text-text-secondary">
            地址电话: {getString("sellerAddress")}
          </p>
        )}
        {Boolean(data.sellerBank) && (
          <p className="text-text-secondary">
            开户行: {getString("sellerBank")}
          </p>
        )}
      </div>

      {items.length > 0 && (
        <div className="bg-bg-secondary p-2 rounded-lg border border-border-primary text-xs">
          <p className="text-text-tertiary mb-2">商品明细</p>
          <div className="space-y-1">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="flex justify-between py-1 border-b border-border-primary last:border-0"
              >
                <span className="flex-1 text-text-primary">
                  {String(item.name ?? "-")}
                </span>
                <span className="text-text-tertiary w-16 text-right">
                  {String(item.quantity ?? "0")}
                  {String(item.unit ?? "")}
                </span>
                <span className="w-20 text-right text-text-primary">
                  ¥{Number(item.amount ?? 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs">
        {Boolean(data.drawer) && (
          <div className="bg-bg-secondary p-2 rounded-lg border border-border-primary">
            <span className="text-text-tertiary">开票人</span>
            <p className="font-medium text-text-primary">
              {getString("drawer")}
            </p>
          </div>
        )}
        {Boolean(data.reviewer) && (
          <div className="bg-bg-secondary p-2 rounded-lg border border-border-primary">
            <span className="text-text-tertiary">复核人</span>
            <p className="font-medium text-text-primary">
              {getString("reviewer")}
            </p>
          </div>
        )}
        {Boolean(data.payee) && (
          <div className="bg-bg-secondary p-2 rounded-lg border border-border-primary">
            <span className="text-text-tertiary">收款人</span>
            <p className="font-medium text-text-primary">
              {getString("payee")}
            </p>
          </div>
        )}
        <div className="bg-bg-secondary p-2 rounded-lg border border-border-primary">
          <span className="text-text-tertiary">置信度</span>
          <p className="font-medium text-text-primary">
            {Math.round(confidence * 100)}%
          </p>
        </div>
      </div>

      {Boolean(data.remarks) && (
        <div className="bg-bg-secondary p-2 rounded-lg border border-border-primary text-xs">
          <span className="text-text-tertiary">备注</span>
          <p className="mt-1 text-text-primary">{getString("remarks")}</p>
        </div>
      )}
    </div>
  );
}

const statusMap: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pending: {
    label: "等待中",
    color: "text-warning",
    icon: <Clock className="w-4 h-4" />,
  },
  processing: {
    label: "处理中",
    color: "text-accent-blue",
    icon: <Spinner className="w-4 h-4 animate-spin" />,
  },
  completed: {
    label: "已完成",
    color: "text-success",
    icon: <CheckCircle className="w-4 h-4" />,
  },
  failed: {
    label: "失败",
    color: "text-error",
    icon: <XCircle className="w-4 h-4" />,
  },
  dead: {
    label: "已入死信",
    color: "text-text-muted",
    icon: <XCircle className="w-4 h-4" />,
  },
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

    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件（JPG、PNG 等）");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("图片大小不能超过 5MB");
      return;
    }

    setSelectedFile(file);
    setError("");

    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);

    try {
      const base64 = await fileToBase64(file);
      setPayload(JSON.stringify({ imageBase64: base64 }, null, 2));
    } catch {
      setError("图片读取失败");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalPayload: Record<string, unknown>;

      if (taskType === "ocr_invoice" && selectedFile) {
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
    if (
      !currentTask ||
      currentTask.status !== "completed" ||
      !currentTask.outputPayload
    ) {
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
    const p = currentTask?.outputPayload as
      | Record<string, unknown>
      | null
      | undefined;
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
        data.created
          ? "已写入财务凭证库"
          : "该任务已生成过凭证，已返回已有记录",
      );
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "写入凭证失败");
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center">
          <Brain className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-text-primary">AI 助手</h1>
          <p className="text-sm text-text-secondary">
            智能发票识别 · 会计分录建议 · 智能分类
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {AI_TASK_TYPES.map((type) => (
          <Card
            key={type}
            className={`p-4 cursor-pointer transition-all duration-200 hover:shadow-glow ${
              taskType === type
                ? "ring-2 ring-accent-purple bg-accent-purple/10 border-accent-purple/50"
                : "bg-bg-secondary border-border-primary hover:bg-bg-tertiary hover:border-border-secondary"
            }`}
            onClick={() => setTaskType(type)}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  taskType === type
                    ? "bg-gradient-to-br from-accent-purple to-accent-blue text-white"
                    : "bg-bg-tertiary text-text-secondary"
                }`}
              >
                {taskTypeMap[type]?.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-text-primary">
                  {taskTypeMap[type]?.label}
                </h3>
                <p className="text-xs text-text-muted mt-1 line-clamp-2">
                  {taskTypeMap[type]?.desc}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="bg-bg-secondary border-border-primary">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-text-tertiary" />
          <h2 className="font-medium text-text-primary">提交 AI 任务</h2>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-secondary">
              任务类型
            </label>
            <div className="flex items-center gap-2 p-3 bg-bg-tertiary rounded-lg border border-border-primary">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  taskType === "ocr_invoice"
                    ? "bg-gradient-to-br from-accent-purple to-accent-blue text-white"
                    : "bg-bg-secondary text-text-muted"
                }`}
              >
                {taskTypeMap[taskType]?.icon}
              </div>
              <span className="font-medium text-text-primary">
                {taskTypeMap[taskType]?.label}
              </span>
            </div>
          </div>

          <Input
            label="幂等键（可选）"
            value={clientKey}
            onChange={(e) => setClientKey(e.target.value)}
            placeholder="用于防止重复创建任务"
          />

          {taskType === "ocr_invoice" && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary flex items-center gap-2">
                  <UploadSimple className="w-4 h-4" />
                  上传发票图片
                </label>
                <div className="border-2 border-dashed border-border-primary rounded-lg p-6 text-center hover:border-accent-purple/50 hover:bg-accent-purple/5 transition-all duration-200">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="invoice-upload"
                  />
                  <label htmlFor="invoice-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center">
                        <UploadSimple className="w-6 h-6 text-text-tertiary" />
                      </div>
                      <p className="text-sm text-text-secondary">
                        点击上传或拖拽图片到此处
                      </p>
                      <p className="text-xs text-text-muted">
                        支持 JPG、PNG 格式，最大 5MB
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {imagePreview && (
                <div className="relative p-2 border border-border-primary rounded-lg bg-bg-tertiary">
                  <p className="text-xs text-text-tertiary mb-2">图片预览：</p>
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
                    className="absolute top-2 right-2 text-text-muted hover:text-text-primary"
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

          {taskType !== "ocr_invoice" && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-secondary">
                任务参数 (JSON)
              </label>
              <textarea
                className="rounded-lg border border-border-primary bg-bg-tertiary px-3 py-2 text-sm text-text-primary placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-accent-purple/20 focus:border-accent-purple font-mono resize-y"
                rows={5}
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                placeholder='{"description": "购买办公用品100元"}'
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-error rounded-lg bg-error/10 border border-error/30 px-3 py-2 flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              {error}
            </p>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              loading={submitMutation.isPending}
              size="sm"
              className="h-10 px-4 bg-gradient-to-r from-accent-blue via-accent-purple to-accent-pink hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 transition-all duration-200"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/20">
                  <Sparkle
                    className="w-3.5 h-3.5 text-white"
                    weight="regular"
                  />
                </div>
                <span className="text-white font-medium">提交任务</span>
              </div>
            </Button>
          </div>
        </form>
      </Card>

      {currentTask && (
        <Card className="bg-bg-secondary border-border-primary">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-text-tertiary" />
            <h2 className="font-medium text-text-primary">任务状态</h2>
            {taskQuery.isFetching && (
              <Spinner className="w-4 h-4 animate-spin text-accent-blue" />
            )}
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-bg-tertiary rounded-lg border border-border-primary">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  currentTask.status === "completed"
                    ? "bg-success/20"
                    : currentTask.status === "failed"
                      ? "bg-error/20"
                      : currentTask.status === "processing"
                        ? "bg-accent-blue/20"
                        : "bg-warning/20"
                }`}
              >
                <span className={statusMap[currentTask.status]?.color}>
                  {statusMap[currentTask.status]?.icon}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-text-primary">
                    任务 #{currentTask.id}
                  </span>
                  <Badge
                    className={
                      currentTask.status === "completed"
                        ? "bg-success/20 text-success border-success/30"
                        : currentTask.status === "failed"
                          ? "bg-error/20 text-error border-error/30"
                          : currentTask.status === "processing"
                            ? "bg-accent-blue/20 text-accent-blue border-accent-blue/30"
                            : "bg-warning/20 text-warning border-warning/30"
                    }
                  >
                    {statusMap[currentTask.status]?.label}
                  </Badge>
                </div>
                <p className="text-sm text-text-secondary mt-1">
                  {taskTypeMap[currentTask.taskType]?.label ||
                    currentTask.taskType}
                </p>
              </div>
              {currentTask.status === "completed" && (
                <div className="flex items-center gap-1 text-success">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">完成</span>
                </div>
              )}
            </div>

            {currentTask.clientKey && (
              <div className="flex justify-between text-sm">
                <span className="text-text-tertiary">幂等键</span>
                <span className="font-medium text-text-primary">
                  {currentTask.clientKey}
                </span>
              </div>
            )}
            {currentTask.attempts > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-text-tertiary">尝试次数</span>
                <span className="font-medium text-text-primary">
                  {currentTask.attempts}
                </span>
              </div>
            )}
            {currentTask.errorMessage && (
              <div className="p-4 bg-error/10 rounded-lg border border-error/30">
                <p className="text-sm text-error font-medium flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  错误信息
                </p>
                <p className="text-sm text-error/80 mt-2">
                  {currentTask.errorMessage}
                </p>
              </div>
            )}
            {currentTask.outputPayload && (
              <div className="p-4 bg-bg-tertiary rounded-lg border border-border-primary">
                <p className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  输出结果
                </p>
                {currentTask.taskType === "ocr_invoice" && (
                  <OcrResultDisplay
                    data={currentTask.outputPayload as Record<string, unknown>}
                  />
                )}
                {currentTask.taskType !== "ocr_invoice" && (
                  <pre className="text-xs text-text-primary overflow-auto bg-bg-secondary p-3 rounded-lg border border-border-primary">
                    {JSON.stringify(currentTask.outputPayload, null, 2)}
                  </pre>
                )}
              </div>
            )}

            {currentTask.status === "completed" &&
              currentTask.outputPayload && (
                <div className="border-t border-border-primary pt-4 mt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <MagicWand className="w-5 h-5 text-accent-purple" />
                    <h3 className="font-medium text-text-primary">
                      写入财务凭证
                    </h3>
                  </div>
                  {suggested ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {currentTask.taskType === "ocr_invoice" && (
                        <p className="sm:col-span-2 text-xs text-text-secondary bg-accent-blue/10 border border-accent-blue/30 rounded-lg px-3 py-2">
                          发票 OCR 成功后，系统按<strong>采购费用</strong>
                          预设为借「管理费用」、贷「应付账款」；若实为销售开票或对公已付款，请在写入前改为「应收账款
                          / 主营业务收入」「银行存款」等正确科目。
                        </p>
                      )}
                      <Input
                        label="借方科目"
                        value={voucherDraft.debitAccount}
                        onChange={(e) =>
                          setVoucherDraft((d) => ({
                            ...d,
                            debitAccount: e.target.value,
                          }))
                        }
                      />
                      <Input
                        label="贷方科目"
                        value={voucherDraft.creditAccount}
                        onChange={(e) =>
                          setVoucherDraft((d) => ({
                            ...d,
                            creditAccount: e.target.value,
                          }))
                        }
                      />
                      <Input
                        label="金额"
                        value={voucherDraft.amount}
                        onChange={(e) =>
                          setVoucherDraft((d) => ({
                            ...d,
                            amount: e.target.value,
                          }))
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
                        <label className="text-sm font-medium text-text-secondary">
                          摘要
                        </label>
                        <textarea
                          className="rounded-lg border border-border-primary bg-bg-tertiary px-3 py-2 text-sm text-text-primary placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-accent-purple/20 focus:border-accent-purple resize-y"
                          rows={2}
                          value={voucherDraft.summary}
                          onChange={(e) =>
                            setVoucherDraft((d) => ({
                              ...d,
                              summary: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="sm:col-span-2 flex flex-wrap gap-3 items-center pt-2">
                        <Button
                          type="button"
                          loading={applyVoucherMutation.isPending}
                          className="gap-2 bg-gradient-to-r from-accent-purple to-accent-blue hover:from-purple-600 hover:to-blue-600"
                        >
                          <CheckCircle className="w-4 h-4" />
                          确认并写入凭证
                        </Button>
                        <Link
                          href="/dashboard/finance/vouchers"
                          className="text-sm text-text-tertiary hover:text-text-primary flex items-center gap-1 transition-colors"
                        >
                          查看凭证库
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-warning bg-warning/10 border border-warning/30 rounded-lg px-3 py-2">
                      当前输出无法自动生成凭证草稿：分录类任务需输出{" "}
                      <code className="text-xs text-text-secondary">
                        entries
                      </code>
                      （一借一贷、借贷平衡）；发票 OCR
                      需能识别购/销方及价税金额。请核对 OCR
                      结构化结果后重试，或直接在财务模块手工入账。
                    </p>
                  )}
                </div>
              )}
          </div>
        </Card>
      )}

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md bg-bg-secondary border-border-primary">
          <div className="flex flex-col items-center py-6">
            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              凭证写入成功
            </h3>
            <p className="text-sm text-text-secondary text-center">
              AI 任务结果已成功写入财务凭证库
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowSuccessDialog(false)}
            >
              继续处理
            </Button>
            <Button
              className="bg-gradient-to-r from-accent-purple to-accent-blue"
              asChild
            >
              <Link href="/dashboard/finance/vouchers">查看凭证库</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
