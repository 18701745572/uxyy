"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gear, X } from "@phosphor-icons/react";
import { useAuthStore } from "@/stores/auth-store";
import { visibleSidebarItems, type NavItem } from "@/lib/permissions/nav-access";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";

const bottomItems: Omit<NavItem, "anyOf">[] = [
  { href: "/dashboard/profile", label: "用户资料", icon: Gear },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Sidebar 组件 - 深色主题设计
 * 
 * 设计原则：
 * 1. 深色背景：与主背景协调
 * 2. 玻璃拟态：半透明毛玻璃效果
 * 3. 选中状态：渐变背景 + 发光边框
 * 4. 微交互：悬停效果、平滑过渡
 * 5. 响应式：移动端抽屉式，桌面端固定
 */
export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const permissions = useAuthStore((s) => s.permissions);
  const userDisplay = useAuthStore((s) => s.user?.sub);
  const logout = useAuthStore((s) => s.logout);
  const navItems = visibleSidebarItems(permissions);

  return (
    <>
      {/* 移动端遮罩层 */}
      {open && (
        <div
          className={cn(
            "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden",
            "transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0"
          )}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* 侧边栏 */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col",
          "bg-bg-secondary/95 backdrop-blur-xl border-r border-border-primary",
          "transition-transform duration-300 ease-out",
          "md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo 区域 */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-border-primary">
          <Link 
            href="/dashboard" 
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            {/* Logo 图标 */}
            <Logo size="sm" variant="dark" className="text-text-primary" />
            <span className="text-xl font-bold tracking-tight text-text-primary">
              优效营
            </span>
            <span className="text-xs font-medium text-text-muted px-1.5 py-0.5 bg-bg-tertiary rounded">
              v1.0.1
            </span>
          </Link>
          
          {/* 移动端关闭按钮 */}
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "md:hidden flex items-center justify-center",
              "w-8 h-8 rounded-lg",
              "text-text-secondary",
              "hover:bg-bg-tertiary hover:text-text-primary",
              "transition-all duration-150"
            )}
            aria-label="关闭菜单"
          >
            <X className="h-4 w-4" weight="bold" />
          </button>
        </div>

        {/* 导航区域 */}
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="flex flex-col gap-1 px-3" aria-label="主导航">
            {navItems.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname?.startsWith(item.href) ?? false;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm",
                    "transition-all duration-150 ease-out",
                    isActive
                      ? [
                          "bg-gradient-to-r from-accent-blue/20 to-accent-purple/10 text-text-primary font-semibold",
                          "border-l-2 border-accent-blue -ml-[2px] pl-[calc(0.75rem+2px)]",
                          "shadow-[0_0_20px_rgba(59,130,246,0.15)]"
                        ]
                      : [
                          "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary",
                          "border-l-2 border-transparent"
                        ]
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 flex-shrink-0",
                      isActive ? "text-accent-blue" : "text-text-muted"
                    )}
                    weight={isActive ? "bold" : "regular"}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* 底部导航 */}
          <div className="mt-6 pt-4 border-t border-border-primary px-3">
            <nav className="flex flex-col gap-1" aria-label="辅助导航">
              {bottomItems.map((item) => {
                const isActive = pathname?.startsWith(item.href) ?? false;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm",
                      "transition-all duration-150 ease-out",
                      isActive
                        ? [
                            "bg-gradient-to-r from-accent-blue/20 to-accent-purple/10 text-text-primary font-semibold",
                            "border-l-2 border-accent-blue -ml-[2px] pl-[calc(0.75rem+2px)]",
                            "shadow-[0_0_20px_rgba(59,130,246,0.15)]"
                          ]
                        : [
                            "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary",
                            "border-l-2 border-transparent"
                          ]
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 flex-shrink-0",
                        isActive ? "text-accent-blue" : "text-text-muted"
                      )}
                      weight={isActive ? "bold" : "regular"}
                      aria-hidden="true"
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* 用户信息区域 */}
        <div className="border-t border-border-primary p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-white text-sm font-medium shadow-glow">
              {userDisplay?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {userDisplay ?? "未登录"}
              </p>
              <button
                type="button"
                onClick={logout}
                className={cn(
                  "text-xs text-text-muted",
                  "hover:text-text-secondary",
                  "transition-colors duration-150"
                )}
              >
                退出登录
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
