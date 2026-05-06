"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { StocktakingDto, StocktakingStatus, StocktakingItemDto } from "@uxyy/shared";
import {
  fetchStocktakingList,
  createStocktaking,
  fetchStocktaking,
  updateStocktakingItem,
  confirmStocktaking,
} from "@/lib/api/stocktaking";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const statusMap: Record<StocktakingStatus, string> = {
  draft: "草稿",
  confirmed: "已确认",
};

const statusColorMap: Record<StocktakingStatus, string> = {
  draft: "text-zinc-500",
  confirmed: "text-green-600",
};

interface StocktakingFormData {
  warehouseId?: number;
  remark?: string;
}

function StocktakingForm({
  onDone,
}: {
  onDone: () => void;
}) {
  const [formData, setFormData] = useState<StocktakingFormData>({
    warehouseId: 1,
    remark: "",
  });
  const [error, setError] = useState("");

  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => createStocktaking(formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory", "stocktaking"] });
      onDone();
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "操作失败"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Input
        label="仓库ID"
        type="number"
        value={formData.warehouseId}
        onChange={(e) =>
          setFormData((prev) => ({ ...prev, warehouseId: Number(e.target.value) }))
        }
        placeholder="1"
      />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700">备注</label>
        <textarea
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
          rows={2}
          value={formData.remark}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, remark: e.target.value }))
          }
          placeholder="盘点备注..."
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
          创建盘点单
        </Button>
      </div>
    </form>
  );
}

