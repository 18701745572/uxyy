"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight,
  Loader2,
  Plus,
  Settings,
  Trash2,
  User,
  PencilLine,
} from "lucide-react";
import { ApiError } from "@/lib/api/client";
import {
  createApprovalFlow,
  deleteApprovalFlow,
  fetchApprovalFlows,
  updateApprovalFlow,
  type ApprovalFlow,
  type ApprovalFlowType,
  type ApprovalStepPayload,
} from "@/lib/api/approval-flows";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FLOW_TYPE_OPTIONS: { value: ApprovalFlowType; label: string }[] = [
  { value: "leave", label: "请假" },
  { value: "reimbursement", label: "报销" },
  { value: "purchase", label: "采购" },
  { value: "sales", label: "销售" },
];

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "boss", label: "老板 (boss)" },
  { value: "finance", label: "财务 (finance)" },
  { value: "sales", label: "销售 (sales)" },
  { value: "warehouse", label: "仓管 (warehouse)" },
  { value: "oa", label: "行政 (oa)" },
];

const typeStyle: Record<
  ApprovalFlowType,
  { label: string; color: string }
> = {
  leave: { label: "请假", color: "bg-green-100 text-green-800" },
  reimbursement: { label: "报销", color: "bg-orange-100 text-orange-800" },
  purchase: { label: "采购", color: "bg-blue-100 text-blue-800" },
  sales: { label: "销售", color: "bg-purple-100 text-purple-800" },
};

interface StepFormRow {
  id: string;
  role: string;
  userId: string;
  amountGte: string;
  amountLte: string;
  daysGte: string;
  daysLte: string;
}

let stepRowKey = 0;
function newStepRow(role = "boss"): StepFormRow {
  stepRowKey += 1;
  return {
    id: `r-${stepRowKey}`,
    role,
    userId: "",
    amountGte: "",
    amountLte: "",
    daysGte: "",
    daysLte: "",
  };
}

