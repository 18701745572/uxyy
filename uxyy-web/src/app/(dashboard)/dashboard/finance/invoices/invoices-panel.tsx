"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateInvoiceDto,
  InvoiceResponseDto,
  InvoiceStatus,
  InvoiceType,
  InvoiceOcrResult,
} from "@uxyy/shared";
import { invoiceDateStringToEntryDateIso } from "@uxyy/shared";
import {
  fetchInvoices,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  verifyInvoice,
  enterInvoice,
  voidInvoice,
  postInvoiceOcr,
} from "@/lib/api/invoices";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const statusMap: Record<InvoiceStatus, string> = {
  unverified: "未核验",
  verified: "已核验",
  entered: "已入账",
  void: "已作废",
};

const statusColorMap: Record<InvoiceStatus, string> = {
  unverified: "text-yellow-600",
  verified: "text-blue-600",
  entered: "text-green-600",
  void: "text-red-600",
};

const typeMap: Record<InvoiceType, string> = {
  special: "专用发票",
  normal: "普通发票",
  electronic: "电子发票",
};

const OCR_MAX_BYTES = 5 * 1024 * 1024;

interface InvoiceFormData {
  invoiceNo: string;
  invoiceCode?: string;
  type: InvoiceType;
  amount: string;
  taxRate?: string;
  taxAmount?: string;
  totalAmount: string;
  buyerName?: string;
  buyerTaxNo?: string;
  sellerName?: string;
  sellerTaxNo?: string;
  invoiceDate?: string;
  remark?: string;
}

/** 表单字段 → Nest `CreateInvoiceDto`：`invoiceDate` 映射为 `issueDate`，不写未持久化的 remark */
function invoiceFormToWriteDto(form: InvoiceFormData): CreateInvoiceDto {
  const trimmedDate = form.invoiceDate?.trim();
  const issueDate =
    !trimmedDate
      ? undefined
      : invoiceDateStringToEntryDateIso(trimmedDate) ?? undefined;

  return {
    invoiceNo: form.invoiceNo.trim(),
    ...(form.invoiceCode?.trim()
      ? { invoiceCode: form.invoiceCode.trim() }
      : {}),
    type: form.type,
    amount: form.amount.trim(),
    ...(form.taxRate?.trim()
      ? { taxRate: form.taxRate.trim() }
      : {}),
    ...(form.taxAmount?.trim()
      ? { taxAmount: form.taxAmount.trim() }
      : {}),
    totalAmount: form.totalAmount.trim(),
    ...(form.buyerName?.trim()
      ? { buyerName: form.buyerName.trim() }
      : {}),
    ...(form.buyerTaxNo?.trim()
      ? { buyerTaxNo: form.buyerTaxNo.trim() }
      : {}),
    ...(form.sellerName?.trim()
      ? { sellerName: form.sellerName.trim() }
      : {}),
    ...(form.sellerTaxNo?.trim()
      ? { sellerTaxNo: form.sellerTaxNo.trim() }
      : {}),
    ...(issueDate ? { issueDate } : {}),
  };
}

function buildFormFromInit(init?: InvoiceResponseDto): InvoiceFormData {
  const today = new Date().toISOString().split("T")[0];
  return {
    invoiceNo: init?.invoiceNo ?? "",
    invoiceCode: init?.invoiceCode ?? "",
    type: init?.type ?? "normal",
    amount: init?.amount ?? "",
    taxRate: init?.taxRate ?? "",
    taxAmount: init?.taxAmount ?? "",
    totalAmount: init?.totalAmount ?? "",
    buyerName: init?.buyerName ?? "",
    buyerTaxNo: init?.buyerTaxNo ?? "",
    sellerName: init?.sellerName ?? "",
    sellerTaxNo: init?.sellerTaxNo ?? "",
    invoiceDate:
      issueDateToInvoiceFormDate(init?.issueDate ?? undefined) || today,
    remark: "",
  };
}

/** 开票日期（OCR issueDate）→ 表单 `<input type="date">` 用 YYYY-MM-DD */
function issueDateToInvoiceFormDate(raw: string | null | undefined): string {
  if (raw == null || String(raw).trim() === "") return "";
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const iso = invoiceDateStringToEntryDateIso(s);
  return iso ? iso.slice(0, 10) : "";
}

