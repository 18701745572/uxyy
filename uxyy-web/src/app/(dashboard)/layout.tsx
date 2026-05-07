"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { RequireAuth } from "@/components/auth/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

const pageTitles: Record<string, string> = {
  "/dashboard": "首页",
  "/dashboard/crm": "客户管理",
  "/dashboard/inventory": "进销存",
  "/dashboard/finance": "财务",
  "/dashboard/finance/ar-ap": "应收应付",
  "/dashboard/oa": "OA 办公",
  "/dashboard/oa/approval-flows": "审批流程",
  "/dashboard/oa/leave-requests": "请假管理",
  "/dashboard/oa/expense-requests": "报销管理",
  "/dashboard/oa/employee-profiles": "员工通讯录",
  "/dashboard/ai": "AI 智能",
  "/dashboard/profile": "用户资料",
};

function titleForPath(pathname: string): string {
  // 优先精确匹配，再尝试最长前缀匹配（避免 /dashboard 抢先匹配 /dashboard/crm/...）
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

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <RequireAuth>
      <div className="flex min-h-screen bg-zinc-50">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="flex flex-1 flex-col min-w-0">
          <Header
            title={titleForPath(pathname)}
            onMenuToggle={() => setSidebarOpen((v) => !v)}
          />
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </RequireAuth>
  );
}
