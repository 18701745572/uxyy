"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchVouchers,
  type LedgerVoucherRow,
} from "@/lib/api/vouchers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ApiError } from "@/lib/api/client";

const sourceTypeOptions: { value: string; label: string }[] = [
  { value: "", label: "全部来源" },
  { value: "ai_task", label: "AI 任务" },
  { value: "manual", label: "手工" },
  { value: "invoice", label: "发票入账" },
  { value: "sales_order", label: "销售单" },
  { value: "purchase_order", label: "采购单" },
];

function sourceTypeLabel(t: string): string {
  const row = sourceTypeOptions.find((o) => o.value === t);
  return row?.label ?? t;
}

function formatEntryDate(iso: string): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

function listErrorMessage(err: unknown): string {
  if (!(err instanceof ApiError)) {
    return err instanceof Error ? err.message : String(err);
  }
  try {
    const o = JSON.parse(err.message) as { message?: unknown };
    if (Array.isArray(o.message)) return o.message.join("；");
    if (typeof o.message === "string") return o.message;
  } catch {
    /* 非 JSON 原文返回 */
  }
  return err.message;
}

export function VouchersPanel() {
  const [page, setPage] = useState(1);
  const [sourceType, setSourceType] = useState("");
  const pageSize = 10;

  const queryKey = useMemo(
    () => ["finance", "vouchers", page, pageSize, sourceType],
    [page, pageSize, sourceType],
  );

  const q = useQuery({
    queryKey,
    queryFn: () =>
      fetchVouchers({
        page,
        pageSize,
        ...(sourceType ? { sourceType } : {}),
      }),
    placeholderData: (prev) => prev,
  });

  const totalPages = Math.max(1, Math.ceil((q.data?.total ?? 0) / pageSize));
  const items: LedgerVoucherRow[] = q.data?.items ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-zinc-900">凭证录入</h1>
        <Link
          href="/dashboard/ai"
          className="text-sm text-zinc-600 underline hover:text-zinc-900"
        >
          从 AI 助手写入凭证 →
        </Link>
      </div>

      <p className="text-sm text-zinc-600">
        当前为<strong>单行分录凭证</strong>列表（一笔借方科目、一笔贷方科目）。草稿/过账筛选已移除；可按来源筛选，
        AI 生成的记录来源为 「AI 任务」。
      </p>

      <div className="flex flex-wrap gap-2 items-center">
        <select
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
          value={sourceType}
          onChange={(e) => {
            setSourceType(e.target.value);
            setPage(1);
          }}
        >
          {sourceTypeOptions.map((o) => (
            <option key={o.value || "all"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <Card className="p-0 overflow-hidden">
        {q.isLoading ? (
          <p className="text-sm text-zinc-600 p-6">加载中…</p>
        ) : q.isError ? (
          <pre className="whitespace-pre-wrap text-sm text-red-700 p-6">
            {listErrorMessage(q.error)}
          </pre>
        ) : (
          <>
            <div className="px-4 py-3 text-sm text-zinc-600 border-b border-zinc-100 flex justify-between">
              <span>
                共 <strong>{q.data?.total ?? 0}</strong> 条 · 第{" "}
                <strong>{q.data?.page ?? page}</strong> 页
              </span>
            </div>

            {!items.length ? (
              <p className="p-8 text-center text-sm text-zinc-500">
                暂无凭证数据。若在 AI 中已写入，请将来源筛为 「AI 任务」或选 「全部来源」后刷新。
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {items.map((row) => (
                  <li key={row.id} className="px-4 py-3 flex flex-col gap-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-medium text-zinc-900">
                        {row.voucherNo}
                      </span>
                      <span className="text-xs rounded bg-zinc-100 px-2 py-0.5 text-zinc-700">
                        {sourceTypeLabel(row.sourceType)}
                      </span>
                      {row.sourceId != null && row.sourceType === "ai_task" && (
                        <span className="text-xs text-zinc-500">
                          任务 #{row.sourceId}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-600">
                      <span className="mr-3">
                        日期: {formatEntryDate(row.entryDate)}
                      </span>
                      <span className="mr-3">金额: ¥{row.amount}</span>
                    </div>
                    <div className="text-xs text-zinc-700">
                      借：<span className="font-medium">{row.debitAccount}</span>
                      {" → "}
                      贷：<span className="font-medium">{row.creditAccount}</span>
                    </div>
                    {row.summary && (
                      <div className="text-xs text-zinc-500 line-clamp-2">
                        摘要：{row.summary}
                      </div>
                    )}
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
