"use client";

import Image from "next/image";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { postInvoiceOcr } from "@/lib/api/invoices";
import type { InvoiceItem, InvoiceOcrResult } from "@/lib/api/invoice-ocr";
import {
  INVOICE_OCR_PREFILL_STORAGE_KEY,
  type StoredInvoiceOcrPrefillV1,
} from "@/lib/invoice-ocr-prefill";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";

export function InvoiceOcrPanel() {
  const [imageUrl, setImageUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showResult, setShowResult] = useState(false);
  /** 用户在「编辑信息」里保存后的覆盖数据（校验 OCR 结果） */
  const [ocrResult, setOcrResult] = useState<InvoiceOcrResult | null>(null);
  const [savedEdits, setSavedEdits] = useState<InvoiceOcrResult | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<InvoiceOcrResult | null>(null);
  const router = useRouter();

  const submitMutation = useMutation({
    mutationFn: (file: File) => postInvoiceOcr(file),
    onSuccess: (data) => {
      setOcrResult(data as unknown as InvoiceOcrResult);
      setShowResult(true);
    },
    onError: (error: Error) => {
      toast.error(error.message || "识别失败，请重试");
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!selectedFile) return;
    submitMutation.mutate(selectedFile);
  };

  const mergedResult = savedEdits ?? ocrResult;
  const viewResult: InvoiceOcrResult | null =
    editing && draft ? draft : mergedResult;

  const startEdit = () => {
    const base = savedEdits ?? ocrResult;
    if (!base) return;
    setDraft(cloneInvoiceResult(base));
    setEditing(true);
  };

  const saveEdit = () => {
    if (!draft) return;
    setSavedEdits(draft);
    setEditing(false);
    setDraft(null);
    toast.success("已保存修改");
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft(null);
  };

  const handleConfirmEntry = () => {
    const data = savedEdits ?? ocrResult;
    if (!data) {
      toast.error("暂无识别结果");
      return;
    }
    try {
      const body: StoredInvoiceOcrPrefillV1 = {
        v: 1,
        payload: structuredClone(data),
      };
      sessionStorage.setItem(
        INVOICE_OCR_PREFILL_STORAGE_KEY,
        JSON.stringify(body),
      );
    } catch {
      toast.error("无法写入预填数据，请确认未禁用浏览器存储");
      return;
    }
    router.push("/dashboard/finance/invoices");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-text-primary">发票OCR识别</h1>
        <p className="text-sm text-text-secondary">上传发票图片，AI自动识别信息</p>
      </div>

      {!showResult ? (
        <Card className="p-6">
          <h3 className="text-sm font-medium text-text-primary mb-4">上传发票图片</h3>

          <div className="border-2 border-dashed border-border-primary rounded-lg p-8 text-center">
            {selectedFile ? (
              <div className="flex flex-col items-center gap-4">
                <div className="relative max-h-64">
                  <Image
                    src={imageUrl}
                    alt="发票预览"
                    className="max-h-64 object-contain rounded-lg"
                    width={400}
                    height={300}
                  />
                </div>
                <p className="text-sm text-text-secondary">{selectedFile.name}</p>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSelectedFile(null);
                    setImageUrl("");
                  }}
                >
                  重新选择
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-text-muted"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <p className="text-sm text-text-secondary">点击或拖拽上传发票图片</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="invoice-upload"
                />
                <Button onClick={() => document.getElementById("invoice-upload")?.click()}>
                  选择文件
                </Button>
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-center">
            <Button
              onClick={handleSubmit}
              disabled={!selectedFile || submitMutation.isPending}
            >
              {submitMutation.isPending ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  识别中...
                </>
              ) : (
                "开始识别"
              )}
            </Button>
          </div>

          <p className="mt-4 text-xs text-center text-text-tertiary">
            支持 JPG、PNG 格式，建议分辨率不低于 300dpi，单个文件不超过 5MB
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <Button
            variant="secondary"
            onClick={() => {
              setShowResult(false);
              setOcrResult(null);
              setSavedEdits(null);
              setEditing(false);
              setDraft(null);
            }}
          >
            返回上传
          </Button>

          {/* 识别结果 */}
          <Card className="p-4">
            {submitMutation.isError && (
              <p className="text-sm text-red-700">
                {(submitMutation.error as Error).message || "识别失败"}
              </p>
            )}

            {mergedResult && viewResult && (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <Badge className="bg-green-100 text-green-700">识别完成</Badge>
                  {viewResult.confidence > 0 && (
                    <span className="text-xs text-text-tertiary">
                      置信度：{(viewResult.confidence * 100).toFixed(0)}%
                    </span>
                  )}
                  {savedEdits && !editing && (
                    <span className="text-xs text-amber-700">（已人工校对）</span>
                  )}
                </div>

                {editing && draft ? (
                  <>
                    <OcrInvoiceEditForm
                      value={draft}
                      onPatch={(p) => setDraft((d: InvoiceOcrResult | null) => (d ? { ...d, ...p } : null))}
                    />
                    {draft.items.length > 0 && (
                      <p className="mt-2 text-xs text-text-tertiary">
                        商品明细仍以识别结果为准；若需改明细请保存后到「发票管理」新建发票时核对。
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-text-primary">发票信息</h4>
                        <InfoRow label="发票类型" value={viewResult.invoiceType} />
                        <InfoRow label="发票代码" value={viewResult.invoiceCode} />
                        <InfoRow label="发票号码" value={viewResult.invoiceNumber} />
                        <InfoRow label="开票日期" value={viewResult.invoiceDate} />
                      </div>
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-text-primary">购买方</h4>
                        <InfoRow label="名称" value={viewResult.buyerName} />
                        <InfoRow label="税号" value={viewResult.buyerTaxId} />
                        <InfoRow label="地址电话" value={viewResult.buyerAddress} />
                        <InfoRow label="开户行" value={viewResult.buyerBank} />
                      </div>
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-text-primary">销售方</h4>
                        <InfoRow label="名称" value={viewResult.sellerName} />
                        <InfoRow label="税号" value={viewResult.sellerTaxId} />
                        <InfoRow label="地址电话" value={viewResult.sellerAddress} />
                        <InfoRow label="开户行" value={viewResult.sellerBank} />
                      </div>
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-text-primary">金额信息</h4>
                        <InfoRow label="不含税金额" value={`¥${viewResult.amount.toFixed(2)}`} />
                        <InfoRow label="税率" value={viewResult.taxRate} />
                        <InfoRow label="税额" value={`¥${viewResult.taxAmount.toFixed(2)}`} />
                        <InfoRow
                          label="价税合计"
                          value={`¥${viewResult.totalAmount.toFixed(2)}`}
                          highlight
                        />
                      </div>
                    </div>

                    {viewResult.items && viewResult.items.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-text-primary mb-3">商品明细</h4>
                        <Card className="p-0 overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-bg-secondary">
                                <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary">
                                  名称
                                </th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary">
                                  数量
                                </th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary">
                                  单价
                                </th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary">
                                  金额
                                </th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary">
                                  税率
                                </th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary">
                                  税额
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border-secondary">
                              {viewResult.items.map((item: InvoiceItem, index: number) => (
                                <tr key={index}>
                                  <td className="px-4 py-2 text-text-secondary">{item.name}</td>
                                  <td className="px-4 py-2 text-right text-text-secondary">
                                    {item.quantity}
                                  </td>
                                  <td className="px-4 py-2 text-right text-text-secondary">
                                    {item.price != null ? item.price.toFixed(2) : "—"}
                                  </td>
                                  <td className="px-4 py-2 text-right text-text-secondary">
                                    {item.amount != null ? item.amount.toFixed(2) : "—"}
                                  </td>
                                  <td className="px-4 py-2 text-right text-text-secondary">
                                    {item.taxRate}
                                  </td>
                                  <td className="px-4 py-2 text-right text-text-secondary">
                                    {item.taxAmount != null ? item.taxAmount.toFixed(2) : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </Card>
                      </div>
                    )}
                  </>
                )}

                {!editing &&
                  (viewResult.remarks ||
                    viewResult.drawer ||
                    viewResult.reviewer ||
                    viewResult.payee) && (
                    <div className="mt-4 space-y-2">
                      <InfoRow label="备注" value={viewResult.remarks} />
                      <InfoRow label="开票人" value={viewResult.drawer} />
                      <InfoRow label="复核人" value={viewResult.reviewer} />
                      <InfoRow label="收款人" value={viewResult.payee} />
                    </div>
                  )}

                {editing && draft && (
                  <div className="mt-4 space-y-3 rounded-md border border-border-primary p-3">
                    <p className="text-xs font-medium text-text-secondary">其他信息</p>
                    <Input
                      label="备注"
                      value={draft.remarks ?? ""}
                      onChange={(e) =>
                        setDraft((d: InvoiceOcrResult | null) =>
                          d ? { ...d, remarks: e.target.value } : null,
                        )
                      }
                    />
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <Input
                        label="开票人"
                        value={draft.drawer ?? ""}
                        onChange={(e) =>
                          setDraft((d: InvoiceOcrResult | null) =>
                            d ? { ...d, drawer: e.target.value } : null,
                          )
                        }
                      />
                      <Input
                        label="复核人"
                        value={draft.reviewer ?? ""}
                        onChange={(e) =>
                          setDraft((d: InvoiceOcrResult | null) =>
                            d ? { ...d, reviewer: e.target.value } : null,
                          )
                        }
                      />
                      <Input
                        label="收款人"
                        value={draft.payee ?? ""}
                        onChange={(e) =>
                          setDraft((d: InvoiceOcrResult | null) =>
                            d ? { ...d, payee: e.target.value } : null,
                          )
                        }
                      />
                    </div>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {!editing ? (
                    <>
                      <Button type="button" onClick={handleConfirmEntry}>
                        确认入账
                      </Button>
                      <Button variant="secondary" type="button" onClick={startEdit}>
                        编辑信息
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button type="button" onClick={saveEdit}>
                        保存修改
                      </Button>
                      <Button variant="secondary" type="button" onClick={cancelEdit}>
                        取消
                      </Button>
                    </>
                  )}
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function cloneInvoiceResult(r: InvoiceOcrResult): InvoiceOcrResult {
  return structuredClone(r);
}

function OcrInvoiceEditForm({
  value,
  onPatch,
}: {
  value: InvoiceOcrResult;
  onPatch: (p: Partial<InvoiceOcrResult>) => void;
}) {
  const patchNum = (key: "amount" | "taxAmount" | "totalAmount", raw: string) => {
    const v = parseFloat(raw.replace(/,/g, ""));
    onPatch({ [key]: Number.isFinite(v) ? v : 0 } as Partial<InvoiceOcrResult>);
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-text-primary">发票信息</h4>
        <Input
          label="发票类型"
          value={value.invoiceType}
          onChange={(e) => onPatch({ invoiceType: e.target.value })}
        />
        <Input
          label="发票代码"
          value={value.invoiceCode}
          onChange={(e) => onPatch({ invoiceCode: e.target.value })}
        />
        <Input
          label="发票号码"
          value={value.invoiceNumber}
          onChange={(e) => onPatch({ invoiceNumber: e.target.value })}
        />
        <Input
          label="开票日期"
          placeholder="YYYY-MM-DD"
          value={value.invoiceDate}
          onChange={(e) => onPatch({ invoiceDate: e.target.value })}
        />
      </div>
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-text-primary">购买方</h4>
        <Input
          label="名称"
          value={value.buyerName}
          onChange={(e) => onPatch({ buyerName: e.target.value })}
        />
        <Input
          label="税号"
          value={value.buyerTaxId}
          onChange={(e) => onPatch({ buyerTaxId: e.target.value })}
        />
        <Input
          label="地址电话"
          value={value.buyerAddress ?? ""}
          onChange={(e) => onPatch({ buyerAddress: e.target.value })}
        />
        <Input
          label="开户行"
          value={value.buyerBank ?? ""}
          onChange={(e) => onPatch({ buyerBank: e.target.value })}
        />
      </div>
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-text-primary">销售方</h4>
        <Input
          label="名称"
          value={value.sellerName}
          onChange={(e) => onPatch({ sellerName: e.target.value })}
        />
        <Input
          label="税号"
          value={value.sellerTaxId}
          onChange={(e) => onPatch({ sellerTaxId: e.target.value })}
        />
        <Input
          label="地址电话"
          value={value.sellerAddress ?? ""}
          onChange={(e) => onPatch({ sellerAddress: e.target.value })}
        />
        <Input
          label="开户行"
          value={value.sellerBank ?? ""}
          onChange={(e) => onPatch({ sellerBank: e.target.value })}
        />
      </div>
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-text-primary">金额信息</h4>
        <Input
          label="不含税金额"
          inputMode="decimal"
          value={String(value.amount)}
          onChange={(e) => patchNum("amount", e.target.value)}
        />
        <Input
          label="税率"
          value={value.taxRate ?? ""}
          onChange={(e) => onPatch({ taxRate: e.target.value })}
        />
        <Input
          label="税额"
          inputMode="decimal"
          value={String(value.taxAmount)}
          onChange={(e) => patchNum("taxAmount", e.target.value)}
        />
        <Input
          label="价税合计"
          inputMode="decimal"
          value={String(value.totalAmount)}
          onChange={(e) => patchNum("totalAmount", e.target.value)}
        />
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex justify-between text-sm ${
        highlight ? "font-medium text-amber-600" : ""
      }`}
    >
      <span className="text-text-tertiary">{label}</span>
      <span className={highlight ? "text-amber-600" : "text-text-secondary"}>
        {value || "-"}
      </span>
    </div>
  );
}