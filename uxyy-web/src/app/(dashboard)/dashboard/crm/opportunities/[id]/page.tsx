"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  fetchOpportunity,
  generateAiScript,
  type OpportunityStatus,
  type GeneratedScriptDto,
} from "@/lib/api/crm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useCrmCaps } from "@/lib/permissions/crm-capabilities";

const statusLabels: Record<OpportunityStatus, string> = {
  potential: "潜在",
  intention: "意向",
  quotation: "报价",
  deal: "成交",
  after_sales: "售后",
  lost: "流失",
};

const statusColors: Record<OpportunityStatus, string> = {
  potential: "bg-gray-100 text-gray-800",
  intention: "bg-blue-100 text-blue-800",
  quotation: "bg-yellow-100 text-yellow-800",
  deal: "bg-green-100 text-green-800",
  after_sales: "bg-purple-100 text-purple-800",
  lost: "bg-red-100 text-red-800",
};

/** 与后端 AiScriptService.getTemplatesByScene 的 key 对齐 */
const AI_SCRIPT_SCENES = [
  "首次联系",
  "需求挖掘",
  "产品介绍",
  "价格谈判",
  "谈判协商",
  "异议处理",
  "促成成交",
  "售后跟进",
  "挽回客户",
] as const;

export default function OpportunityDetailPage() {
  const crm = useCrmCaps();
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const id = typeof rawId === "string" ? Number.parseInt(rawId, 10) : NaN;

  const q = useQuery({
    queryKey: ["crm", "opportunity", id],
    queryFn: () => fetchOpportunity(id),
    enabled: Number.isFinite(id) && id > 0,
  });

  if (!Number.isFinite(id) || id <= 0) {
    return (
      <div className="p-6">
        <p className="text-red-600">无效的商机 ID</p>
        <Button
          variant="ghost"
          className="h-auto p-0 text-zinc-900 underline underline-offset-2 hover:bg-transparent"
          onClick={() => router.push("/dashboard/crm/opportunities")}
        >
          返回商机列表
        </Button>
      </div>
    );
  }

  if (q.isLoading) {
    return (
      <div className="p-6">
        <p className="text-zinc-500">加载中...</p>
      </div>
    );
  }

  if (q.isError || !q.data) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-red-600">无法加载商机，可能已被删除或无权访问。</p>
        <Link
          href="/dashboard/crm/opportunities"
          className="text-sm text-zinc-700 underline"
        >
          返回商机列表
        </Link>
      </div>
    );
  }

  const opp = q.data;

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" className="gap-1 -ml-2" asChild>
          <Link href="/dashboard/crm/opportunities">
            <ArrowLeft className="h-4 w-4" />
            商机列表
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="text-xl">{opp.name}</CardTitle>
              <CardDescription className="mt-1">
                客户：{opp.customerName ?? `ID ${opp.customerId}`}
              </CardDescription>
            </div>
            <Badge className={statusColors[opp.status]}>
              {statusLabels[opp.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-zinc-700">
          {opp.description ? (
            <p>
              <span className="font-medium text-zinc-900">描述：</span>
              {opp.description}
            </p>
          ) : null}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <p>
              预计金额：
              {opp.estimatedAmount != null
                ? `¥${opp.estimatedAmount.toLocaleString()}`
                : "—"}
            </p>
            <p>
              实际金额：
              {opp.actualAmount != null
                ? `¥${opp.actualAmount.toLocaleString()}`
                : "—"}
            </p>
            <p>
              预计成交：
              {opp.expectedCloseAt
                ? format(new Date(opp.expectedCloseAt), "yyyy-MM-dd", {
                    locale: zhCN,
                  })
                : "—"}
            </p>
            <p>
              实际成交：
              {opp.actualCloseAt
                ? format(new Date(opp.actualCloseAt), "yyyy-MM-dd", {
                    locale: zhCN,
                  })
                : "—"}
            </p>
            <p>成交概率：{opp.probability ?? 0}%</p>
            <p>负责人（用户 ID）：{opp.assignedTo ?? "—"}</p>
          </div>
          {opp.remark ? (
            <p>
              <span className="font-medium text-zinc-900">备注：</span>
              {opp.remark}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {crm.write ? (
        <AiScriptSection customerId={opp.customerId} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI 话术推荐</CardTitle>
            <CardDescription>
              需要 <code className="text-xs bg-zinc-100 px-1 rounded">crm:write</code>{" "}
              权限后方可生成跟进话术。
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}

function AiScriptSection({ customerId }: { customerId: number }) {
  const [open, setOpen] = useState(false);
  const [scene, setScene] = useState<string>("谈判协商");

  const genM = useMutation({
    mutationFn: () => generateAiScript(customerId, scene),
  });

  const scripts: GeneratedScriptDto[] = genM.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">AI 智能话术推荐</CardTitle>
        <CardDescription>
          根据所选场景，结合当前客户与近期跟进、商机信息生成可参考话术（模板引擎，非大模型流式输出）。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) genM.reset();
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2" variant="secondary">
              <Sparkles className="h-4 w-4" />
              AI 话术推荐
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>生成跟进话术</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>场景</Label>
                <Select value={scene} onValueChange={setScene}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_SCRIPT_SCENES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                className="w-full"
                disabled={genM.isPending}
                onClick={() => genM.mutate()}
              >
                {genM.isPending ? "生成中..." : "生成话术"}
              </Button>
              {genM.isError ? (
                <p className="text-sm text-red-600">生成失败，请稍后重试。</p>
              ) : null}
              {genM.isSuccess && scripts.length === 0 ? (
                <p className="text-sm text-amber-700">
                  未生成话术（请确认客户 ID 有效且属于当前企业）。
                </p>
              ) : null}
              <ul className="space-y-4">
                {scripts.map((s, idx) => (
                  <li
                    key={`${s.title}-${idx}`}
                    className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 space-y-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-zinc-900">
                        {s.title}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {s.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-zinc-800 whitespace-pre-wrap">
                      {s.content}
                    </p>
                    {s.tips?.length ? (
                      <div className="text-xs text-zinc-600">
                        <span className="font-medium">技巧：</span>
                        {s.tips.join("；")}
                      </div>
                    ) : null}
                    {s.alternatives?.length ? (
                      <div className="text-xs text-zinc-600 space-y-1">
                        <span className="font-medium">备选表述：</span>
                        <ul className="list-disc pl-4">
                          {s.alternatives.map((alt, i) => (
                            <li key={i}>{alt}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