/** 表单已有「业务字段」非空时需二次确认合并策略 */
function hasFilledBusinessFields(f: InvoiceFormData): boolean {
  return !!(
    f.invoiceNo.trim() ||
    f.invoiceCode?.trim() ||
    f.amount.trim() ||
    f.taxRate?.trim() ||
    f.taxAmount?.trim() ||
    f.totalAmount.trim() ||
    f.buyerName?.trim() ||
    f.buyerTaxNo?.trim() ||
    f.sellerName?.trim() ||
    f.sellerTaxNo?.trim() ||
    f.remark?.trim()
  );
}

function ocrToFormDraft(
  ocr: InvoiceOcrResult,
  fallbackInvoiceDate: string,
): Omit<InvoiceFormData, "remark"> {
  const id = issueDateToInvoiceFormDate(ocr.issueDate ?? undefined);
  return {
    invoiceNo: ocr.invoiceNo,
    invoiceCode: ocr.invoiceCode ?? "",
    type: ocr.type,
    amount: ocr.amount,
    taxRate: ocr.taxRate ?? "",
    taxAmount: ocr.taxAmount ?? "",
    totalAmount: ocr.totalAmount,
    buyerName: ocr.buyerName ?? "",
    buyerTaxNo: ocr.buyerTaxNo ?? "",
    sellerName: ocr.sellerName ?? "",
    sellerTaxNo: ocr.sellerTaxNo ?? "",
    invoiceDate: id || fallbackInvoiceDate,
  };
}

/** 全覆盖：替换识别字段，备注保留 */
function mergeOcrReplace(
  prev: InvoiceFormData,
  ocr: InvoiceOcrResult,
): InvoiceFormData {
  const d = ocrToFormDraft(ocr, prev.invoiceDate ?? "");
  return { ...d, remark: prev.remark ?? "" };
}

/** 仅填空白；备注永远不覆盖 */
function mergeOcrFillEmpty(
  prev: InvoiceFormData,
  ocr: InvoiceOcrResult,
): InvoiceFormData {
  const d = ocrToFormDraft(ocr, prev.invoiceDate ?? "");
  const p = (a: string | undefined, b: string): string => {
    const cur = (a ?? "").trim();
    return cur !== "" ? cur : b;
  };

  const mergedType = prev.invoiceNo.trim() ? prev.type : d.type;

  return {
    invoiceNo: p(prev.invoiceNo, d.invoiceNo),
    invoiceCode: p(prev.invoiceCode, d.invoiceCode ?? ""),
    type: mergedType,
    amount: p(prev.amount, d.amount ?? ""),
    taxRate: p(prev.taxRate, d.taxRate ?? ""),
    taxAmount: p(prev.taxAmount, d.taxAmount ?? ""),
    totalAmount: p(prev.totalAmount, d.totalAmount ?? ""),
    buyerName: p(prev.buyerName, d.buyerName ?? ""),
    buyerTaxNo: p(prev.buyerTaxNo, d.buyerTaxNo ?? ""),
    sellerName: p(prev.sellerName, d.sellerName ?? ""),
    sellerTaxNo: p(prev.sellerTaxNo, d.sellerTaxNo ?? ""),
    invoiceDate:
      prev.invoiceDate?.trim() !== "" ? prev.invoiceDate ?? "" : d.invoiceDate,
    remark: prev.remark ?? "",
  };
}

