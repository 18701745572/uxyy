"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Icon } from "@phosphor-icons/react";
import {
  FileText,
  Calendar,
  Receipt,
  Users,
  Gear,
  Clock,
  CheckCircle,
  WarningCircle,
  ClipboardText,
  Bell,
  Tray,
} from "@phosphor-icons/react";
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
import {
  permissionSet,
  hasEveryPermission,
} from "@/lib/permissions/nav-access";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

const oaModules: {
  title: string;
  description: string;
  icon: Icon;
  href: string;
  gradient: string;
  /** 未设置时表示具备 oa:read 即可看见（父级路由已守卫） */
  everyOf?: readonly PermissionCode[];
}[] = [
  {
    title: "通知中心",
    description: "查看系统通知、审批提醒和公告",
    icon: Bell,
    href: "/dashboard/notifications",
    gradient: "from-rose-500/20 to-pink-500/20",
  },
  {
    title: "待审批中心",
    description: "需 oa:approve：处理他人请假、报销等审批流转",
    icon: ClipboardText,
    href: "/dashboard/oa/pending-approvals",
    gradient: "from-emerald-500/20 to-teal-500/20",
    everyOf: [Permission.OA_APPROVE],
  },
  {
    title: "补卡审批",
    description: "需 oa:approve：待处理补卡通过或驳回",
    icon: CheckCircle,
    href: "/dashboard/oa/attendance/make-up-approvals",
    gradient: "from-cyan-500/20 to-blue-500/20",
    everyOf: [Permission.OA_APPROVE],
  },
  {
    title: "审批流程",
    description: "需 oa:manage：维护企业审批链模板",
    icon: Gear,
    href: "/dashboard/oa/approval-flows",
    gradient: "from-accent-blue/20 to-accent-purple/20",
    everyOf: [Permission.OA_MANAGE],
  },
  {
    title: "请假管理",
    description: "提交请假与查看批复进度（全员可查自己的申请）",
    icon: Calendar,
    href: "/dashboard/oa/leave-requests",
    gradient: "from-green-500/20 to-emerald-500/20",
  },
  {
    title: "报销管理",
    description: "费用报销录入与本人报销进度查看",
    icon: Receipt,
    href: "/dashboard/oa/expense-requests",
    gradient: "from-amber-500/20 to-orange-500/20",
  },
  {
    title: "考勤打卡",
    description: "打卡记录、考勤统计与发起补卡",
    icon: Clock,
    href: "/dashboard/oa/attendance",
    gradient: "from-indigo-500/20 to-violet-500/20",
  },
  {
    title: "员工通讯录",
    description: "需 oa:manage：通讯录与组织架构维护",
    icon: Users,
    href: "/dashboard/oa/employee-profiles",
    gradient: "from-purple-500/20 to-fuchsia-500/20",
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
      return "bg-warning/10 text-warning border-warning/30";
    case "approved":
      return "bg-success/10 text-success border-success/30";
    case "rejected":
      return "bg-error/10 text-error border-error/30";
    case "cancelled":
      return "bg-bg-tertiary text-text-muted border-border-primary";
    default:
      return "bg-bg-tertiary text-text-secondary border-border-primary";
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

/**
 * OA 办公页面 - 深色主题
 */
export default function OaPage() {
  const permissions = useAuthStore((s) => s.permissions);

  const visibleOaModules = useMemo(() => {
    const permSetInner = permissionSet(permissions);
    return oaModules.filter(
      (m) =>
        !m.everyOf?.length || hasEveryPermission(permSetInner, [...m.everyOf]),
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
  const makeupsMine = useMemo(() => makeupMineQ.data ?? [], [makeupMineQ.data]);

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
      {/* 页面标题 */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-text-primary">OA 办公</h1>
          <p className="text-sm text-text-secondary mt-1">
            审批流程、请假报销、员工管理
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            className="h-10 px-4 border-border-secondary hover:border-accent-blue/50 hover:bg-accent-blue/5 transition-all duration-200"
            asChild
          >
            <Link href="/dashboard/oa/leave-requests/new">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500/20 to-green-500/20">
                  <Calendar
                    className="w-3.5 h-3.5 text-emerald-400"
                    weight="regular"
                  />
                </div>
                <span className="text-text-secondary">请假申请</span>
              </div>
            </Link>
          </Button>
          <Button
            size="sm"
            className="h-10 px-4 bg-gradient-to-r from-accent-blue via-accent-purple to-accent-pink hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 transition-all duration-200"
            asChild
          >
            <Link href="/dashboard/oa/expense-requests/new">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/20">
                  <Receipt
                    className="w-3.5 h-3.5 text-white"
                    weight="regular"
                  />
                </div>
                <span className="text-white font-medium">报销申请</span>
              </div>
            </Link>
          </Button>
        </div>
      </div>

      {/* 错误提示 */}
      {err && (
        <div className="rounded-xl bg-error/10 border border-error/30 px-4 py-3">
          <p className="text-sm text-error">{err}</p>
        </div>
      )}

      {/* 审批人待办卡片 */}
      {canApproveInbox ? (
        <Card className="border-accent-blue/30 bg-accent-blue/5">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-gradient-to-br from-accent-blue to-accent-purple p-2.5 shrink-0">
                  <Tray
                    className="w-5 h-5 text-white"
                    weight="regular"
                    aria-hidden
                  />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-text-primary">
                    待您审批的工作量
                  </p>
                  <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                    以下为队列中<strong>需要当前账号处理</strong>
                    的项（与上方「本人的申请进度」互不重复）。
                  </p>
                  {inboxErr ? (
                    <p className="text-xs text-error mt-2">{inboxErr}</p>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                <Button asChild variant="secondary" size="sm">
                  <Link href="/dashboard/oa/pending-approvals">
                    流转审批
                    <Badge className="ml-2 bg-accent-blue text-white border-transparent">
                      {inboxLoading ? "…" : inboxFlow}
                    </Badge>
                  </Link>
                </Button>
                <Button asChild variant="secondary" size="sm">
                  <Link href="/dashboard/oa/attendance/make-up-approvals">
                    补卡
                    <Badge className="ml-2 bg-accent-purple text-white border-transparent">
                      {inboxLoading ? "…" : inboxMakeup}
                    </Badge>
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* 统计卡片 */}
      <div>
        <div className="mb-3">
          <p className="text-sm font-medium text-text-primary">
            本人的申请进度
          </p>
          <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
            请假、报销与<strong>本人发起的补卡</strong>
            ，按单据状态计数；与您作为审批人时需处理的队列
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
                color: "text-warning",
                bgGradient: "from-warning/20 to-amber-500/20",
              },
              {
                label: "本人 · 已通过",
                hint: "含请假、报销与补卡",
                value: stats.approved,
                icon: CheckCircle,
                color: "text-success",
                bgGradient: "from-success/20 to-emerald-500/20",
              },
              {
                label: "本人 · 已驳回",
                hint: "",
                value: stats.rejected,
                icon: WarningCircle,
                color: "text-error",
                bgGradient: "from-error/20 to-rose-500/20",
              },
            ] as const
          ).map((stat) => (
            <Card
              key={stat.label}
              className="group hover:shadow-glow transition-all duration-300"
            >
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <p className="text-sm text-text-secondary">{stat.label}</p>
                  {stat.hint ? (
                    <p className="text-xs text-text-muted mt-0.5">
                      {stat.hint}
                    </p>
                  ) : null}
                  <p className="text-3xl font-bold text-text-primary mt-1">
                    {loading ? "…" : stat.value}
                  </p>
                </div>
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-xl",
                    "bg-gradient-to-br",
                    stat.bgGradient,
                  )}
                >
                  <stat.icon
                    className={cn("w-6 h-6", stat.color)}
                    weight="regular"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 功能模块卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleOaModules.map((module) => {
          const Icon = module.icon;
          return (
            <Link key={module.title} href={module.href} className="group">
              <Card className="group-hover:shadow-glow transition-all duration-300 cursor-pointer h-full">
                <CardContent className="flex items-start gap-4 p-6">
                  <div
                    className={cn(
                      "p-3 rounded-xl bg-gradient-to-br",
                      module.gradient,
                    )}
                  >
                    <Icon
                      className="w-6 h-6 text-text-primary"
                      weight="regular"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-text-primary">
                      {module.title}
                    </h3>
                    <p className="text-sm text-text-muted mt-1">
                      {module.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* 最近动态 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-text-primary">
            <FileText
              className="w-5 h-5 text-text-secondary"
              weight="regular"
            />
            最近动态
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-text-secondary py-8 text-center">
              加载中…
            </p>
          ) : recentRows.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <FileText
                className="w-12 h-12 mx-auto mb-3 opacity-50"
                weight="regular"
              />
              <p>暂无记录</p>
              <p className="text-sm mt-1">
                可使用上方按钮发起请假或报销，或在考勤模块申请补卡
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border-primary">
              {recentRows.map((row) => (
                <li key={`${row.kind}-${row.id}`}>
                  <Link
                    href={row.href}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3 px-1 -mx-1 rounded-lg hover:bg-bg-tertiary/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-text-primary">
                          {row.title}
                        </span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs shrink-0",
                            statusBadgeClass(row.status),
                          )}
                        >
                          {statusLabel(row.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-text-secondary truncate mt-0.5">
                        {row.subtitle}
                      </p>
                      <p className="text-xs text-text-muted mt-1">
                        {new Date(row.createdAt).toLocaleString("zh-CN")}
                      </p>
                    </div>
                    <span className="text-sm text-text-muted shrink-0">
                      {row.kind === "makeup" ? "打开考勤 →" : "查看详情 →"}
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
