"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";
import { useEnterpriseStore } from "@/stores/enterprise-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const switchEnterprise = useAuthStore((s) => s.switchEnterprise);
  const { enterprises, isLoading, fetch: fetchEnterprises } = useEnterpriseStore();
  const [switchingId, setSwitchingId] = useState<number | null>(null);

  useEffect(() => {
    void fetchEnterprises();
  }, [fetchEnterprises]);

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <h1 className="text-lg font-semibold text-zinc-900">用户资料</h1>

      <Card>
        <h2 className="font-medium text-zinc-900 mb-3">账号信息</h2>
        <div className="text-sm text-zinc-600 space-y-2">
          <div className="flex justify-between">
            <span>用户 ID</span>
            <span className="font-mono text-zinc-900">{user?.sub ?? "-"}</span>
          </div>
          <div className="flex justify-between">
            <span>当前企业 ID</span>
            <span className="font-mono text-zinc-900">
              {user?.enterpriseId ?? "未绑定"}
            </span>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-zinc-900">企业列表</h2>
          {isLoading && <span className="text-xs text-zinc-400">加载中…</span>}
        </div>

        {enterprises.length === 0 && !isLoading ? (
          <p className="text-sm text-zinc-500">暂无关联企业</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {enterprises.map((ent) => {
              const isCurrent = ent.id === user?.enterpriseId;
              return (
                <li
                  key={ent.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-900">
                        {ent.name}
                      </span>
                      {isCurrent && (
                        <span className="text-xs rounded-full bg-zinc-900 text-white px-2 py-0.5">
                          当前
                        </span>
                      )}
                      {ent.isDefault && (
                        <span className="text-xs rounded-full bg-zinc-100 text-zinc-600 px-2 py-0.5">
                          默认
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {ent.industry ?? "未分类"} · {ent.role}
                    </div>
                  </div>
                  {!isCurrent && (
                    <Button
                      variant="secondary"
                      className="text-xs px-2.5 py-1"
                      disabled={switchingId != null}
                      onClick={() => {
                        void (async () => {
                          setSwitchingId(ent.id);
                          try {
                            await switchEnterprise(ent.id);
                            await fetchEnterprises();
                            await queryClient.invalidateQueries();
                            toast.success("已切换企业");
                          } catch (err) {
                            const message =
                              err instanceof ApiError
                                ? err.message
                                : err instanceof Error
                                  ? err.message
                                  : "切换失败";
                            toast.error(message);
                          } finally {
                            setSwitchingId(null);
                          }
                        })();
                      }}
                    >
                      {switchingId === ent.id ? "切换中…" : "切换"}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <div className="flex justify-end">
        <Button variant="danger" onClick={logout}>
          退出登录
        </Button>
      </div>
    </div>
  );
}
