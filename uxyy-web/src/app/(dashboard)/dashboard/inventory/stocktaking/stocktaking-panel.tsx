"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { StocktakingDto, StocktakingStatus, StocktakingItemDto } from "@uxyy/shared";
import {
  fetchStocktakingList,
  createStocktaking,
  fetchStocktaking,
  updateStocktakingItem,
  confirmStocktaking,
} from "@/lib/api/stocktaking";
import { fetchWarehouses } from "@/lib/api/warehouses";
import { fetchAllProducts } from "@/lib/api/products";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NumberInput } from "@/components/ui/input";

const selectCls =
  "rounded-md border border-border-primary bg-bg-secondary text-text-primary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all";

const statusMap: Record<StocktakingStatus, string> = {
  draft: "草稿",
  confirmed: "已确认",
};

const statusColorMap: Record<StocktakingStatus, string> = {
  draft: "text-text-tertiary",
  confirmed: "text-green-600",
};

type ScopeMode = "all" | "subset";

interface StocktakingFormData {
  warehouseId: number;
  scope: ScopeMode;
  /** 仅当 scope === 'subset' 时提交 */
  productIds: number[];
  remark?: string;
}

function StocktakingForm({
  onDone,
}: {
  onDone: () => void;
}) {
  const [formData, setFormData] = useState<StocktakingFormData>({
    warehouseId: 1,
    scope: "all",
    productIds: [],
    remark: "",
  });
  const [error, setError] = useState("");

  const qc = useQueryClient();

  const warehousesQ = useQuery({
    queryKey: ["inventory", "warehouses", "stocktaking-form"],
    queryFn: () => fetchWarehouses(),
  });

  const productsQ = useQuery({
    queryKey: ["inventory", "products", "stocktaking-form"],
    queryFn: () => fetchAllProducts(),
    enabled: formData.scope === "subset",
  });

  /** 初次加载仓库列表后，预选默认仓库或第一个仓库 */
  const warehouseInitRef = useRef(false);

  useEffect(() => {
    if (
      warehouseInitRef.current ||
      !warehousesQ.data?.length ||
      warehousesQ.isLoading
    )
      return;
    const preferred =
      warehousesQ.data.find((w) => w.isDefault) ?? warehousesQ.data[0];
    if (!preferred) return;
    warehouseInitRef.current = true;
    setFormData((prev) =>
      prev.warehouseId === 1 ? { ...prev, warehouseId: preferred.id } : prev,
    );
  }, [warehousesQ.data, warehousesQ.isLoading]);

  const warehouses = warehousesQ.data ?? [];
  const products = productsQ.data ?? [];

  const toggleProduct = (productId: number) => {
    setFormData((prev) => {
      const set = new Set(prev.productIds);
      if (set.has(productId)) set.delete(productId);
      else set.add(productId);
      return { ...prev, productIds: Array.from(set).sort((a, b) => a - b) };
    });
  };

  const selectSubsetAllProducts = () => {
    setFormData((prev) => ({
      ...prev,
      productIds: products.map((p) => p.id),
    }));
  };

  const clearSubset = () => {
    setFormData((prev) => ({ ...prev, productIds: [] }));
  };

  const mutation = useMutation({
    mutationFn: () => {
      const remark = formData.remark?.trim();
      const body: Parameters<typeof createStocktaking>[0] = {
        warehouseId:
          Number.isFinite(formData.warehouseId) && formData.warehouseId > 0
            ? formData.warehouseId
            : 1,
        ...(remark ? { remark } : {}),
      };
      if (formData.scope === "subset") {
        body.productIds = [...formData.productIds];
      }
      return createStocktaking(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory", "stocktaking"] });
      onDone();
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "操作失败"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (formData.scope === "subset" && formData.productIds.length === 0) {
      setError("请选择至少一个要盘点的商品，或改为「盘点全部有库存的商品」");
      return;
    }
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text-secondary">仓库 *</label>
        {warehousesQ.isLoading ? (
          <p className="text-sm text-text-tertiary">加载仓库…</p>
        ) : warehousesQ.isError ? (
          <p className="text-sm text-red-700 bg-red-50 rounded-md px-3 py-2">
            仓库列表加载失败：
            {warehousesQ.error instanceof Error
              ? warehousesQ.error.message
              : String(warehousesQ.error)}
            。请检查登录态与 API 地址后重试。
          </p>
        ) : warehouses.length === 0 ? (
          <>
            <p className="text-sm text-amber-700 bg-amber-50 rounded-md px-3 py-2">
              当前企业在数据库中<strong>尚无仓库主数据</strong>（
              <code className="text-xs">warehouses</code> 表为空），接口{" "}
              <code className="text-xs">GET /inventory/warehouses</code>{" "}
              因此返回空列表。库存里写的{" "}
              <code className="text-xs">warehouseId=1</code> 只是数字，不等于已有仓库档案。
              请到「
              <Link
                href="/dashboard/inventory/warehouses"
                className="underline font-medium text-amber-900"
              >
                进销存 → 仓库管理
              </Link>
              」查看；本地可执行后端{" "}
              <code className="text-xs">pnpm db:seed</code>{" "}
              自动创建「主仓库」，或用 API 新建仓库后再建盘点单。
            </p>
            <NumberInput
              className={selectCls}
              min={1}
              step={1}
              value={formData.warehouseId}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  warehouseId: Number(e.target.value),
                }))
              }
            />
          </>
        ) : (
          <select
            className={selectCls}
            value={String(formData.warehouseId)}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                warehouseId: Number(e.target.value),
              }))
            }
            required
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
                {w.isDefault ? "（默认）" : ""} (#{w.id})
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-border-primary p-3 bg-bg-secondary/80">
        <span className="text-sm font-medium text-text-secondary">盘点范围</span>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="radio"
            name="scope"
            checked={formData.scope === "all"}
            onChange={() =>
              setFormData((prev) => ({ ...prev, scope: "all" }))
            }
          />
          <span>
            <strong className="font-medium text-text-primary">盘点全部</strong>
            ：包含<strong>当前所选仓库</strong>里<strong>有一条及以上库存记录</strong>的商品（不传{" "}
            <code className="text-xs bg-bg-tertiary px-1 rounded text-text-secondary">
              productIds
            </code>
            ，与后端默认行为一致）
          </span>
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="radio"
            name="scope"
            checked={formData.scope === "subset"}
            onChange={() =>
              setFormData((prev) => ({ ...prev, scope: "subset" }))
            }
          />
          <span>
            <strong className="font-medium text-text-primary">仅盘点所选商品</strong>
            ：提交{" "}
            <code className="text-xs bg-bg-tertiary px-1 rounded text-text-secondary">
              productIds
            </code>
          </span>
        </label>
      </div>

      {formData.scope === "subset" && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-text-secondary">
              勾选商品（{formData.productIds.length}）
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={products.length === 0}
                onClick={selectSubsetAllProducts}
              >
                全选
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-text-secondary"
                disabled={formData.productIds.length === 0}
                onClick={clearSubset}
              >
                清空
              </Button>
            </div>
          </div>
          {productsQ.isLoading ? (
            <p className="text-sm text-text-tertiary">加载商品…</p>
          ) : products.length === 0 ? (
            <p className="text-sm text-amber-700 bg-amber-50 rounded-md px-3 py-2">
              暂无商品，请先在「商品管理」中建档。
            </p>
          ) : (
            <div className="max-h-52 overflow-y-auto rounded-md border border-border-primary bg-white px-3 py-2 space-y-1.5 text-sm">
              {products.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-2 cursor-pointer py-0.5"
                >
                  <input
                    type="checkbox"
                    checked={formData.productIds.includes(p.id)}
                    onChange={() => toggleProduct(p.id)}
                  />
                  <span className="text-text-primary">
                    {p.name}{" "}
                    <span className="text-text-tertiary text-xs">
                      ({p.code}) #{p.id}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text-secondary">备注</label>
        <textarea
          className={selectCls}
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
          <h2 className="font-medium text-text-primary">
            盘点单 {stocktaking.stocktakingNo}
          </h2>
          <p className="text-sm text-text-tertiary">
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
          <p className="p-8 text-center text-sm text-text-tertiary">
            暂无盘点明细
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-bg-secondary border-b border-border-secondary">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-text-secondary">商品</th>
                <th className="px-4 py-2 text-right font-medium text-text-secondary">系统库存</th>
                <th className="px-4 py-2 text-right font-medium text-text-secondary">实盘数量</th>
                <th className="px-4 py-2 text-right font-medium text-text-secondary">差异</th>
                <th className="px-4 py-2 text-left font-medium text-text-secondary">备注</th>
                {stocktaking.status === "draft" && (
                  <th className="px-4 py-2 text-center font-medium text-text-secondary">操作</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-secondary">
              {stocktaking.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2">
                    {item.productName ?? `商品 #${item.productId}`}
                  </td>
                  <td className="px-4 py-2 text-right">{item.systemQty}</td>
                  <td className="px-4 py-2 text-right">
                    {editingItem?.id === item.id ? (
                      <NumberInput
                        className="w-20 !h-8 !py-1 !px-2"
                        min={0}
                        step={1}
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
                        className="w-full rounded-md border border-border-primary px-2 py-1 text-sm"
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
        <div className="mb-4 space-y-1">
          <h2 className="font-medium text-text-primary">新建盘点单</h2>
          <p className="text-xs text-text-tertiary">
            请选择仓库与盘点范围（全盘不传 productIds；抽盘勾选商品）
          </p>
        </div>
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
        <h1 className="text-lg font-semibold text-text-primary">库存盘点</h1>
        <Button onClick={() => setCreating(true)}>+ 新建盘点单</Button>
      </div>

      <div className="flex gap-2">
        <select
          className={selectCls}
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
          <p className="text-sm text-text-secondary p-6">加载中…</p>
        ) : q.isError ? (
          <pre className="whitespace-pre-wrap text-sm text-red-700 p-6">
            {q.error instanceof Error ? q.error.message : String(q.error)}
          </pre>
        ) : (
          <>
            <div className="px-4 py-3 text-sm text-text-secondary border-b border-border-secondary flex justify-between">
              <span>
                共 <strong>{q.data?.total ?? 0}</strong> 条 · 第{" "}
                <strong>{q.data?.page ?? page}</strong> 页
              </span>
            </div>

            {!q.data?.list?.length ? (
              <p className="p-8 text-center text-sm text-text-tertiary">
                暂无盘点单数据
              </p>
            ) : (
              <ul className="divide-y divide-border-secondary">
                {(q.data?.list ?? []).map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-medium text-text-primary">
                        {row.stocktakingNo}
                        <span
                          className={`ml-2 text-xs ${statusColorMap[row.status]}`}
                        >
                          {statusMap[row.status]}
                        </span>
                      </div>
                      <div className="text-xs text-text-secondary">
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

            <div className="flex items-center justify-between px-4 py-3 border-t border-border-secondary">
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                上一页
              </Button>
              <span className="text-sm text-text-secondary">
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
