"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ProductResponseDto } from "@uxyy/shared";
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "@/lib/api/products";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ExportMenu } from "@/components/export/export-menu";

interface ProductFormData {
  code: string;
  name: string;
  spec?: string;
  unit?: string;
  unitPrice: number;
  costPrice?: number;
  minStock?: number;
  maxStock?: number;
}

function ProductForm({
  init,
  onDone,
}: {
  init?: ProductResponseDto;
  onDone: () => void;
}) {
  const isEdit = !!init;
  const [formData, setFormData] = useState<ProductFormData>({
    code: init?.code ?? "",
    name: init?.name ?? "",
    spec: init?.spec ?? "",
    unit: init?.unit ?? "件",
    unitPrice: init?.unitPrice ?? 0,
    costPrice: init?.costPrice ?? 0,
    minStock: init?.minStock ?? 0,
    maxStock: init?.maxStock ?? 0,
  });
  const [error, setError] = useState("");

  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      isEdit
        ? updateProduct(init!.id, formData)
        : createProduct(formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory", "products"] });
      onDone();
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "操作失败"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name || formData.unitPrice <= 0) {
      setError("请填写必填项");
      return;
    }
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="商品编码 *"
          value={formData.code}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, code: e.target.value }))
          }
          placeholder="P001"
        />
        <Input
          label="商品名称 *"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          placeholder="六角螺栓 M8×30"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="规格"
          value={formData.spec}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, spec: e.target.value }))
          }
          placeholder="M8×30 8.8级"
        />
        <Input
          label="单位"
          value={formData.unit}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, unit: e.target.value }))
          }
          placeholder="件"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="销售单价 *"
          type="number"
          value={formData.unitPrice}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              unitPrice: Number(e.target.value),
            }))
          }
          placeholder="12.50"
        />
        <Input
          label="成本价"
          type="number"
          value={formData.costPrice}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              costPrice: Number(e.target.value),
            }))
          }
          placeholder="8.00"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="最低库存"
          type="number"
          value={formData.minStock}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              minStock: Number(e.target.value),
            }))
          }
          placeholder="10"
        />
        <Input
          label="最高库存"
          type="number"
          value={formData.maxStock}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              maxStock: Number(e.target.value),
            }))
          }
          placeholder="200"
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
    </form>
  );
}

export function ProductsPanel() {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [editing, setEditing] = useState<ProductResponseDto | null>(null);
  const [creating, setCreating] = useState(false);
  const pageSize = 10;

  const qc = useQueryClient();

  const queryKey = useMemo(
    () => ["inventory", "products", page, pageSize, keyword],
    [page, keyword],
  );

  const q = useQuery({
    queryKey,
    queryFn: () => fetchProducts({ page, pageSize, keyword }),
    placeholderData: (prev) => prev,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory", "products"] }),
  });

  const totalPages = Math.max(1, Math.ceil((q.data?.total ?? 0) / pageSize));

  if (creating) {
    return (
      <Card>
        <h2 className="font-medium text-zinc-900 mb-4">新建商品</h2>
        <ProductForm onDone={() => setCreating(false)} />
      </Card>
    );
  }

  if (editing) {
    return (
      <Card>
        <h2 className="font-medium text-zinc-900 mb-4">
          编辑商品 · {editing.name}
        </h2>
        <ProductForm init={editing} onDone={() => setEditing(null)} />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900">商品管理</h1>
        <div className="flex items-center gap-2">
          <ExportMenu type="products" filename="products" />
          <Button onClick={() => setCreating(true)}>+ 新建商品</Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="搜索商品编码/名称..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="max-w-sm"
        />
        <Button
          variant="secondary"
          onClick={() => {
            setPage(1);
            q.refetch();
          }}
        >
          搜索
        </Button>
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
                暂无商品数据
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
                        {row.name}
                        <span className="ml-2 text-xs text-zinc-500">
                          ({row.code})
                        </span>
                      </div>
                      <div className="text-xs text-zinc-600">
                        <span className="mr-3">规格: {row.spec || "-"}</span>
                        <span className="mr-3">单位: {row.unit}</span>
                        <span className="mr-3">
                          单价: ¥{row.unitPrice}
                        </span>
                        <span>库存: {row.currentStock ?? 0}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2 sm:mt-0">
                      <Button
                        variant="secondary"
                        className="text-xs px-2.5 py-1"
                        onClick={() => setEditing(row)}
                      >
                        编辑
                      </Button>
                      <Button
                        variant="secondary"
                        className="text-xs px-2.5 py-1 text-red-600 hover:text-red-700"
                        onClick={() => {
                          if (confirm(`确定删除商品 ${row.name} 吗？`)) {
                            deleteMutation.mutate(row.id);
                          }
                        }}
                      >
                        删除
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
