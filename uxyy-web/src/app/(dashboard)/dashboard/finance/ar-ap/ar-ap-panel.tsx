"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { ArApLineItem } from "@/lib/api/reports";
import { fetchArAp } from "@/lib/api/reports";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function filterItems(items: ArApLineItem[], q: string): ArApLineItem[] {
  const s = q.trim().toLowerCase();
  if (!s) return items;
  return items.filter(
    (x) =>
      x.name.toLowerCase().includes(s) ||
      x.invoiceNo.toLowerCase().includes(s),
  );
}

function ItemsTable({
  title,
  rows,
  counterpartyLabel,
  emptyText,
}: {
  title: string;
  rows: ArApLineItem[];
  counterpartyLabel: string;
  emptyText: string;
}) {
  return (
    <div>
      <h2 className="text-sm font-medium text-zinc-900 mb-2">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">{emptyText}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-600">
              <tr>
                <th className="px-3 py-2">{counterpartyLabel}</th>
                <th className="px-3 py-2">发票号</th>
                <th className="px-3 py-2 text-right">含税金额</th>
                <th className="px-3 py-2 text-right">已付金额</th>
                <th className="px-3 py-2 text-right">未结余额</th>
                <th className="px-3 py-2">开票日</th>
                <th className="px-3 py-2 text-right">逾期(天)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((r) => (
                <tr key={r.id} className="bg-white">
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.invoiceNo}</td>
                  <td className="px-3 py-2 text-right tabular-nums">¥{r.amount}</td>
                  <td className="px-3 py-2 text-right tabular-nums">¥{r.paidAmount}</td>
                  <td className="px-3 py-2 text-right font-medium text-zinc-900 tabular-nums">
                    ¥{r.balance}
                  </td>
                  <td className="px-3 py-2 text-zinc-600">{r.issueDate ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.daysOverdue > 0 ? (
                      <span className="text-red-600">{r.daysOverdue}</span>
                    ) : (
                      <span className="text-zinc-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function ArApPanel() {
  const [search, setSearch] = useState("");
  const q = useQuery({
    queryKey: ["finance", "ar-ap", "module"],
    queryFn: fetchArAp,
  });

  const receivables = useMemo(
    () => filterItems(q.data?.receivables ?? [], search),
    [q.data?.receivables, search],
  );
  const payables = useMemo(
    () => filterItems(q.data?.payables ?? [], search),
    [q.data?.payables, search],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h1 className="text-lg font-semibold text-zinc-900">应收应付</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/finance/invoices">
            <Button type="button" variant="secondary" className="text-sm">
              发票管理
            </Button>
          </Link>
          <Link href="/dashboard/finance/reports">
            <Button type="button" variant="secondary" className="text-sm">
              财务报表
            </Button>
          </Link>
        </div>
      </div>

      <p className="text-sm text-zinc-600 rounded-md bg-zinc-50 border border-zinc-100 px-3 py-2">
        数据来自「已核验、未入账」的发票：<strong>应收账款</strong>
        为非采购来源票（销售侧应收），<strong>应付账款</strong>为采购关联票；入账后将从本列表消失。可在
        发票管理中完成核验与入账。
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 max-w-md">
          <Input
            label="搜索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="往来单位名称或发票号…"
          />
        </div>
        <Button type="button" variant="secondary" onClick={() => void q.refetch()}>
          刷新
        </Button>
      </div>

      {q.isLoading ? (
        <p className="text-sm text-zinc-600">加载中…</p>
      ) : q.isError ? (
        <p className="text-sm text-red-600">
          {q.error instanceof Error ? q.error.message : "加载失败"}
        </p>
      ) : q.data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="p-4 bg-blue-50/80 border-blue-100">
              <p className="text-xs text-blue-700">应收账款合计</p>
              <p className="mt-1 text-2xl font-semibold text-blue-900 tabular-nums">
                ¥{q.data.totalReceivables}
              </p>
              <p className="mt-1 text-xs text-blue-600/90">
                {q.data.receivables.length} 笔待结清（全部数据）
              </p>
            </Card>
            <Card className="p-4 bg-orange-50/80 border-orange-100">
              <p className="text-xs text-orange-800">应付账款合计</p>
              <p className="mt-1 text-2xl font-semibold text-orange-950 tabular-nums">
                ¥{q.data.totalPayables}
              </p>
              <p className="mt-1 text-xs text-orange-800/90">
                {q.data.payables.length} 笔待结清（全部数据）
              </p>
            </Card>
          </div>

          <ItemsTable
            title="应收账款明细（按发票）"
            rows={receivables}
            counterpartyLabel="客户（购方）"
            emptyText={search.trim() ? "无匹配的应收记录" : "暂无应收账款"}
          />
          <ItemsTable
            title="应付账款明细（按发票）"
            rows={payables}
            counterpartyLabel="供应商（销方）"
            emptyText={search.trim() ? "无匹配的应付记录" : "暂无应付账款"}
          />
        </>
      ) : (
        <p className="text-sm text-zinc-500">暂无数据</p>
      )}
    </div>
  );
}
