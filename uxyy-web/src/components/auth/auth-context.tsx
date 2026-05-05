"use client";

import { useEffect, type ReactNode } from "react";
import { useAuthStore } from "@/stores/auth-store";

/**
 * 在组件树挂载时触发一次 profile 校验。
 * Zustand store 已是单例，Provider 仅负责触发 checkProfile。
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const checkProfile = useAuthStore((s) => s.checkProfile);

  useEffect(() => {
    void checkProfile();
  }, [checkProfile]);

  return <>{children}</>;
}

/**
 * 向后兼容的 hook：与 Zustand useAuthStore 接口一致。
 * 原 Context API 的调用方可无缝迁移到 useAuthStore()。
 */
export function useAuth() {
  return useAuthStore();
}
