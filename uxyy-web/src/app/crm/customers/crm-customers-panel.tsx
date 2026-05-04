"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import {
  fetchCustomersList,
  readStoredAccessToken,
} from "@/lib/api/customer-list";

export function CrmCustomersPanel() {
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const queryKey = useMemo(
    () => ["crm", "customers", page, pageSize, readStoredAccessToken()],
    [page],
  );

  const q = useQuery({
    queryKey,
    queryFn: () =>
      fetchCustomersList({
        page,
        pageSize,
      }),
    placeholderData: (prev) => prev,
  });

  const totalPages = Math.max(1, Math.ceil((q.data?.total ?? 0) / pageSize));

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">CRM · 客户列表</h1>
        <nav className="flex gap-3 text-sm text-zinc-600">
          <Link href="/" className="underline-offset-4 hover:underline">
            返回首页
          </Link>
        </nav>
      </div>

      <p className="text-sm text-zinc-600">
        API 需提供 JWT；本地可在{" "}
        <code className="rounded bg-zinc-100 px-1">uxyy-api/.env</code> 设置{" "}
        <code className="rounded bg-zinc-100 px-1">AUTH_DEV_BYPASS=true</code>{" "}
        （仅开发）或通过{" "}
        <code className="rounded bg-zinc-100 px-1">POST /api/v1/auth/login</code>{" "}
        后将 <code className="rounded bg-zinc-100 px-1">access_token</code> 写入
        会话存储（键{" "}
        <code className="rounded bg-zinc-100 px-1">uxyy_access_token</code>）。
      </p>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        {q.isLoading ? (
          <p className="text-sm text-zinc-600">加载中…</p>
        ) : q.isError ? (
          <pre className="whitespace-pre-wrap text-sm text-red-700">
            {q.error instanceof Error ? q.error.message : String(q.error)}
          </pre>
        ) : (
          <>
            <div className="mb-3 flex justify-between text-sm text-zinc-600">
              <span>
                共 <strong>{q.data?.total ?? 0}</strong> 条 · 每页{" "}
                <strong>{pageSize}</strong> 条 · 当前第{" "}
                <strong>{q.data?.page ?? page}</strong> 页
              </span>
            </div>
            <ul className="divide-y divide-zinc-100">
              {(q.data?.items ?? []).map((row) => (
                <li key={row.id} className="flex flex-col gap-1 py-3">
                  <div className="font-medium text-zinc-900">{row.name}</div>
                  <div className="text-xs text-zinc-600">
                    <span className="mr-3">#{row.id}</span>
                    {row.phone ? <span>电话 {row.phone}</span> : null}
                  </div>
                  {row.remark ? (
                    <div className="text-sm text-zinc-500">{row.remark}</div>
                  ) : null}
                </li>
              ))}
              {!q.data?.items?.length ? (
                <li className="py-8 text-center text-sm text-zinc-500">
                  暂无客户；请先执行后端{" "}
                  <code className="rounded bg-zinc-100 px-1 text-xs">
                    pnpm run db:migrate && pnpm run db:seed
                  </code>
                </li>
              ) : null}
            </ul>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-40"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                上一页
              </button>
              <button
                type="button"
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-40"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                下一页
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
