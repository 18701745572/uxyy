"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";
import { useEnterpriseStore } from "@/stores/enterprise-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Building, Users, Database, SignOut } from "@phosphor-icons/react";
import Link from "next/link";

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
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-purple/20 to-accent-blue/20 border border-accent-purple/30">
          <User className="w-5 h-5 text-accent-purple" weight="regular" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-text-primary">用户资料</h1>
          <p className="text-sm text-text-secondary">管理您的账号信息和企业关联</p>
        </div>
      </div>

      {/* 账号信息卡片 */}
      <Card className="bg-bg-secondary border-border-primary">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-blue/10">
            <User className="w-4 h-4 text-accent-blue" weight="regular" />
          </div>
          <h2 className="font-medium text-text-primary">账号信息</h2>
        </div>
        <div className="text-sm space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-border-primary">
            <span className="text-text-secondary">用户 ID</span>
            <span className="font-mono text-text-primary bg-bg-tertiary px-3 py-1 rounded-lg text-xs">
              {user?.sub ?? "-"}
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-text-secondary">当前企业 ID</span>
            <span className="font-mono text-text-primary bg-bg-tertiary px-3 py-1 rounded-lg text-xs">
              {user?.enterpriseId ?? "未绑定"}
            </span>
          </div>
        </div>
      </Card>

      {/* 企业列表卡片 */}
      <Card className="bg-bg-secondary border-border-primary">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-purple/10">
              <Building className="w-4 h-4 text-accent-purple" weight="regular" />
            </div>
            <h2 className="font-medium text-text-primary">企业列表</h2>
          </div>
          {isLoading && (
            <span className="text-xs text-text-muted flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse" />
              加载中…
            </span>
          )}
        </div>

        {enterprises.length === 0 && !isLoading ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center mx-auto mb-3">
              <Building className="w-6 h-6 text-text-muted" weight="regular" />
            </div>
            <p className="text-sm text-text-secondary">暂无关联企业</p>
          </div>
        ) : (
          <ul className="divide-y divide-border-primary">
            {enterprises.map((ent) => {
              const isCurrent = ent.id === user?.enterpriseId;
              return (
                <li
                  key={ent.id}
                  className="flex items-center justify-between py-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-text-primary truncate">
                        {ent.name}
                      </span>
                      {isCurrent && (
                        <Badge className="bg-accent-blue/20 text-accent-blue border-accent-blue/30 text-xs">
                          当前
                        </Badge>
                      )}
                      {ent.isDefault && (
                        <Badge className="bg-bg-tertiary text-text-secondary border-border-secondary text-xs">
                          默认
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-text-muted mt-1">
                      {ent.industry ?? "未分类"} · {ent.role}
                    </div>
                  </div>
                  {!isCurrent && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-4 h-8 px-3 border-border-secondary hover:border-accent-blue/50 hover:bg-accent-blue/5 transition-all duration-200"
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
                      {switchingId === ent.id ? (
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse" />
                          切换中…
                        </span>
                      ) : (
                        "切换"
                      )}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* 企业与成员卡片 */}
      <Card className="bg-bg-secondary border-border-primary">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10">
            <Users className="w-4 h-4 text-success" weight="regular" />
          </div>
          <h2 className="font-medium text-text-primary">企业与成员</h2>
        </div>
        <p className="text-sm text-text-secondary mb-4">
          老板或行政可将<strong className="text-text-primary">已注册</strong>手机号加入当前企业并分配角色。
        </p>
        <Button 
          variant="outline" 
          asChild
          className="h-9 px-4 border-border-secondary hover:border-success/50 hover:bg-success/5 transition-all duration-200"
        >
          <Link href="/dashboard/profile/enterprise-members" className="flex items-center gap-2">
            <Users className="w-4 h-4 text-text-tertiary" weight="regular" />
            <span className="text-text-secondary">企业成员管理</span>
          </Link>
        </Button>
      </Card>

      {/* 数据备份卡片 */}
      <Card className="bg-bg-secondary border-border-primary">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10">
            <Database className="w-4 h-4 text-warning" weight="regular" />
          </div>
          <h2 className="font-medium text-text-primary">数据备份</h2>
        </div>
        <p className="text-sm text-text-secondary mb-4">
          管理企业数据备份，确保数据安全。支持自动备份、手动备份和数据导出。
        </p>
        <Button 
          variant="outline" 
          asChild
          className="h-9 px-4 border-border-secondary hover:border-warning/50 hover:bg-warning/5 transition-all duration-200"
        >
          <Link href="/dashboard/profile/backup" className="flex items-center gap-2">
            <Database className="w-4 h-4 text-text-tertiary" weight="regular" />
            <span className="text-text-secondary">备份管理</span>
          </Link>
        </Button>
      </Card>

      {/* 退出登录 */}
      <div className="flex justify-end pt-4 border-t border-border-primary">
        <Button 
          variant="outline"
          onClick={logout}
          className="h-10 px-6 border-error/50 text-error hover:bg-error/10 hover:border-error transition-all duration-200"
        >
          <div className="flex items-center gap-2">
            <SignOut className="w-4 h-4" weight="regular" />
            <span>退出登录</span>
          </div>
        </Button>
      </div>
    </div>
  );
}