function parseOptionalNumber(s: string): number | undefined {
  const t = s.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

function rowsToSteps(rows: StepFormRow[]): ApprovalStepPayload[] {
  return rows.map((r, i) => {
    const step: ApprovalStepPayload = { step: i + 1, role: r.role };
    const uid = parseOptionalNumber(r.userId);
    if (uid !== undefined && Number.isInteger(uid) && uid > 0) {
      step.userId = uid;
    }
    const ag = parseOptionalNumber(r.amountGte);
    const al = parseOptionalNumber(r.amountLte);
    const dg = parseOptionalNumber(r.daysGte);
    const dl = parseOptionalNumber(r.daysLte);
    const cond: NonNullable<ApprovalStepPayload["condition"]> = {};
    if (ag !== undefined || al !== undefined) {
      cond.amount = {};
      if (ag !== undefined) cond.amount.gte = ag;
      if (al !== undefined) cond.amount.lte = al;
    }
    if (dg !== undefined || dl !== undefined) {
      cond.days = {};
      if (dg !== undefined) cond.days.gte = dg;
      if (dl !== undefined) cond.days.lte = dl;
    }
    if (cond.amount || cond.days) step.condition = cond;
    return step;
  });
}

function stepsToRows(steps: ApprovalStepPayload[]): StepFormRow[] {
  if (!steps.length) return [newStepRow()];
  return steps.map((s) => {
    stepRowKey += 1;
    return {
      id: `r-${stepRowKey}`,
      role: s.role,
      userId: s.userId != null ? String(s.userId) : "",
      amountGte:
        s.condition?.amount?.gte != null ? String(s.condition.amount.gte) : "",
      amountLte:
        s.condition?.amount?.lte != null ? String(s.condition.amount.lte) : "",
      daysGte:
        s.condition?.days?.gte != null ? String(s.condition.days.gte) : "",
      daysLte:
        s.condition?.days?.lte != null ? String(s.condition.days.lte) : "",
    };
  });
}

function formatCondition(c?: ApprovalStepPayload["condition"]) {
  if (!c) return null;
  const parts: string[] = [];
  if (c.amount?.gte != null) parts.push(`金额≥${c.amount.gte}`);
  if (c.amount?.lte != null) parts.push(`金额≤${c.amount.lte}`);
  if (c.days?.gte != null) parts.push(`天数≥${c.days.gte}`);
  if (c.days?.lte != null) parts.push(`天数≤${c.days.lte}`);
  return parts.length ? parts.join("，") : null;
}

function roleLabel(code: string) {
  return ROLE_OPTIONS.find((o) => o.value === code)?.label ?? code;
}

function errMessage(e: unknown): string {
  if (e instanceof ApiError) {
    try {
      const j = JSON.parse(e.message) as { message?: string | string[] };
      if (Array.isArray(j.message)) return j.message.join("; ");
      if (typeof j.message === "string") return j.message;
    } catch {
      return e.message || "请求失败";
    }
  }
  return e instanceof Error ? e.message : "请求失败";
}

export default function ApprovalFlowsPage() {
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFlow, setEditingFlow] = useState<ApprovalFlow | null>(null);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<ApprovalFlowType>("leave");
  const [formRows, setFormRows] = useState<StepFormRow[]>([newStepRow()]);

  const flowsQuery = useQuery({
    queryKey: ["approval-flows"],
    queryFn: fetchApprovalFlows,
  });

  const flows = flowsQuery.data ?? [];

  const filteredFlows = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return flows;
    return flows.filter((f) => f.name.includes(q));
  }, [flows, searchQuery]);

  const openCreate = () => {
    setEditingFlow(null);
    setFormName("");
    setFormType("leave");
    setFormRows([newStepRow()]);
    setDialogOpen(true);
  };

  const openEdit = (f: ApprovalFlow) => {
    setEditingFlow(f);
    setFormName(f.name);
    setFormType(f.type);
    setFormRows(stepsToRows(f.steps));
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const name = formName.trim();
      if (!name) throw new Error("请填写流程名称");
      if (!formRows.length) throw new Error("至少保留一个审批步骤");
      for (const r of formRows) {
        if (!r.role?.trim()) throw new Error("每步需选择审批角色");
      }
      const steps = rowsToSteps(formRows);
      if (editingFlow) {
        return updateApprovalFlow(editingFlow.id, { name, steps });
      }
      return createApprovalFlow({ name, type: formType, steps });
    },
    onSuccess: () => {
      toast.success(editingFlow ? "已保存修改" : "已创建流程");
      setDialogOpen(false);
      void qc.invalidateQueries({ queryKey: ["approval-flows"] });
    },
    onError: (e) => toast.error(errMessage(e)),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (f: ApprovalFlow) => {
      const next = f.status === "active" ? "inactive" : "active";
      return updateApprovalFlow(f.id, { status: next });
    },
    onSuccess: () => {
      toast.success("状态已更新");
      void qc.invalidateQueries({ queryKey: ["approval-flows"] });
    },
    onError: (e) => toast.error(errMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteApprovalFlow(id),
    onSuccess: () => {
      toast.success("已删除流程");
      void qc.invalidateQueries({ queryKey: ["approval-flows"] });
    },
    onError: (e) => toast.error(errMessage(e)),
  });

  const loading = flowsQuery.isPending;
  const activeCount = flows.filter((f) => f.status === "active").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">审批流程</h1>
          <p className="text-zinc-500 mt-1">
            自定义各级审批角色与金额/请假天数条件，数据保存至服务端
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          新建流程
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-500">流程总数</p>
            <p className="text-2xl font-bold text-zinc-900">{flows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-500">启用中</p>
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-500">已停用</p>
            <p className="text-2xl font-bold text-gray-600">
              {flows.filter((f) => f.status === "inactive").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-500">数据</p>
            <p className="text-sm font-medium text-zinc-700">
              {loading ? "加载中…" : "已同步 API"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Settings className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <Input
          placeholder="搜索流程名称..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">审批流程列表</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-zinc-500 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              加载中…
            </div>
          ) : flowsQuery.isError ? (
            <p className="text-center py-8 text-red-600 text-sm">
              加载失败，请检查登录态与 NEXT_PUBLIC_API_URL
            </p>
          ) : filteredFlows.length === 0 ? (
            <div className="text-center py-12 text-zinc-400">
              <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无审批流程</p>
              <p className="text-sm mt-1">点击「新建流程」创建</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFlows.map((flow) => {
                const t = typeStyle[flow.type];
                return (
                  <div
                    key={flow.id}
                    className="p-4 border rounded-lg hover:bg-zinc-50/80 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-zinc-900">
                            {flow.name}
                          </h3>
                          <Badge className={t.color}>{t.label}</Badge>
                          <Badge
                            variant={
                              flow.status === "active" ? "default" : "secondary"
                            }
                          >
                            {flow.status === "active" ? "启用" : "停用"}
                          </Badge>
                          <span className="text-xs text-zinc-400">
                            ID {flow.id}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          {flow.steps.map((s, index) => {
                            const cond = formatCondition(s.condition);
                            return (
                              <div key={`${flow.id}-${s.step}`} className="flex items-center">
                                <div className="flex items-center gap-1 bg-zinc-100 px-3 py-1 rounded-full text-sm">
                                  <User className="w-3 h-3 text-zinc-500" />
                                  <span>第{s.step}步</span>
                                  <span className="font-medium">
                                    {roleLabel(s.role)}
                                  </span>
                                  {s.userId != null && (
                                    <span className="text-xs text-zinc-500">
                                      user #{s.userId}
                                    </span>
                                  )}
                                  {cond && (
                                    <span className="text-xs text-zinc-500">
                                      ({cond})
                                    </span>
                                  )}
                                </div>
                                {index < flow.steps.length - 1 && (
                                  <ArrowRight className="w-4 h-4 text-zinc-400 mx-1 shrink-0" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(flow)}
                        >
                          <PencilLine className="w-4 h-4 mr-1" />
                          编辑
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={toggleStatusMutation.isPending}
                          className={
                            flow.status === "active"
                              ? "text-amber-700"
                              : "text-green-700"
                          }
                          onClick={() => toggleStatusMutation.mutate(flow)}
                        >
                          {flow.status === "active" ? "停用" : "启用"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (
                              !window.confirm(
                                `确定删除流程「${flow.name}」？已关联的审批记录不受影响，但勿删在用流程。`,
                              )
                            ) {
                              return;
                            }
                            deleteMutation.mutate(flow.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-zinc-50">
        <CardHeader>
          <CardTitle className="text-lg">配置说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-zinc-600">
          <p>
            • <strong>角色</strong>
            与企业成员角色码一致（boss / finance / sales / warehouse /
            oa），用于待办匹配与权限扩展。
          </p>
          <p>
            • <strong>条件</strong>：可填金额或请假天数阈值（≥ / ≤）；留空表示该步始终参与。
          </p>
          <p>
            • <strong>指定用户</strong>：可选 userId，用于转签或固定审批人（高级用法）。
          </p>
          <p>• 新建后类型不可改；同一业务类型可配置多条流程，业务提交时需选用 flowId。</p>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingFlow ? "编辑审批流程" : "新建审批流程"}
            </DialogTitle>
            <DialogDescription>
              自下而上为第 1、2…步；保存时服务端会按顺序重排步骤序号并清理空条件。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="flow-name">流程名称</Label>
              <Input
                id="flow-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="例如：默认请假审批"
              />
            </div>

            {!editingFlow && (
              <div className="grid gap-2">
                <Label>业务类型</Label>
                <Select
                  value={formType}
                  onValueChange={(v) => setFormType(v as ApprovalFlowType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {FLOW_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>审批步骤</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFormRows((rows) => [...rows, newStepRow()])
                  }
                >
                  <Plus className="w-4 h-4 mr-1" />
                  添加步骤
                </Button>
              </div>
              <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1">
                {formRows.map((row, idx) => (
                  <div
                    key={row.id}
                    className="rounded-lg border border-zinc-200 p-3 space-y-3 bg-white"
                  >
                    <div className="flex items-center justify-between text-sm font-medium text-zinc-700">
                      第 {idx + 1} 步
                      {formRows.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-600 h-8"
                          onClick={() =>
                            setFormRows((rows) =>
                              rows.filter((r) => r.id !== row.id),
                            )
                          }
                        >
                          删除
                        </Button>
                      )}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="grid gap-1.5">
                        <span className="text-xs text-zinc-500">审批角色</span>
                        <Select
                          value={row.role}
                          onValueChange={(v) =>
                            setFormRows((rows) =>
                              rows.map((r) =>
                                r.id === row.id ? { ...r, role: v } : r,
                              ),
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-1.5">
                        <span className="text-xs text-zinc-500">
                          指定用户 ID（可选）
                        </span>
                        <Input
                          inputMode="numeric"
                          placeholder="留空则按角色匹配"
                          value={row.userId}
                          onChange={(e) =>
                            setFormRows((rows) =>
                              rows.map((r) =>
                                r.id === row.id
                                  ? { ...r, userId: e.target.value }
                                  : r,
                              ),
                            )
                          }
                        />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="grid gap-1.5">
                        <span className="text-xs text-zinc-500">
                          金额条件（≥ / ≤）
                        </span>
                        <div className="flex gap-2">
                          <Input
                            placeholder="≥"
                            value={row.amountGte}
                            onChange={(e) =>
                              setFormRows((rows) =>
                                rows.map((r) =>
                                  r.id === row.id
                                    ? { ...r, amountGte: e.target.value }
                                    : r,
                                ),
                              )
                            }
                          />
                          <Input
                            placeholder="≤"
                            value={row.amountLte}
                            onChange={(e) =>
                              setFormRows((rows) =>
                                rows.map((r) =>
                                  r.id === row.id
                                    ? { ...r, amountLte: e.target.value }
                                    : r,
                                ),
                              )
                            }
                          />
                        </div>
                      </div>
                      <div className="grid gap-1.5">
                        <span className="text-xs text-zinc-500">
                          请假天数（≥ / ≤）
                        </span>
                        <div className="flex gap-2">
                          <Input
                            placeholder="≥"
                            value={row.daysGte}
                            onChange={(e) =>
                              setFormRows((rows) =>
                                rows.map((r) =>
                                  r.id === row.id
                                    ? { ...r, daysGte: e.target.value }
                                    : r,
                                ),
                              )
                            }
                          />
                          <Input
                            placeholder="≤"
                            value={row.daysLte}
                            onChange={(e) =>
                              setFormRows((rows) =>
                                rows.map((r) =>
                                  r.id === row.id
                                    ? { ...r, daysLte: e.target.value }
                                    : r,
                                ),
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中…
                </>
              ) : (
                "保存"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
