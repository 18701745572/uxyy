"use client";

import { create } from "zustand";
import type { LoginInput, RegisterInput, ProfilePayload } from "@uxyy/shared";
import {
  login as loginApi,
  register as registerApi,
  fetchProfile,
  switchEnterprise as switchEnterpriseApi,
} from "@/lib/api/auth";
import { readJwtAccessClaims } from "@/lib/api/jwt-payload";
import {
  readStoredAccessToken,
  persistAccessToken,
  persistRefreshToken,
  clearAllTokens,
} from "@/lib/api/token-store";

interface AuthState {
  user: ProfilePayload | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  /** 挂载时调用：验证已有 token */
  checkProfile: () => Promise<void>;

  /** 登录 */
  login: (input: LoginInput) => Promise<void>;

  /** 注册 */
  register: (input: RegisterInput) => Promise<void>;

  /** 退出 */
  logout: () => void;

  /** 切换当前企业（新 JWT 写入 sessionStorage，后续 apiFetch 自动带 Bearer） */
  switchEnterprise: (enterpriseId: number) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  /**
   * 页面刷新时恢复登录态：从 sessionStorage 的 token 解析 JWT claims
   * 不请求后端 /auth/profile，保证 sub/enterpriseId 与 JWT 完全一致
   */
  checkProfile: async () => {
    const token = readStoredAccessToken();
    if (!token) {
      set({ user: null, isLoading: false, isAuthenticated: false });
      return;
    }
    const claims = readJwtAccessClaims(token);
    if (!claims?.sub) {
      // Token 无效或过期，清除全部 token
      clearAllTokens();
      set({ user: null, isLoading: false, isAuthenticated: false });
      return;
    }
    set({
      user: {
        sub: claims.sub,
        enterpriseId: claims.enterpriseId,
      },
      isLoading: false,
      isAuthenticated: true,
    });
  },

  login: async (input: LoginInput) => {
    const data = await loginApi(input);
    persistAccessToken(data.access_token);
    set({
      user: {
        sub: String(data.user.id),
        enterpriseId: data.enterprise?.id,
      },
      isLoading: false,
      isAuthenticated: true,
    });
  },

  register: async (input: RegisterInput) => {
    const data = await registerApi(input);
    persistAccessToken(data.accessToken);
    set({
      user: {
        sub: String(data.userId),
        enterpriseId: data.enterpriseId,
      },
      isLoading: false,
      isAuthenticated: true,
    });
  },

  logout: () => {
    clearAllTokens();
    set({ user: null, isLoading: false, isAuthenticated: false });
  },

  switchEnterprise: async (enterpriseId: number) => {
    const data = await switchEnterpriseApi(enterpriseId);
    persistAccessToken(data.access_token);
    if (data.refresh_token) {
      persistRefreshToken(data.refresh_token);
    }
    const claims = readJwtAccessClaims(data.access_token);
    if (!claims?.sub) {
      clearAllTokens();
      set({ user: null, isLoading: false, isAuthenticated: false });
      throw new Error("切换企业后 Token 无效");
    }
    set({
      user: {
        sub: claims.sub,
        enterpriseId: claims.enterpriseId,
      },
      isLoading: false,
      isAuthenticated: true,
    });
  },
}));
