"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupplierResponseDto } from "@uxyy/shared";
import {
  fetchSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "@/lib/api/suppliers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface SupplierFormData {
  name: string;
  contactName?: string;
  phone?: string;
  address?: string;
  status?: string;
}

function SupplierForm({
  init,
  onDone,
}: {
  init?: SupplierResponseDto;
  onDone: () => void;
}) {
  const isEdit = !!init;
  const [formData, setFormData] = useState<SupplierFormData>({
    name: init?.name ?? "",
    contactName: init?.contactName ?? "",
    phone: init?.phone ?? "",
    address: init?.address ?? "",
    status: init?.status ?? "active",
  });
  const [error, setError] = useState("");

  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      isEdit
        ? updateSupplier(init!.id, formData)
        : createSupplier(formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory", "suppliers"] });
      onDone();
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "操作失败"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      setError("请填写供应商名称");
      return;
    }
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Input
        label="供应商名称 *"
        value={formData.name}
        onChange={(e) =>
          setFormData((prev) => ({ ...prev, name: e.target.value }))
        }
        placeholder="杭州某某五金批发"
      />

      <Input
        label="联系人"
        value={formData.contactName}
        onChange={(e) =>
          setFormData((prev) => ({ ...prev, contactName: e.target.value }))
        }
        placeholder="张三"
      />

      <Input
        label="联系电话"
        value={formData.phone}
        onChange={(e) =>
          setFormData((prev) => ({ ...prev, phone: e.target.value }))
        }
        placeholder="13900001111"
      />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700">地址</label>
        <textarea
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
          rows={2}
          value={formData.address}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, address: e.target.value }))
          }
          placeholder="杭州市余杭区某某路100号"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700">状态</label>
        <select
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
          value={formData.status}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, status: e.target.value }))
          }
        >
          <option value="active">正常</option>
          <option value="inactive">停用</option>
        </select>
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

export function SuppliersPanel() {
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<SupplierResponseDto | null>(null);
  const [creating, setCreating] = useState(false);
  const pageSize = 10;

  const qc = useQueryClient();

  const queryKey = useMemo(
    () => ["inventory", "suppliers", page, pageSize],
    [page],
  );

  const q = useQuery({
    queryKey,
    queryFn: () => fetchSuppliers({ page, pageSize }),
    placeholderData: (prev) => prev,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["inventory", "suppliers"] }),
  });

  const totalPages = Math.max(1, Math.ceil((q.data?.total ?? 0) / pageSize));

  if (creating) {
    return (
      <Card>
        <h2 className="font-medium text-zinc-900 mb-4">新建供应商</h2>
        <SupplierForm onDone={() => setCreating(false)} />
      </Card>
    );
  }

  if (editing) {
    return (
      <Card>
        <h2 className="font-medium text-zinc-900 mb-4">
          编辑供应商 · {editing.name}
        </h2>
        <SupplierForm init={editing} onDone={() => setEditing(null)} />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900">供应商管理</h1>
        <Button onClick={() => setCreating(true)}>+ 新建供应商</Button>
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
                <strong>{page}</strong> 页
              </span>
            </div>

            {!q.data?.items?.length ? (
              <p className="p-8 text-center text-sm text-zinc-500">
                暂无供应商数据
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {(q.data?.items ?? []).map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-medium text-zinc-900">
                        {row.name}
                        <span
                          className={`ml-2 text-xs ${
                            row.status === "active"
                              ? "text-green-600"
                              : "text-zinc-500"
                          }`}
                        >
                          {row.status === "active" ? "正常" : "停用"}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-600">
                        {row.contactName && (
                          <span className="mr-3">联系人: {row.contactName}</span>
                        )}
                        {row.phone && (
                          <span className="mr-3">电话: {row.phone}</span>
                        )}
                        {row.address && <span>地址: {row.address}</span>}
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
                          if (confirm(`确定删除供应商 ${row.name} 吗？`)) {
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