function InvoiceForm({
  init,
  onDone,
}: {
  init?: InvoiceResponseDto;
  onDone: () => void;
}) {
  const isEdit = !!init;

  const [formData, setFormData] = useState<InvoiceFormData>(() =>
    buildFormFromInit(init),
  );
  const [error, setError] = useState("");

  const [ocrStatus, setOcrStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [ocrError, setOcrError] = useState("");
  const [lastOcr, setLastOcr] = useState<InvoiceOcrResult | null>(null);
  const [mergeOpen, setMergeOpen] = useState(false);

  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      isEdit
        ? updateInvoice(init!.id, invoiceFormToWriteDto(formData))
        : createInvoice(invoiceFormToWriteDto(formData)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance", "invoices"] });
      onDone();
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "操作失败"),
  });

  function applyOcrWithMode(mode: "replace" | "fillEmpty") {
    if (!lastOcr) return;
    setFormData((prev) =>
      mode === "replace"
        ? mergeOcrReplace(prev, lastOcr)
        : mergeOcrFillEmpty(prev, lastOcr),
    );
    setMergeOpen(false);
    toast.success(
      mode === "replace"
        ? "已用识别结果覆盖表单（备注已保留）"
        : "已用识别结果填充空白字段",
    );
  }

  function handleRequestApplyOcr() {
    if (!lastOcr) return;
    if (hasFilledBusinessFields(formData)) {
      setMergeOpen(true);
      return;
    }
    applyOcrWithMode("replace");
  }

  async function onPickOcrFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file || isEdit) return;

    if (!file.type.startsWith("image/")) {
      setOcrError("请选择 JPG / PNG / WebP 图片");
      setOcrStatus("error");
      return;
    }
    if (file.size > OCR_MAX_BYTES) {
      setOcrError("图片大小不能超过 5MB");
      setOcrStatus("error");
      return;
    }

    setOcrError("");
    setOcrStatus("loading");
    setLastOcr(null);

    try {
      const res = await postInvoiceOcr(file);
      setLastOcr(res);
      setOcrStatus("success");
      toast.success("识别完成，请核对后填入表单");
    } catch (err) {
      setOcrStatus("error");
      setOcrError(
        err instanceof Error ? err.message : "识别失败，请重试或改用手工录入",
      );
    }
  }

  const ocrConfidencePct = useMemo(() => {
    if (!lastOcr) return null;
    return Math.round(lastOcr.ocrConfidence * 10000) / 100;
  }, [lastOcr]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.invoiceNo || !formData.amount || !formData.totalAmount) {
      setError("请填写必填项");
      return;
    }
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {!isEdit ? (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 px-4 py-3 space-y-2">
          <p className="text-sm font-medium text-zinc-900">上传发票影像（可选）</p>
          <p className="text-xs text-zinc-600">
            支持清晰 JPG / PNG / WebP，最大 5MB。翻拍不清或仅有电子版 PDF / 只有号码时，请直接手工录入。
          </p>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="text-sm text-zinc-700"
            disabled={ocrStatus === "loading"}
            onChange={onPickOcrFile}
          />
          {ocrStatus === "loading" ? (
            <p className="text-sm text-blue-600">识别中…</p>
          ) : null}
          {ocrStatus === "error" && ocrError ? (
            <p className="text-sm text-red-600 rounded-md bg-red-50 px-3 py-2">
              {ocrError}
            </p>
          ) : null}
          {ocrStatus === "success" && lastOcr ? (
            <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium text-zinc-700">识别预览</p>
                {ocrConfidencePct != null ? (
                  <span className="text-xs text-zinc-500">
                    置信度 {ocrConfidencePct}%
                  </span>
                ) : null}
              </div>
              <ul className="text-xs text-zinc-600 grid sm:grid-cols-2 gap-x-4 gap-y-1">
                <li>号码 {lastOcr.invoiceNo}</li>
                <li>
                  类型 {lastOcr.type === "special" ? "专用" : lastOcr.type === "electronic" ? "电子" : "普通"}
                </li>
                {lastOcr.invoiceCode && (
                  <li>代码 {lastOcr.invoiceCode}</li>
                )}
                <li>
                  开票日{" "}
                  {issueDateToInvoiceFormDate(lastOcr.issueDate) || "—"}
                </li>
                <li>不含税金额 ¥{lastOcr.amount}</li>
                <li>税率 {lastOcr.taxRate}%</li>
                <li>税额 ¥{lastOcr.taxAmount}</li>
                <li>价税合计 ¥{lastOcr.totalAmount}</li>
                <li className="sm:col-span-2 truncate">
                  购 {lastOcr.buyerName || "—"} {lastOcr.buyerTaxNo && `(${lastOcr.buyerTaxNo})`}
                </li>
                <li className="sm:col-span-2 truncate">
                  销 {lastOcr.sellerName || "—"} {lastOcr.sellerTaxNo && `(${lastOcr.sellerTaxNo})`}
                </li>
              </ul>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleRequestApplyOcr}
              >
                填入表单
              </Button>
              <p className="text-xs text-zinc-500">
                若表单已有内容，将询问「全覆盖」或「仅填空白项」后再写入。
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="发票号码 *"
          value={formData.invoiceNo}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, invoiceNo: e.target.value }))
          }
          placeholder="4400123111"
        />
        <Input
          label="发票代码"
          value={formData.invoiceCode}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, invoiceCode: e.target.value }))
          }
          placeholder="044001900211"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700">发票类型 *</label>
          <select
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
            value={formData.type}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                type: e.target.value as InvoiceType,
              }))
            }
          >
            <option value="normal">普通发票</option>
            <option value="special">专用发票</option>
            <option value="electronic">电子发票</option>
          </select>
        </div>
        <Input
          label="开票日期"
          type="date"
          value={formData.invoiceDate}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, invoiceDate: e.target.value }))
          }
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Input
          label="不含税金额 *"
          value={formData.amount}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, amount: e.target.value }))
          }
          placeholder="10000.00"
        />
        <Input
          label="税率"
          value={formData.taxRate}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, taxRate: e.target.value }))
          }
          placeholder="13"
        />
        <Input
          label="税额"
          value={formData.taxAmount}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, taxAmount: e.target.value }))
          }
          placeholder="1300.00"
        />
      </div>

      <Input
        label="含税总金额 *"
        value={formData.totalAmount}
        onChange={(e) =>
          setFormData((prev) => ({ ...prev, totalAmount: e.target.value }))
        }
        placeholder="11300.00"
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="购买方名称"
          value={formData.buyerName}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, buyerName: e.target.value }))
          }
          placeholder="某某商贸有限公司"
        />
        <Input
          label="购买方税号"
          value={formData.buyerTaxNo}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, buyerTaxNo: e.target.value }))
          }
          placeholder="91440100MA5xxxxxx"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="销售方名称"
          value={formData.sellerName}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, sellerName: e.target.value }))
          }
          placeholder="某某供应商有限公司"
        />
        <Input
          label="销售方税号"
          value={formData.sellerTaxNo}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, sellerTaxNo: e.target.value }))
          }
          placeholder="91440100MA5yyyyyy"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700">备注</label>
        <textarea
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
          rows={2}
          value={formData.remark}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, remark: e.target.value }))
          }
          placeholder="备注信息..."
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 rounded-md bg-red-50 px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="secondary" onClick={onDone}>
          取消
        </Button>
        <Button type="submit" loading={mutation.isPending}>
          {isEdit ? "保存" : "创建"}
        </Button>
      </div>

      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>如何用识别结果更新表单？</DialogTitle>
            <DialogDescription>
              当前表单中已有发票号码、金额或购销方等内容。请选择一种合并方式；「备注」在两种写入方式下均不会被 OCR 覆盖。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setMergeOpen(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => applyOcrWithMode("fillEmpty")}
            >
              仅填入空白字段
            </Button>
            <Button
              type="button"
              onClick={() => applyOcrWithMode("replace")}
            >
              全覆盖（保留备注）
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}

