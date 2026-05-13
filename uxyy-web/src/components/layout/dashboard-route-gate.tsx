"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { evaluateRouteGuard } from "@/lib/permissions/nav-access";

export function DashboardRouteGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const permissions = useAuthStore((s) => s.permissions);
  const lastReplace = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    const { allowed, missingPermissions } = evaluateRouteGuard(
      pathname,
      permissions,
    );
    if (allowed) {
      lastReplace.current = null;
      return;
    }
    const from = pathname;
    const qs = new URLSearchParams();
    qs.set("from", from);
    if (missingPermissions?.length) {
      qs.set("need", missingPermissions.join(","));
    }
    const dest = `/dashboard/forbidden?${qs.toString()}`;
    if (lastReplace.current === dest) return;
    lastReplace.current = dest;
    router.replace(dest);
  }, [pathname, permissions, router, isAuthenticated, isLoading]);

  const onForbiddenPage = pathname.startsWith("/dashboard/forbidden");
  /** 在未完成鉴权 hydrate 前先渲染子路由，避免出现整页白板 */
  const { allowed } = evaluateRouteGuard(pathname, permissions);
  if (
    isAuthenticated &&
    !isLoading &&
    !allowed &&
    !onForbiddenPage
  ) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-text-tertiary">
        正在检查访问权限…
      </div>
    );
  }

  return <>{children}</>;
}
