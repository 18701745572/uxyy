"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CustomerDto } from "@uxyy/shared";
import {
  fetchCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "@/lib/api/customers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function CustomerForm({
  init,
  onDone,
}: {
  init?: CustomerDto;
  onDone: () => void;
}) {
  const isEdit = !!init;
  const [name, setName] = useState(init?.name ?? "");
  const [phone, setPhone] = useState(init?.phone ?? "");
  const [remark, setRemark] = useState(init?.remark ?? "");
  const [error, setError] = useState("");

  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      isEdit
        ? updateCustomer(init!.id, {
            name: name || undefined,
            phone: phone || undefined,
            remark: remark || undefined,
          })
        : createCustomer({ name, phone: phone || undefined, remark: remark || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "customers"] });
      onDone();
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "操作失败"),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="flex flex-col gap-3"
    >
      <Input
        label="客户名称"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="杭州某某商行"
      />
      <Input
        label="电话"
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="13800138001"
      />
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700">备注</label>
        <textarea
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
          rows={3}
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          placeholder="重点客户 · 货到付款"
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

export function CrmCustomersPanel() {
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<CustomerDto | null>(null);
  const [creating, setCreating] = useState(false);
  const pageSize = 10;

  const qc = useQueryClient();

  const queryKey = useMemo(
    () => ["crm", "customers", page, pageSize],
    [page],
  );

  const q = useQuery({
    queryKey,
    queryFn: () => fetchCustomers({ page, pageSize }),
    placeholderData: (prev) => prev,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm", "customers"] }),
  });

  const totalPages = Math.max(1, Math.ceil((q.data?.total ?? 0) / pageSize));

  if (creating) {
    return (
      <Card>
        <h2 className="font-medium text-zinc-900 mb-4">新建客户</h2>
        <CustomerForm onDone={() => setCreating(false)} />
      </Card>
    );
  }

  if (editing) {
    return (
      <Card>
        <h2 className="font-medium text-zinc-900 mb-4">
          编辑客户 · {editing.name}
        </h2>
        <CustomerForm
          init={editing}
          onDone={() => setEditing(null)}
        />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900">客户列表</h1>
        <Button onClick={() => setCreating(true)}>+ 新建客户</Button>
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

            {!q.data?.items?.length ? (
              <p className="p-8 text-center text-sm text-zinc-500">
                暂无客户数据
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
                      </div>
                      <div className="text-xs text-zinc-600">
                        <span className="mr-3">#{row.id}</span>
                        {row.phone ? <span>{row.phone}</span> : null}
                      </div>
                      {row.remark ? (
                        <div className="text-sm text-zinc-500 mt-0.5">
                          {row.remark}
                        </div>
                      ) : null}
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
                        variant="danger"
                        className="text-xs px-2.5 py-1"
                        loading={deleteMutation.isPending}
                        onClick={() => {
                          if (window.confirm("确定删除该客户？")) {
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

            <div className="flex gap-3 px-4 py-3 border-t border-zinc-100">
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                上一页
              </Button>
              <Button
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
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
