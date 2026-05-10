import { useMemo } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { Permission } from "./role-matrix";

export interface CrmUiCaps {
  read: boolean;
  write: boolean;
  delete: boolean;
}

export function getCrmCaps(permissions: readonly string[]): CrmUiCaps {
  const s = new Set(permissions);
  return {
    read: s.has(Permission.CRM_READ),
    write: s.has(Permission.CRM_WRITE),
    delete: s.has(Permission.CRM_DELETE),
  };
}

/** 与各面板「写」「删」操作对齐的前端守卫（应与后端 `@Permissions(CRM_*)` 逐步收紧保持一致） */
export function useCrmCaps(): CrmUiCaps {
  const permissions = useAuthStore((st) => st.permissions);
  return useMemo(() => getCrmCaps(permissions), [permissions]);
}
