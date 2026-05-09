"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { submitOcrTask, getOcrTask, type InvoiceOcrResult } from "@/lib/api/invoice-ocr";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

export function InvoiceOcrPanel() {
  const [imageUrl, setImageUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const queryClient = useQueryClient();

  // 提交OCR任务
  const submitMutation = useMutation({
    mutationFn: (url: string) => submitOcrTask(url),
    onSuccess: (data) => {
      setCurrentTaskId(data.id);
      setShowResult(true);
    },
  });

  // 查询任务状态
  const taskQuery = useQuery({
    queryKey: ["ocr-task", currentTaskId],
    queryFn: () => getOcrTask(currentTaskId!),
    enabled: currentTaskId !== null,
    refetchInterval: (data) => {
      if (!data) return false;
      const task = data as { status?: string };
      return task.status === "pending" || task.status === "processing" ? 2000 : false;
    },
  });

  // 监听任务完成
  useEffect(() => {
    if (taskQuery.data?.status === "completed") {
      queryClient.cancelQueries({ queryKey: ["ocr-task"] });
    }
  }, [taskQuery.data?.status, queryClient]);

  // 处理文件上传
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // 模拟上传到服务器，这里直接使用base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 提交识别
  const handleSubmit = () => {
    if (!imageUrl) return;
    setUploading(true);
    // 模拟上传到服务器后获取URL
    setTimeout(() => {
      // 使用mock URL或实际上传后的URL
      submitMutation.mutate(imageUrl);
      setUploading(false);
    }, 500);
  };

  const ocrResult = taskQuery.data?.outputPayload as InvoiceOcrResult | null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-zinc-900">发票OCR识别</h1>
        <p className="text-sm text-zinc-600">上传发票图片，AI自动识别信息</p>
      </div>

      {!showResult ? (
        <Card className="p-6">
          <h3 className="text-sm font-medium text-zinc-900 mb-4">上传发票图片</h3>

          <div className="border-2 border-dashed border-zinc-300 rounded-lg p-8 text-center">
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
                <p className="text-sm text-zinc-600">{selectedFile.name}</p>
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
                <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-zinc-400"
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
                <p className="text-sm text-zinc-600">点击或拖拽上传发票图片</p>
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
              disabled={!selectedFile || uploading || submitMutation.status === 'pending'}
            >
              {uploading || submitMutation.status === 'pending' ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  {uploading ? "上传中..." : "识别中..."}
                </>
              ) : (
                "开始识别"
              )}
            </Button>
          </div>

          <p className="mt-4 text-xs text-center text-zinc-500">
            支持 JPG、PNG、PDF 格式，建议分辨率不低于 300dpi
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <Button variant="secondary" onClick={() => setShowResult(false)}>
            返回上传
          </Button>

          {/* 识别状态 */}
          <Card className="p-4">
            {taskQuery.isLoading && (
              <div className="flex items-center justify-center gap-2">
                <Spinner className="w-5 h-5" />
                <span className="text-sm text-zinc-600">AI 正在识别中...</span>
              </div>
            )}

            {taskQuery.data?.status === "completed" && ocrResult && (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <Badge className="bg-green-100 text-green-700">识别完成</Badge>
                  <span className="text-xs text-zinc-500">
                    置信度：{(ocrResult.confidence * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 发票基本信息 */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-zinc-900">发票信息</h4>
                    <InfoRow label="发票类型" value={ocrResult.invoiceType} />
                    <InfoRow label="发票代码" value={ocrResult.invoiceCode} />
                    <InfoRow label="发票号码" value={ocrResult.invoiceNumber} />
                    <InfoRow label="开票日期" value={ocrResult.invoiceDate} />
                  </div>

                  {/* 购买方信息 */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-zinc-900">购买方</h4>
                    <InfoRow label="名称" value={ocrResult.buyerName} />
                    <InfoRow label="税号" value={ocrResult.buyerTaxId} />
                    <InfoRow label="地址电话" value={ocrResult.buyerAddress} />
                    <InfoRow label="开户行" value={ocrResult.buyerBank} />
                  </div>

                  {/* 销售方信息 */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-zinc-900">销售方</h4>
                    <InfoRow label="名称" value={ocrResult.sellerName} />
                    <InfoRow label="税号" value={ocrResult.sellerTaxId} />
                    <InfoRow label="地址电话" value={ocrResult.sellerAddress} />
                    <InfoRow label="开户行" value={ocrResult.sellerBank} />
                  </div>

                  {/* 金额信息 */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-zinc-900">金额信息</h4>
                    <InfoRow label="不含税金额" value={`¥${ocrResult.amount.toFixed(2)}`} />
                    <InfoRow label="税率" value={ocrResult.taxRate} />
                    <InfoRow label="税额" value={`¥${ocrResult.taxAmount.toFixed(2)}`} />
                    <InfoRow
                      label="价税合计"
                      value={`¥${ocrResult.totalAmount.toFixed(2)}`}
                      highlight
                    />
                  </div>
                </div>

                {/* 商品明细 */}
                {ocrResult.items && ocrResult.items.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-zinc-900 mb-3">商品明细</h4>
                    <Card className="p-0 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-zinc-50">
                            <th className="px-4 py-2 text-left text-xs font-medium text-zinc-600">
                              名称
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-zinc-600">
                              数量
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-zinc-600">
                              单价
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-zinc-600">
                              金额
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-zinc-600">
                              税率
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-zinc-600">
                              税额
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {ocrResult.items.map((item, index) => (
                            <tr key={index}>
                              <td className="px-4 py-2 text-zinc-700">{item.name}</td>
                              <td className="px-4 py-2 text-right text-zinc-600">
                                {item.quantity}
                              </td>
                              <td className="px-4 py-2 text-right text-zinc-600">
                                {item.price?.toFixed(2)}
                              </td>
                              <td className="px-4 py-2 text-right text-zinc-600">
                                {item.amount?.toFixed(2)}
                              </td>
                              <td className="px-4 py-2 text-right text-zinc-600">
                                {item.taxRate}
                              </td>
                              <td className="px-4 py-2 text-right text-zinc-600">
                                {item.taxAmount?.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Card>
                  </div>
                )}

                {/* 其他信息 */}
                {(ocrResult.remarks || ocrResult.drawer || ocrResult.reviewer || ocrResult.payee) && (
                  <div className="mt-4 space-y-2">
                    <InfoRow label="备注" value={ocrResult.remarks} />
                    <InfoRow label="开票人" value={ocrResult.drawer} />
                    <InfoRow label="复核人" value={ocrResult.reviewer} />
                    <InfoRow label="收款人" value={ocrResult.payee} />
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <Button>确认入账</Button>
                  <Button variant="secondary">编辑信息</Button>
                </div>
              </>
            )}

            {taskQuery.data?.status === "failed" && (
              <div className="text-center py-8">
                <p className="text-sm text-red-700 mb-2">识别失败</p>
                <p className="text-xs text-zinc-500">
                  {taskQuery.data.errorMessage || "请重试或检查图片质量"}
                </p>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowResult(false);
                    setCurrentTaskId(null);
                  }}
                  className="mt-4"
                >
                  重新上传
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}
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
      <span className="text-zinc-500">{label}</span>
      <span className={highlight ? "text-amber-600" : "text-zinc-700"}>
        {value || "-"}
      </span>
    </div>
  );
}