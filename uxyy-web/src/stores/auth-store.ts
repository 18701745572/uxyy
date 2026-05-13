"use client";

import { create } from "zustand";
import type { LoginInput, RegisterInput, ProfilePayload } from "@uxyy/shared";
import {
  fetchAuthPermissions,
  login as loginApi,
  register as registerApi,
  switchEnterprise as switchEnterpriseApi,
} from "@/lib/api/auth";
import { readJwtAccessClaims } from "@/lib/api/jwt-payload";
import {
  getPermissionsFromEnterpriseRole,
  normalizeEnterpriseRole,
} from "@/lib/permissions/role-matrix";
import {
  readStoredAccessToken,
  clearAllTokens,
  persistRefreshToken,
} from "@/lib/api/token-store";

interface AuthState {
  user: ProfilePayload | null;
  /** 当前企业内角色的权限码，与 JWT 同步后再由 `/auth/permissions` 覆盖 */
  permissions: string[];
  /** 规范五种之一（若 JWT 可归一）*/
  canonicalRole: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  checkProfile: () => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  switchEnterprise: (enterpriseId: number) => Promise<void>;
}

// 全局锁，防止并发权限请求
let permissionsRequestPromise: Promise<void> | null = null;

/** 从 JWT 写入用户与推导权限；失败返回 false（已清理 token） */
function syncJwtSession(set: (partial: Partial<AuthState>) => void): boolean {
  const token = readStoredAccessToken();
  if (!token) {
    set({
      user: null,
      permissions: [],
      canonicalRole: null,
      isLoading: false,
      isAuthenticated: false,
    });
    return false;
  }
  const claims = readJwtAccessClaims(token);
  if (!claims?.sub) {
    clearAllTokens();
    set({
      user: null,
      permissions: [],
      canonicalRole: null,
      isLoading: false,
      isAuthenticated: false,
    });
    return false;
  }

  const jwtPerms = getPermissionsFromEnterpriseRole(claims.role);
  const canon = normalizeEnterpriseRole(claims.role);
  set({
    user: {
      sub: claims.sub,
      enterpriseId: claims.enterpriseId,
    },
    permissions: jwtPerms,
    canonicalRole:
      canon ??
      (typeof claims.role === "string" && claims.role.trim()
        ? claims.role.trim().toLowerCase()
        : null),
    isAuthenticated: true,
    isLoading: false,
  });
  return true;
}

/** 异步拉取服务端权限矩阵（不改变登录态）；失败静默保留 JWT 推导
 * 使用全局锁防止并发请求
 */
function schedulePermissionsAlign(
  set: (partial: Partial<AuthState>) => void,
): void {
  // 如果已有正在进行的请求，直接返回，避免重复请求
  if (permissionsRequestPromise) {
    return;
  }

  permissionsRequestPromise = fetchAuthPermissions()
    .then((api) => {
      set({
        permissions: [...api.permissions],
        canonicalRole:
          api.canonicalRole ??
          normalizeEnterpriseRole(api.roleRaw) ??
          api.roleRaw.trim().toLowerCase(),
      });
    })
    .catch(() => {
      /* 网络或 403：保留 JWT 推导 */
    })
    .finally(() => {
      // 请求完成后释放锁
      permissionsRequestPromise = null;
    });
}

// 登录请求锁
let isLoggingIn = false;

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  permissions: [],
  canonicalRole: null,
  isLoading: true,
  isAuthenticated: false,

  checkProfile: async () => {
    set({ isLoading: true });
    const ok = syncJwtSession(set);
    set({ isLoading: false });
    if (ok) {
      schedulePermissionsAlign(set);
    }
  },

  login: async (input: LoginInput) => {
    // 防止重复登录请求
    if (isLoggingIn) {
      return;
    }
    isLoggingIn = true;
    try {
      await loginApi(input);
      syncJwtSession(set);
      schedulePermissionsAlign(set);
    } finally {
      isLoggingIn = false;
    }
  },

  register: async (input: RegisterInput) => {
    await registerApi(input);
    syncJwtSession(set);
    schedulePermissionsAlign(set);
  },

  logout: () => {
    clearAllTokens();
    set({
      user: null,
      permissions: [],
      canonicalRole: null,
      isLoading: false,
      isAuthenticated: false,
    });
  },

  switchEnterprise: async (enterpriseId: number) => {
    const data = await switchEnterpriseApi(enterpriseId);
    if (data.refresh_token) {
      persistRefreshToken(data.refresh_token);
    }
    const claims = readJwtAccessClaims(data.access_token);
    if (!claims?.sub) {
      clearAllTokens();
      set({
        user: null,
        permissions: [],
        canonicalRole: null,
        isLoading: false,
        isAuthenticated: false,
      });
      throw new Error("切换企业后 Token 无效");
    }
    syncJwtSession(set);
    schedulePermissionsAlign(set);
  },
}));
