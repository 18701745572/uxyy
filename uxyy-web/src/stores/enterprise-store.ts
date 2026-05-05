"use client";

import { create } from "zustand";
import type { EnterpriseDto } from "@/lib/api/enterprises";
import { fetchEnterprises } from "@/lib/api/enterprises";

interface EnterpriseState {
  /** 用户所属企业列表 */
  enterprises: EnterpriseDto[];
  /** 是否正在加载 */
  isLoading: boolean;
  /** 拉取企业列表 */
  fetch: () => Promise<void>;
}

export const useEnterpriseStore = create<EnterpriseState>((set) => ({
  enterprises: [],
  isLoading: false,

  fetch: async () => {
    set({ isLoading: true });
    try {
      const enterprises = await fetchEnterprises();
      set({ enterprises, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
}));
