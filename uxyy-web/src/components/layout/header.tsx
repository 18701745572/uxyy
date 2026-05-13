"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { useEnterpriseStore } from "@/stores/enterprise-store";
import Link from "next/link";
import { List, Bell, MagnifyingGlass } from "@phosphor-icons/react";
import { useUnreadMessageCount, useMessageInboxStore } from "@/stores/message-inbox-store";
import { roleLabel } from "@/lib/permissions/role-matrix";
import { fetchUnreadCount } from "@/lib/api/notifications";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
  onMenuToggle: () => void;
}

/**
 * Header 组件 - 深色主题设计
 * 
 * 设计原则：
 * 1. 玻璃拟态：半透明背景 + 毛玻璃效果
 * 2. 深色适配：文字和图标适配深色主题
 * 3. 微交互：按钮悬停、徽章动画
 * 4. 响应式：移动端显示汉堡菜单
 */
export function Header({ title, onMenuToggle }: HeaderProps) {
  const enterpriseId = useAuthStore((s) => s.user?.enterpriseId);
  const canonicalRole = useAuthStore((s) => s.canonicalRole);
  const enterprises = useEnterpriseStore((s) => s.enterprises);
  const fetchEnterprises = useEnterpriseStore((s) => s.fetch);
  const messageUnreadCount = useUnreadMessageCount();
  const seedIfEmpty = useMessageInboxStore((s) => s.seedIfEmpty);

  // 获取服务端通知未读数量
  const { data: notificationData } = useQuery({
    queryKey: ["unread-count"],
    queryFn: fetchUnreadCount,
    refetchInterval: 60000, // 每分钟刷新一次
  });

  const notificationUnreadCount = notificationData?.count ?? 0;
  const totalUnreadCount = messageUnreadCount + notificationUnreadCount;

  useEffect(() => {
    void fetchEnterprises();
  }, [fetchEnterprises]);

  useEffect(() => {
    seedIfEmpty();
  }, [seedIfEmpty]);

  const enterpriseName =
    enterprises.find((e) => e.id === enterpriseId)?.name ?? null;

  return (
    <header 
      className={cn(
        "sticky top-0 z-30 flex items-center gap-3",
        "border-b border-border-primary",
        "bg-bg-secondary/80 backdrop-blur-xl",
        "px-4 py-3 md:px-6"
      )}
    >
      {/* 移动端菜单按钮 */}
      <button
        type="button"
        className={cn(
          "md:hidden flex items-center justify-center",
          "w-9 h-9 rounded-lg",
          "text-text-secondary",
          "hover:bg-bg-tertiary hover:text-text-primary",
          "active:bg-bg-tertiary",
          "transition-all duration-150"
        )}
        onClick={onMenuToggle}
        aria-label="打开菜单"
      >
        <List className="h-5 w-5" weight="regular" />
      </button>

      {/* 页面标题和企业信息 */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
        <h1 className="text-base font-semibold text-text-primary truncate">
          {title}
        </h1>
        {(enterpriseId != null || canonicalRole != null || enterpriseName) && (
          <p className="text-xs text-text-muted truncate sm:max-w-[50%] md:max-w-md">
            {enterpriseId != null
              ? `${enterpriseName ?? `企业 ${enterpriseId}`} · ${roleLabel(canonicalRole ?? undefined)}`
              : `${roleLabel(canonicalRole ?? undefined)}`}
          </p>
        )}
      </div>

      {/* 搜索框 - 桌面端显示 */}
      <div className="hidden md:flex items-center">
        <div className={cn(
          "flex items-center gap-2",
          "w-64 h-9 px-3",
          "bg-bg-tertiary rounded-lg",
          "border border-border-primary",
          "focus-within:border-accent-blue focus-within:ring-2 focus-within:ring-accent-blue/20",
          "transition-all duration-150"
        )}>
          <MagnifyingGlass className="h-4 w-4 text-text-muted" weight="regular" />
          <input
            type="text"
            placeholder="搜索..."
            className={cn(
              "flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted",
              "focus:outline-none"
            )}
          />
        </div>
      </div>

      {/* 右侧操作区 */}
      <div className="flex items-center gap-1">
        {/* 通知按钮 */}
        <Link
          href="/dashboard/notifications"
          className={cn(
            "relative flex items-center justify-center",
            "w-9 h-9 rounded-lg",
            "text-text-secondary",
            "hover:bg-bg-tertiary hover:text-text-primary",
            "active:bg-bg-tertiary",
            "transition-all duration-150"
          )}
          aria-label="通知中心"
        >
          <Bell className="h-5 w-5" weight="regular" />
          {totalUnreadCount > 0 && (
            <span className={cn(
              "absolute -right-0.5 -top-0.5",
              "flex h-5 min-w-[1.25rem] items-center justify-center",
              "rounded-full bg-error px-1",
              "text-[11px] font-semibold leading-none text-white",
              "ring-2 ring-bg-secondary",
              "animate-in zoom-in-50 duration-200"
            )}>
              {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
