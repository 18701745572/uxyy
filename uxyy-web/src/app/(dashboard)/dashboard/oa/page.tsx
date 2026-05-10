"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Calendar,
  Receipt,
  Users,
  Settings,
  Clock,
  CheckCircle,
  AlertCircle,
  ClipboardList,
  Inbox,
  type LucideIcon,
} from "lucide-react";
import { fetchMyLeaveRequests } from "@/lib/api/leave-requests";
import { fetchMyExpenseRequests } from "@/lib/api/expense-requests";
import { fetchPendingApprovals } from "@/lib/api/oa-approval-queue";
import {
  fetchMakeUpRequests,
  fetchMyMakeUpRequests,
} from "@/lib/api/attendance";
import { ApiError } from "@/lib/api/client";
import type { PermissionCode } from "@/lib/permissions/role-matrix";
import { Permission } from "@/lib/permissions/role-matrix";
import { permissionSet, hasEveryPermission } from "@/lib/permissions/nav-access";
import { useAuthStore } from "@/stores/auth-store";

const oaModules: {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  color: string;
  /** 未设置时表示具备 oa:read 即可看见（父级路由已守卫） */
  everyOf?: readonly PermissionCode[];
}[] = [
  {
    title: "待审批中心",
    description: "需 oa:approve：处理他人请假、报销等审批流转",
    icon: ClipboardList,
    href: "/dashboard/oa/pending-approvals",
    color: "bg-emerald-500",
    everyOf: [Permission.OA_APPROVE],
  },
  {
    title: "补卡审批",
    description: "需 oa:approve：待处理补卡通过或驳回",
    icon: CheckCircle,
    href: "/dashboard/oa/attendance/make-up-approvals",
    color: "bg-teal-500",
    everyOf: [Permission.OA_APPROVE],
  },
  {
    title: "审批流程",
    description: "需 oa:manage：维护企业审批链模板",
    icon: Settings,
    href: "/dashboard/oa/approval-flows",
    color: "bg-blue-500",
    everyOf: [Permission.OA_MANAGE],
  },
  {
    title: "请假管理",
    description: "提交请假与查看批复进度（全员可查自己的申请）",
    icon: Calendar,
    href: "/dashboard/oa/leave-requests",
    color: "bg-green-500",
  },
  {
    title: "报销管理",
    description: "费用报销录入与本人报销进度查看",
    icon: Receipt,
    href: "/dashboard/oa/expense-requests",
    color: "bg-orange-500",
  },
  {
    title: "考勤打卡",
    description: "打卡记录、考勤统计与发起补卡",
    icon: Clock,
    href: "/dashboard/oa/attendance",
    color: "bg-indigo-500",
  },
  {
    title: "员工通讯录",
    description: "需 oa:manage：通讯录与组织架构维护",
    icon: Users,
    href: "/dashboard/oa/employee-profiles",
    color: "bg-purple-500",
    everyOf: [Permission.OA_MANAGE],
  },
];

function statusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "审批中";
    case "approved":
      return "已通过";
    case "rejected":
      return "已驳回";
    case "cancelled":
      return "已取消";
    default:
      return status;
  }
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-800";
    case "approved":
      return "bg-green-100 text-green-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    case "cancelled":
      return "bg-zinc-100 text-zinc-600";
    default:
      return "bg-zinc-100 text-zinc-700";
  }
}

type RecentRow = {
  kind: "leave" | "expense" | "makeup";
  id: number;
  title: string;
  subtitle: string;
  status: string;
  createdAt: string;
  href: string;
};

async function fetchApproverInboxCounts(): Promise<{
  flowCount: number;
  makeupCount: number;
}> {
  const [flows, makeups] = await Promise.all([
    fetchPendingApprovals(),
    fetchMakeUpRequests("pending"),
  ]);
  return { flowCount: flows.length, makeupCount: makeups.length };
}

