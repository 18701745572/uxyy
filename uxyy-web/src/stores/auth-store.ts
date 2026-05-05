"use client";

import { create } from "zustand";
import type { LoginInput, RegisterInput, ProfilePayload } from "@uxyy/shared";
import { login as loginApi, register as registerApi, fetchProfile } from "@/lib/api/auth";
import {
  readStoredAccessToken,
  persistAccessToken,
  clearStoredAccessToken,
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
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  checkProfile: async () => {
    const token = readStoredAccessToken();
    if (!token) {
      set({ user: null, isLoading: false, isAuthenticated: false });
      return;
    }
    try {
      const profile = await fetchProfile();
      set({ user: profile, isLoading: false, isAuthenticated: true });
    } catch {
      clearStoredAccessToken();
      set({ user: null, isLoading: false, isAuthenticated: false });
    }
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
    clearStoredAccessToken();
    set({ user: null, isLoading: false, isAuthenticated: false });
  },
}));
