"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "./auth-context";
import { Logo } from "@/components/logo";

/**
 * 页面加载过渡组件
 * 使用与登录页一致的深色背景和 Logo，提供连贯的过渡体验
 */
function PageLoadingTransition() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05050a]">
      <div className="flex flex-col items-center gap-6">
        <Logo size="lg" variant="light" />
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="h-1.5 w-1.5 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <p className="text-sm text-text-muted">加载中...</p>
      </div>
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // 加载状态显示全屏过渡动画，与登录页风格一致
  if (isLoading) {
    return <PageLoadingTransition />;
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