export function InvoicesPanel() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<InvoiceStatus | undefined>(undefined);
  const [editing, setEditing] = useState<InvoiceResponseDto | null>(null);
  const [creating, setCreating] = useState(false);
  const pageSize = 10;

  const qc = useQueryClient();

  const queryKey = useMemo(
    () => ["finance", "invoices", page, pageSize, status],
    [page, status],
  );

  const q = useQuery({
    queryKey,
    queryFn: () => fetchInvoices({ page, pageSize, status }),
    placeholderData: (prev) => prev,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteInvoice,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["finance", "invoices"] }),
  });

  const verifyMutation = useMutation({
    mutationFn: verifyInvoice,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["finance", "invoices"] }),
  });

  const enterMutation = useMutation({
    mutationFn: enterInvoice,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["finance", "invoices"] }),
  });

  const voidMutation = useMutation({
    mutationFn: voidInvoice,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["finance", "invoices"] }),
  });

  const totalPages = Math.max(1, Math.ceil((q.data?.total ?? 0) / pageSize));

  if (creating) {
    return (
      <Card>
        <h2 className="font-medium text-zinc-900 mb-4">新建发票</h2>
        <InvoiceForm onDone={() => setCreating(false)} />
      </Card>
    );
  }

  if (editing) {
    return (
      <Card>
        <h2 className="font-medium text-zinc-900 mb-4">
          编辑发票 · {editing.invoiceNo}
        </h2>
        <InvoiceForm init={editing} onDone={() => setEditing(null)} />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900">发票管理</h1>
        <Button onClick={() => setCreating(true)}>+ 新建发票</Button>
      </div>

      <div className="flex gap-2">
        <select
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
          value={status ?? ""}
          onChange={(e) => {
            setStatus((e.target.value as InvoiceStatus) || undefined);
            setPage(1);
          }}
        >
          <option value="">全部状态</option>
          <option value="unverified">未核验</option>
          <option value="verified">已核验</option>
          <option value="entered">已入账</option>
          <option value="void">已作废</option>
        </select>
      </div>

      <Card className="p-0 overflow-hidden">
        {q.isLoading ? (
          <p className="text-sm text-zinc-600 p-6">加载中…</p>
        ) : q.isError ? (
          <pre className="whitespace-pre-wrap text-sm text-red-700 p-6">
            {q.error instanceof Error ? q.error.message : String(q.error)}
          </pre>
        ) : (
          <>
            <div className="px-4 py-3 text-sm text-zinc-600 border-b border-zinc-100 flex justify-between">
              <span>
                共 <strong>{q.data?.total ?? 0}</strong> 条 · 第{" "}
                <strong>{q.data?.page ?? page}</strong> 页
              </span>
            </div>

            {!q.data?.list?.length ? (
              <p className="p-8 text-center text-sm text-zinc-500">
                暂无发票数据
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {(q.data?.list ?? []).map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-medium text-zinc-900">
                        {row.invoiceNo}
                        <span className="ml-2 text-xs text-zinc-500">
                          {typeMap[row.type]}
                        </span>
                        <span
                          className={`ml-2 text-xs ${statusColorMap[row.status]}`}
                        >
                          {statusMap[row.status]}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-600">
                        <span className="mr-3">
                          金额: ¥{row.totalAmount}
                        </span>
                        <span className="mr-3">
                          购买方: {row.buyerName || "-"}
                        </span>
                        <span>
                          销售方: {row.sellerName || "-"}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2 sm:mt-0">
                      {row.status === "unverified" && (
                        <>
                          <Button
                            variant="secondary"
                            className="text-xs px-2.5 py-1"
                            onClick={() => setEditing(row)}
                          >
                            编辑
                          </Button>
                          <Button
                            variant="secondary"
                            className="text-xs px-2.5 py-1"
                            onClick={() => verifyMutation.mutate(row.id)}
                          >
                            核验
                          </Button>
                          <Button
                            variant="secondary"
                            className="text-xs px-2.5 py-1 text-red-600 hover:text-red-700"
                            onClick={() => {
                              if (confirm(`确定删除发票 ${row.invoiceNo} 吗？`)) {
                                deleteMutation.mutate(row.id);
                              }
                            }}
                          >
                            删除
                          </Button>
                        </>
                      )}
                      {row.status === "verified" && (
                        <Button
                          variant="secondary"
                          className="text-xs px-2.5 py-1"
                          onClick={() => enterMutation.mutate(row.id)}
                        >
                          入账
                        </Button>
                      )}
                      {(row.status === "unverified" || row.status === "verified") && (
                        <Button
                          variant="secondary"
                          className="text-xs px-2.5 py-1 text-red-600 hover:text-red-700"
                          onClick={() => voidMutation.mutate(row.id)}
                        >
                          作废
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100">
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                上一页
              </Button>
              <span className="text-sm text-zinc-600">
                {page} / {totalPages}
              </span>
              <Button
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                下一页
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
