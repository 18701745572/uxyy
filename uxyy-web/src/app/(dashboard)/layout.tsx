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
  "/dashboard/ai": "AI 智能",
  "/dashboard/profile": "用户资料",
};

function titleForPath(pathname: string): string {
  // 优先精确匹配，再尝试前缀匹配
  if (pageTitles[pathname]) return pageTitles[pathname];
  for (const [prefix, title] of Object.entries(pageTitles)) {
    if (prefix !== "/" && pathname.startsWith(prefix)) return title;
  }
  return "";
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
