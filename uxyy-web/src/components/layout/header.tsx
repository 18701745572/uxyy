"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useEnterpriseStore } from "@/stores/enterprise-store";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useUnreadMessageCount, useMessageInboxStore } from "@/stores/message-inbox-store";
import { roleLabel } from "@/lib/permissions/role-matrix";

interface HeaderProps {
  title: string;
  onMenuToggle: () => void;
}

export function Header({ title, onMenuToggle }: HeaderProps) {
  const enterpriseId = useAuthStore((s) => s.user?.enterpriseId);
  const canonicalRole = useAuthStore((s) => s.canonicalRole);
  const enterprises = useEnterpriseStore((s) => s.enterprises);
  const fetchEnterprises = useEnterpriseStore((s) => s.fetch);
  const unreadCount = useUnreadMessageCount();
  const seedIfEmpty = useMessageInboxStore((s) => s.seedIfEmpty);

  useEffect(() => {
    void fetchEnterprises();
  }, [fetchEnterprises]);

  useEffect(() => {
    seedIfEmpty();
  }, [seedIfEmpty]);

  const enterpriseName =
    enterprises.find((e) => e.id === enterpriseId)?.name ?? null;

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-zinc-200 bg-white/80 backdrop-blur px-4 py-3 md:px-6">
      <button
        type="button"
        className="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100 md:hidden"
        onClick={onMenuToggle}
        aria-label="菜单"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
        <h2 className="text-sm font-medium text-zinc-700 truncate">{title}</h2>
        {(enterpriseId != null || canonicalRole != null || enterpriseName) && (
          <p className="text-xs text-zinc-500 truncate sm:max-w-[50%] md:max-w-md">
            {enterpriseId != null
              ? `${enterpriseName ?? `企业 ${enterpriseId}`} · ${roleLabel(canonicalRole ?? undefined)}`
              : `${roleLabel(canonicalRole ?? undefined)}`}
          </p>
        )}
      </div>

      <Link
        href="/dashboard/messages"
        className="relative shrink-0 rounded-md p-2 text-zinc-600 hover:bg-zinc-100"
        aria-label="消息中心"
      >
        <Bell className="h-5 w-5" strokeWidth={1.75} />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </Link>
    </header>
  );
}
