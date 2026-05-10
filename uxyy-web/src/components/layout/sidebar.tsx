"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { visibleSidebarItems } from "@/lib/permissions/nav-access";

const bottomItems = [
  { href: "/dashboard/profile", label: "用户资料", icon: "⚙️" },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const permissions = useAuthStore((s) => s.permissions);
  const userDisplay = useAuthStore((s) => s.user?.sub);
  const logout = useAuthStore((s) => s.logout);
  const navItems = visibleSidebarItems(permissions);

  const nav = (
    <nav className="flex flex-col gap-1 px-3">
      {navItems.map((item) => {
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              isActive
                ? "bg-zinc-100 text-zinc-900 font-medium"
                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            }`}
          >
            <span aria-hidden className="text-base">
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-white border-r border-zinc-200 transition-transform md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 px-4 py-5">
          <span className="text-lg font-semibold tracking-tight text-zinc-900">
            优效营
          </span>
          <span className="text-xs text-zinc-400">uxyy</span>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col">
          {nav}
          <div className="mt-auto border-t border-zinc-100 pt-1">
            {bottomItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors mx-3 ${
                    isActive
                      ? "bg-zinc-100 text-zinc-900 font-medium"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                  }`}
                >
                  <span aria-hidden className="text-base">
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="border-t border-zinc-200 px-4 py-3">
          <Link
            href="/dashboard/profile"
            onClick={onClose}
            className="text-sm font-medium text-zinc-900 truncate hover:text-zinc-700 transition-colors block"
          >
            {userDisplay ?? "未登录"}
          </Link>
          <button
            type="button"
            onClick={logout}
            className="mt-1 text-xs text-zinc-500 hover:text-zinc-700 transition-colors"
          >
            退出登录
          </button>
        </div>
      </aside>
    </>
  );
}
