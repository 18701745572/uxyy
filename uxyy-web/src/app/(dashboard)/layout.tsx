"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { RequireAuth } from "@/components/auth/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { DashboardRouteGate } from "@/components/layout/dashboard-route-gate";
import { SimpleGridBackdrop } from "@/components/ui/simple-grid-backdrop";

const pageTitles: Record<string, string> = {
  "/dashboard": "工作台",
  "/dashboard/messages": "消息中心",
  "/dashboard/notifications": "通知中心",
  "/dashboard/crm": "客户管理",
  "/dashboard/crm/customers": "客户列表",
  "/dashboard/crm/opportunities": "商机管理",
  "/dashboard/crm/follow-ups": "跟进记录",
  "/dashboard/crm/categories": "客户分类",
  "/dashboard/crm/members": "会员管理",
  "/dashboard/crm/member-levels": "会员等级",
  "/dashboard/inventory": "进销存管",
  "/dashboard/finance": "财务管理",
  "/dashboard/finance/invoices": "发票管理",
  "/dashboard/finance/vouchers": "凭证录入",
  "/dashboard/finance/account-subjects": "会计科目",
  "/dashboard/finance/bank-statements": "银行流水",
  "/dashboard/finance/reports": "财务报表",
  "/dashboard/finance/ar-ap": "应收应付",
  "/dashboard/finance/profit-analysis": "利润分析",
  "/dashboard/finance/ai-error-correction": "AI纠错",
  "/dashboard/oa/pending-approvals": "待审批中心",
  "/dashboard/oa": "OA 办公",
  "/dashboard/oa/approval-flows": "审批流程",
  "/dashboard/oa/leave-requests": "请假管理",
  "/dashboard/oa/attendance": "考勤管理",
  "/dashboard/oa/attendance/make-up-approvals": "补卡审批",
  "/dashboard/oa/expense-requests": "报销管理",
  "/dashboard/oa/employee-profiles": "员工通讯录",
  "/dashboard/ai": "AI 智能",
  "/dashboard/forbidden": "无权访问",
  "/dashboard/profile": "用户资料",
  "/dashboard/profile/enterprise-members": "企业成员",
};

function titleForPath(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  let bestPrefix = "";
  let bestTitle = "";
  for (const [prefix, title] of Object.entries(pageTitles)) {
    if (prefix === "/") continue;
    if (pathname.startsWith(prefix) && prefix.length > bestPrefix.length) {
      bestPrefix = prefix;
      bestTitle = title;
    }
  }
  return bestTitle;
}

/**
 * Dashboard 布局 - 深色主题
 *
 * 设计原则：
 * 1. 深色背景：主背景与 SimpleGridBackdrop 的底色一致
 * 2. 玻璃拟态：侧边栏和头部使用半透明效果
 * 3. 工作区背景为独立浅色线网格（与登录页 AuroraBackdrop 分离）
 * 4. 响应式：移动端抽屉式侧边栏
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <RequireAuth>
      <div className="relative flex min-h-screen overflow-hidden bg-[#05050a]">
        <SimpleGridBackdrop position="fixed" />

        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="flex flex-1 flex-col min-w-0 relative z-10">
          <Header
            title={titleForPath(pathname ?? "")}
            onMenuToggle={() => setSidebarOpen((v) => !v)}
          />
          <main className="flex-1 p-4 md:p-6">
            <DashboardRouteGate>{children}</DashboardRouteGate>
          </main>
        </div>
      </div>
    </RequireAuth>
  );
}