export default function OaPage() {
  const permissions = useAuthStore((s) => s.permissions);

  const visibleOaModules = useMemo(() => {
    const permSetInner = permissionSet(permissions);
    return oaModules.filter(
      (m) =>
        !m.everyOf?.length ||
        hasEveryPermission(permSetInner, [...m.everyOf]),
    );
  }, [permissions]);

  const canApproveInbox = useMemo(
    () => permissionSet(permissions).has(Permission.OA_APPROVE),
    [permissions],
  );

  const leavesQ = useQuery({
    queryKey: ["oa", "dashboard", "my-leaves"],
    queryFn: fetchMyLeaveRequests,
  });
  const expensesQ = useQuery({
    queryKey: ["oa", "dashboard", "my-expenses"],
    queryFn: fetchMyExpenseRequests,
  });
  const makeupMineQ = useQuery({
    queryKey: ["oa", "dashboard", "my-makeup"],
    queryFn: fetchMyMakeUpRequests,
  });

  const inboxQ = useQuery({
    queryKey: ["oa", "dashboard", "approver-inbox-counts"],
    queryFn: fetchApproverInboxCounts,
    enabled: canApproveInbox,
    retry: (failureCount, err) => {
      if (err instanceof ApiError && err.status === 403) return false;
      return failureCount < 1;
    },
  });

  const leaves = useMemo(() => leavesQ.data ?? [], [leavesQ.data]);
  const expenses = useMemo(() => expensesQ.data ?? [], [expensesQ.data]);
  const makeupsMine = useMemo(
    () => makeupMineQ.data ?? [],
    [makeupMineQ.data],
  );

  const stats = useMemo(() => {
    const leaveExpense = [...leaves, ...expenses];
    const fromDoc = {
      pending: leaveExpense.filter((r) => r.status === "pending").length,
      approved: leaveExpense.filter((r) => r.status === "approved").length,
      rejected: leaveExpense.filter((r) => r.status === "rejected").length,
    };
    const fromMakeup = {
      pending: makeupsMine.filter((m) => m.status === "pending").length,
      approved: makeupsMine.filter((m) => m.status === "approved").length,
      rejected: makeupsMine.filter((m) => m.status === "rejected").length,
    };
    return {
      pending: fromDoc.pending + fromMakeup.pending,
      approved: fromDoc.approved + fromMakeup.approved,
      rejected: fromDoc.rejected + fromMakeup.rejected,
    };
  }, [leaves, expenses, makeupsMine]);

  const recentRows = useMemo((): RecentRow[] => {
    const rows: RecentRow[] = [];
    for (const l of leaves) {
      rows.push({
        kind: "leave",
        id: l.id,
        title: `请假 · ${l.type}`,
        subtitle: `${String(l.startDate).slice(0, 10)} ～ ${String(l.endDate).slice(0, 10)} · ${l.days} 天`,
        status: l.status,
        createdAt: l.createdAt,
        href: `/dashboard/oa/leave-requests/${l.id}`,
      });
    }
    for (const e of expenses) {
      rows.push({
        kind: "expense",
        id: e.id,
        title: `报销 · ${e.type}`,
        subtitle: `¥${e.amount}${e.description ? ` · ${e.description.slice(0, 40)}${e.description.length > 40 ? "…" : ""}` : ""}`,
        status: e.status,
        createdAt: e.createdAt,
        href: `/dashboard/oa/expense-requests/${e.id}`,
      });
    }
    for (const m of makeupsMine) {
      const tip = m.type === "in" ? "上班" : "下班";
      rows.push({
        kind: "makeup",
        id: m.id,
        title: `补卡 · ${tip}`,
        subtitle: `${String(m.date).slice(0, 10)} · ${m.reason.slice(0, 48)}${m.reason.length > 48 ? "…" : ""}`,
        status: m.status,
        createdAt: m.createdAt,
        href: "/dashboard/oa/attendance",
      });
    }
    return rows
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 12);
  }, [leaves, expenses, makeupsMine]);

  const loading =
    leavesQ.isPending || expensesQ.isPending || makeupMineQ.isPending;
  const err =
    leavesQ.error instanceof ApiError
      ? leavesQ.error.message
      : expensesQ.error instanceof ApiError
        ? expensesQ.error.message
        : makeupMineQ.error instanceof ApiError
          ? makeupMineQ.error.message
          : leavesQ.error || expensesQ.error || makeupMineQ.error
            ? String(leavesQ.error ?? expensesQ.error ?? makeupMineQ.error)
            : null;

  const inboxFlow = inboxQ.data?.flowCount ?? 0;
  const inboxMakeup = inboxQ.data?.makeupCount ?? 0;
  const inboxLoading = canApproveInbox && inboxQ.isPending;
  const inboxErr =
    canApproveInbox && inboxQ.isError
      ? inboxQ.error instanceof ApiError
        ? inboxQ.error.message
        : String(inboxQ.error)
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">OA 办公</h1>
          <p className="text-zinc-500 mt-1">
            审批流程、请假报销、员工管理
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/oa/leave-requests/new">
            <Button variant="outline" size="sm">
              <Calendar className="w-4 h-4 mr-2" />
              请假申请
            </Button>
          </Link>
          <Link href="/dashboard/oa/expense-requests/new">
            <Button size="sm">
              <Receipt className="w-4 h-4 mr-2" />
              报销申请
            </Button>
          </Link>
        </div>
      </div>

      {err && (
        <p className="text-sm text-red-700 bg-red-50 rounded-md px-3 py-2">
          {err}
        </p>
      )}

      {canApproveInbox ? (
        <Card className="border-emerald-200/80 bg-emerald-50/50">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-emerald-600 p-2.5 shrink-0">
                  <Inbox className="w-5 h-5 text-white" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-emerald-950">待您审批的工作量</p>
                  <p className="text-xs text-emerald-900/80 mt-1 leading-relaxed">
                    以下为队列中<strong>需要当前账号处理</strong>的项（与上方「本人的申请进度」互不重复）。
                  </p>
                  {inboxErr ? (
                    <p className="text-xs text-red-700 mt-2">{inboxErr}</p>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                <Button asChild variant="secondary" size="sm" className="bg-white">
                  <Link href="/dashboard/oa/pending-approvals">
                    流转审批
                    <Badge className="ml-2 bg-emerald-700 text-white border-transparent">
                      {inboxLoading ? "…" : inboxFlow}
                    </Badge>
                  </Link>
                </Button>
                <Button asChild variant="secondary" size="sm" className="bg-white">
                  <Link href="/dashboard/oa/attendance/make-up-approvals">
                    补卡
                    <Badge className="ml-2 bg-teal-700 text-white border-transparent">
                      {inboxLoading ? "…" : inboxMakeup}
                    </Badge>
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div>
        <div className="mb-2">
          <p className="text-sm font-medium text-zinc-800">本人的申请进度</p>
          <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
            请假、报销与<strong>本人发起的补卡</strong>，按单据状态计数；与您作为审批人时需处理的队列
            （见上卡）不是同一数据源。
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(
            [
              {
                label: "本人 · 审批中",
                hint: "已提交待人批复",
                value: stats.pending,
                icon: Clock,
                color: "text-yellow-600",
              },
              {
                label: "本人 · 已通过",
                hint: "含请假、报销与补卡",
                value: stats.approved,
                icon: CheckCircle,
                color: "text-green-600",
              },
              {
                label: "本人 · 已驳回",
                hint: "",
                value: stats.rejected,
                icon: AlertCircle,
                color: "text-red-600",
              },
            ] as const
          ).map((stat) => (
            <Card key={stat.label}>
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <p className="text-sm text-zinc-500">{stat.label}</p>
                  {stat.hint ? (
                    <p className="text-xs text-zinc-400 mt-0.5">{stat.hint}</p>
                  ) : null}
                  <p className="text-3xl font-bold text-zinc-900 mt-1">
                    {loading ? "…" : stat.value}
                  </p>
                </div>
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleOaModules.map((module) => (
          <Link key={module.title} href={module.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="flex items-start gap-4 p-6">
                <div className={`${module.color} p-3 rounded-lg`}>
                  <module.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-zinc-900">{module.title}</h3>
                  <p className="text-sm text-zinc-500 mt-1">
                    {module.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            最近动态
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-zinc-500 py-8 text-center">加载中…</p>
          ) : recentRows.length === 0 ? (
            <div className="text-center py-8 text-zinc-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无记录</p>
              <p className="text-sm mt-1">
                可使用上方按钮发起请假或报销，或在考勤模块申请补卡
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {recentRows.map((row) => (
                <li key={`${row.kind}-${row.id}`}>
                  <Link
                    href={row.href}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3 px-1 -mx-1 rounded-lg hover:bg-zinc-50"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-zinc-900">
                          {row.title}
                        </span>
                        <Badge
                          variant="secondary"
                          className={`text-xs shrink-0 ${statusBadgeClass(row.status)}`}
                        >
                          {statusLabel(row.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-zinc-600 truncate mt-0.5">
                        {row.subtitle}
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">
                        {new Date(row.createdAt).toLocaleString("zh-CN")}
                      </p>
                    </div>
                    <span className="text-sm text-zinc-500 shrink-0">
                      {row.kind === "makeup"
                        ? "打开考勤 →"
                        : "查看详情 →"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