function StocktakingDetail({
  stocktaking,
  onDone,
}: {
  stocktaking: StocktakingDto;
  onDone: () => void;
}) {
  const [editingItem, setEditingItem] = useState<StocktakingItemDto | null>(null);
  const [actualQty, setActualQty] = useState("");
  const [itemRemark, setItemRemark] = useState("");

  const qc = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: number; data: { actualQty: number; remark?: string } }) =>
      updateStocktakingItem(stocktaking.id, itemId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory", "stocktaking", stocktaking.id] });
      setEditingItem(null);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => confirmStocktaking(stocktaking.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory", "stocktaking"] });
      onDone();
    },
  });

  const startEditItem = (item: StocktakingItemDto) => {
    setEditingItem(item);
    setActualQty(String(item.actualQty));
    setItemRemark(item.remark ?? "");
  };

  const saveItem = () => {
    if (!editingItem) return;
    updateMutation.mutate({
      itemId: editingItem.id,
      data: {
        actualQty: Number(actualQty),
        remark: itemRemark,
      },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium text-zinc-900">
            盘点单 {stocktaking.stocktakingNo}
          </h2>
          <p className="text-sm text-zinc-500">
            状态: <span className={statusColorMap[stocktaking.status]}>{statusMap[stocktaking.status]}</span>
            {stocktaking.remark && ` · 备注: ${stocktaking.remark}`}
          </p>
        </div>
        <div className="flex gap-2">
          {stocktaking.status === "draft" && (
            <Button
              onClick={() => confirmMutation.mutate()}
              loading={confirmMutation.isPending}
            >
              确认盘点
            </Button>
          )}
          <Button variant="secondary" onClick={onDone}>
            返回
          </Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        {!stocktaking.items?.length ? (
          <p className="p-8 text-center text-sm text-zinc-500">
            暂无盘点明细
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-100">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-zinc-700">商品</th>
                <th className="px-4 py-2 text-right font-medium text-zinc-700">系统库存</th>
                <th className="px-4 py-2 text-right font-medium text-zinc-700">实盘数量</th>
                <th className="px-4 py-2 text-right font-medium text-zinc-700">差异</th>
                <th className="px-4 py-2 text-left font-medium text-zinc-700">备注</th>
                {stocktaking.status === "draft" && (
                  <th className="px-4 py-2 text-center font-medium text-zinc-700">操作</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {stocktaking.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2">
                    {item.productName ?? `商品 #${item.productId}`}
                  </td>
                  <td className="px-4 py-2 text-right">{item.systemQty}</td>
                  <td className="px-4 py-2 text-right">
                    {editingItem?.id === item.id ? (
                      <input
                        type="number"
                        className="w-20 rounded-md border border-zinc-300 px-2 py-1 text-sm"
                        value={actualQty}
                        onChange={(e) => setActualQty(e.target.value)}
                      />
                    ) : (
                      item.actualQty
                    )}
                  </td>
                  <td className={`px-4 py-2 text-right ${item.difference !== 0 ? 'text-red-600 font-medium' : ''}`}>
                    {item.difference > 0 ? `+${item.difference}` : item.difference}
                  </td>
                  <td className="px-4 py-2">
                    {editingItem?.id === item.id ? (
                      <input
                        type="text"
                        className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm"
                        value={itemRemark}
                        onChange={(e) => setItemRemark(e.target.value)}
                        placeholder="备注"
                      />
                    ) : (
                      item.remark || "-"
                    )}
                  </td>
                  {stocktaking.status === "draft" && (
                    <td className="px-4 py-2 text-center">
                      {editingItem?.id === item.id ? (
                        <div className="flex gap-1 justify-center">
                          <Button
                            variant="secondary"
                            className="text-xs px-2 py-1"
                            onClick={saveItem}
                            loading={updateMutation.isPending}
                          >
                            保存
                          </Button>
                          <Button
                            variant="secondary"
                            className="text-xs px-2 py-1"
                            onClick={() => setEditingItem(null)}
                          >
                            取消
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="secondary"
                          className="text-xs px-2 py-1"
                          onClick={() => startEditItem(item)}
                        >
                          录入
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

export function StocktakingPanel() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StocktakingStatus | undefined>(undefined);
  const [creating, setCreating] = useState(false);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const pageSize = 10;

  const queryKey = useMemo(
    () => ["inventory", "stocktaking", page, pageSize, status],
    [page, status],
  );

  const q = useQuery({
    queryKey,
    queryFn: () => fetchStocktakingList({ page, pageSize, status }),
    placeholderData: (prev) => prev,
  });

  const detailQuery = useQuery({
    queryKey: ["inventory", "stocktaking", viewingId],
    queryFn: () => fetchStocktaking(viewingId!),
    enabled: viewingId !== null,
  });

  const totalPages = Math.max(1, Math.ceil((q.data?.total ?? 0) / pageSize));

  if (creating) {
    return (
      <Card>
        <h2 className="font-medium text-zinc-900 mb-4">新建盘点单</h2>
        <StocktakingForm onDone={() => setCreating(false)} />
      </Card>
    );
  }

  if (viewingId && detailQuery.data) {
    return (
      <StocktakingDetail
        stocktaking={detailQuery.data}
        onDone={() => setViewingId(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900">库存盘点</h1>
        <Button onClick={() => setCreating(true)}>+ 新建盘点单</Button>
      </div>

      <div className="flex gap-2">
        <select
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
          value={status ?? ""}
          onChange={(e) => {
            setStatus((e.target.value as StocktakingStatus) || undefined);
            setPage(1);
          }}
        >
          <option value="">全部状态</option>
          <option value="draft">草稿</option>
          <option value="confirmed">已确认</option>
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
                暂无盘点单数据
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
                        {row.stocktakingNo}
                        <span
                          className={`ml-2 text-xs ${statusColorMap[row.status]}`}
                        >
                          {statusMap[row.status]}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-600">
                        <span className="mr-3">仓库ID: {row.warehouseId}</span>
                        <span>商品数: {row.items?.length ?? 0} 项</span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2 sm:mt-0">
                      <Button
                        variant="secondary"
                        className="text-xs px-2.5 py-1"
                        onClick={() => setViewingId(row.id)}
                      >
                        查看
                      </Button>
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
