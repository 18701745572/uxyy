"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { fetchExpenseRequest } from "@/lib/api/expense-requests";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ExpenseRequestDetailPage() {
  const params = useParams();
  const idParam = params?.id;
  const id = typeof idParam === "string" ? Number(idParam) : NaN;

  const q = useQuery({
    queryKey: ["oa", "expense-requests", id],
    queryFn: () => fetchExpenseRequest(id),
    enabled: Number.isFinite(id) && id > 0,
  });

  if (!Number.isFinite(id) || id <= 0) {
    return (
      <p className="text-sm text-red-600 p-6">无效的报销单 ID</p>
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/oa/expense-requests">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900">报销详情 #{id}</h1>
      </div>

      {q.isLoading && (
        <p className="text-sm text-zinc-500">加载中…</p>
      )}
      {q.isError && (
        <pre className="text-sm text-red-700 whitespace-pre-wrap">
          {q.error instanceof ApiError ? q.error.message : String(q.error)}
        </pre>
      )}
      {q.data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{q.data.type} · {q.data.status}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-zinc-700">
            <p>金额：<span className="font-semibold">¥{q.data.amount}</span></p>
            <p>说明：{q.data.description ?? "—"}</p>
            <p className="text-xs text-zinc-500 pt-2">
              创建于 {String(q.data.createdAt).slice(0, 19).replace("T", " ")}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
