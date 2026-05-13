"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  fetchMembers,
  fetchMemberLevels,
  updateCustomerMember,
  deleteCustomerMember,
  addPoints,
  getMemberLevelColor,
  getPointsChangeTypeLabel,
  getPointsChangeTypeColor,
  type CustomerMemberResponseDto,
  type MemberLevelResponseDto,
  type AddPointsDto,
  type PointsChangeType,
} from "@/lib/api/crm";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiErrorCallout } from "@/components/ui/api-error-callout";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MagnifyingGlass, Plus, PencilSimple, Trash, Coins, ClockCounterClockwise } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export function MembersPanel() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<number | "all">("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [editingMember, setEditingMember] = useState<CustomerMemberResponseDto | null>(null);
  const [pointsMember, setPointsMember] = useState<CustomerMemberResponseDto | null>(null);
  const [viewingRecords, setViewingRecords] = useState<CustomerMemberResponseDto | null>(null);

  const queryClient = useQueryClient();

  const { data: members, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["crm", "members", page, selectedLevel, searchQuery],
    queryFn: () =>
      fetchMembers({
        page,
        pageSize,
        levelId: selectedLevel === "all" ? undefined : selectedLevel,
        search: searchQuery || undefined,
      }),
  });

  const { data: levels } = useQuery({
    queryKey: ["crm", "member-levels"],
    queryFn: fetchMemberLevels,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      customerId,
      data,
    }: {
      customerId: number;
      data: { levelId?: number; memberNo?: string; remark?: string };
    }) => updateCustomerMember(customerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "members"] });
      setEditingMember(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCustomerMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "members"] });
    },
  });

  const addPointsMutation = useMutation({
    mutationFn: addPoints,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "members"] });
      setPointsMember(null);
    },
  });

  function handleDelete(member: CustomerMemberResponseDto) {
    if (confirm(`确定要取消客户「${member.customerName}」的会员资格吗？`)) {
      deleteMutation.mutate(member.customerId);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">会员管理</h1>
          <p className="text-sm text-text-secondary mt-1">管理会员等级、积分、消费记录</p>
        </div>
        <Link href="/dashboard/crm/customers">
          <Button variant="secondary" className="gap-2">
            <Plus className="w-4 h-4" weight="regular" />
            为客户开通会员
          </Button>
        </Link>
      </div>

      {/* 筛选器 */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" weight="regular" />
              <input
                type="text"
                placeholder="搜索客户名称或卡号"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border-primary bg-bg-tertiary text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">等级:</span>
            <select
              className="text-sm rounded-lg border border-border-primary bg-bg-tertiary px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all"
              value={selectedLevel}
              onChange={(e) => {
                setSelectedLevel(e.target.value === "all" ? "all" : parseInt(e.target.value));
                setPage(1);
              }}
            >
              <option value="all">全部</option>
              {levels?.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {isError && (
        <ApiErrorCallout
          error={error}
          title="加载会员列表失败"
          onRetry={() => refetch()}
        />
      )}

      {isLoading ? (
        <div className="py-8 text-center text-text-secondary">加载中...</div>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-bg-tertiary">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-text-secondary">客户信息</th>
                    <th className="px-4 py-3 text-left font-medium text-text-secondary">会员等级</th>
                    <th className="px-4 py-3 text-left font-medium text-text-secondary">积分</th>
                    <th className="px-4 py-3 text-left font-medium text-text-secondary">消费统计</th>
                    <th className="px-4 py-3 text-left font-medium text-text-secondary">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-primary">
                  {members?.items.map((member) => (
                    <tr key={member.id} className="hover:bg-bg-tertiary/50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-text-primary">{member.customerName}</p>
                          <p className="text-xs text-text-muted">卡号: {member.memberNo || "-"}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {member.levelCode ? (
                          <span
                            className={cn(
                              "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border",
                              getMemberLevelColor(member.levelCode)
                            )}
                          >
                            {member.levelName}
                          </span>
                        ) : (
                          <span className="text-text-muted">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Coins className="w-4 h-4 text-warning" weight="regular" />
                          <span className="font-medium text-text-primary">{member.availablePoints}</span>
                          <span className="text-xs text-text-muted">
                            (累计 {member.totalPoints})
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs">
                          <p className="text-text-primary">
                            ¥{parseFloat(member.totalConsumption).toLocaleString()}
                          </p>
                          <p className="text-text-muted">{member.orderCount} 笔订单</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPointsMember(member)}
                            title="调整积分"
                          >
                            <Coins className="w-4 h-4 text-warning" weight="regular" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingRecords(member)}
                            title="积分记录"
                          >
                            <ClockCounterClockwise className="w-4 h-4" weight="regular" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingMember(member)}
                            title="编辑"
                          >
                            <PencilSimple className="w-4 h-4" weight="regular" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(member)}
                            disabled={deleteMutation.isPending}
                            title="取消会员"
                            className="text-error hover:text-error hover:bg-error/10"
                          >
                            <Trash className="w-4 h-4" weight="regular" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            {members && Math.ceil(members.total / members.pageSize) > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border-primary">
                <span className="text-sm text-text-muted">
                  共 {members.total} 条，第 {members.page} / {Math.ceil(members.total / members.pageSize)} 页
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    上一页
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(Math.ceil(members.total / members.pageSize), p + 1))}
                    disabled={page >= Math.ceil(members.total / members.pageSize)}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {members?.items.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent-blue/20 to-accent-purple/20 flex items-center justify-center">
                <Users className="w-8 h-8 text-text-secondary" weight="regular" />
              </div>
              <p className="text-text-secondary">暂无会员数据</p>
              <p className="text-sm text-text-muted mt-1">
                请先在客户列表中为客户开通会员资格
              </p>
              <Link href="/dashboard/crm/customers">
                <Button variant="secondary" className="mt-4">
                  前往客户列表
                </Button>
              </Link>
            </div>
          )}
        </>
      )}

      {/* 编辑会员对话框 */}
      <Dialog open={!!editingMember} onOpenChange={() => setEditingMember(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-text-primary">编辑会员信息</DialogTitle>
          </DialogHeader>
          {editingMember && (
            <EditMemberForm
              member={editingMember}
              levels={levels ?? []}
              onSubmit={(data) =>
                updateMutation.mutate({ customerId: editingMember.customerId, data })
              }
              onCancel={() => setEditingMember(null)}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 积分调整对话框 */}
      <Dialog open={!!pointsMember} onOpenChange={() => setPointsMember(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-text-primary">调整积分 - {pointsMember?.customerName}</DialogTitle>
          </DialogHeader>
          {pointsMember && (
            <AddPointsForm
              member={pointsMember}
              onSubmit={(data) => addPointsMutation.mutate(data)}
              onCancel={() => setPointsMember(null)}
              isLoading={addPointsMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 积分记录对话框 */}
      <Dialog open={!!viewingRecords} onOpenChange={() => setViewingRecords(null)}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-text-primary">积分记录 - {viewingRecords?.customerName}</DialogTitle>
          </DialogHeader>
          {viewingRecords && (
            <PointsRecordsPanel customerId={viewingRecords.customerId} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditMemberForm({
  member,
  levels,
  onSubmit,
  onCancel,
  isLoading,
}: {
  member: CustomerMemberResponseDto;
  levels: MemberLevelResponseDto[];
  onSubmit: (data: { levelId?: number; memberNo?: string; remark?: string }) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    levelId: member.levelId,
    memberNo: member.memberNo ?? "",
    remark: member.remark ?? "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      levelId: formData.levelId,
      memberNo: formData.memberNo || undefined,
      remark: formData.remark || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-secondary">会员等级</label>
        <select
          className="rounded-lg border border-border-primary bg-bg-tertiary px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all"
          value={formData.levelId ?? ""}
          onChange={(e) =>
            setFormData({
              ...formData,
              levelId: e.target.value ? parseInt(e.target.value) : undefined,
            })
          }
        >
          <option value="">请选择等级</option>
          {levels.map((level) => (
            <option key={level.id} value={level.id}>
              {level.name}
            </option>
          ))}
        </select>
      </div>

      <Input
        label="会员卡号"
        value={formData.memberNo}
        onChange={(e) => setFormData({ ...formData, memberNo: e.target.value })}
        placeholder="可选，留空自动生成"
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-secondary">备注</label>
        <textarea
          className="rounded-lg border border-border-primary bg-bg-tertiary px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all resize-none"
          rows={3}
          value={formData.remark}
          onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" loading={isLoading}>
          保存
        </Button>
      </div>
    </form>
  );
}

function AddPointsForm({
  member,
  onSubmit,
  onCancel,
  isLoading,
}: {
  member: CustomerMemberResponseDto;
  onSubmit: (data: AddPointsDto) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<{
    points: number;
    type: PointsChangeType;
    description: string;
  }>({
    points: 0,
    type: "adjust",
    description: "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      customerId: member.customerId,
      points: formData.points,
      type: formData.type,
      description: formData.description,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-accent-blue/10 border border-accent-blue/30 p-4 rounded-xl">
        <p className="text-sm text-text-muted">当前可用积分</p>
        <p className="text-2xl font-bold text-text-primary">{member.availablePoints}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-secondary">变动类型</label>
        <select
          className="rounded-lg border border-border-primary bg-bg-tertiary px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all"
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value as PointsChangeType })}
        >
          <option value="adjust">手动调整</option>
          <option value="earn">奖励积分</option>
          <option value="redeem">兑换消耗</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-secondary">
          变动积分（正数增加，负数减少）
        </label>
        <input
          type="number"
          className="rounded-lg border border-border-primary bg-bg-tertiary px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all"
          value={formData.points}
          onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
          required
        />
      </div>

      <Input
        label="变动说明"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        placeholder="例如：生日奖励、活动赠送、兑换商品等"
      />

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" loading={isLoading}>
          确认调整
        </Button>
      </div>
    </form>
  );
}

// 积分记录组件
import { fetchPointsRecords } from "@/lib/api/crm";
import { Users } from "@phosphor-icons/react";

function PointsRecordsPanel({ customerId }: { customerId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["crm", "points-records", customerId],
    queryFn: () => fetchPointsRecords(customerId),
  });

  if (isLoading) {
    return <div className="py-4 text-center text-text-secondary">加载中...</div>;
  }

  if (!data?.items.length) {
    return (
      <div className="py-8 text-center">
        <p className="text-text-secondary">暂无积分变动记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.items.map((record) => (
        <div
          key={record.id}
          className="flex items-start justify-between p-4 border border-border-primary bg-bg-tertiary/50 rounded-xl hover:bg-bg-tertiary transition-colors"
        >
          <div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded text-xs border",
                  getPointsChangeTypeColor(record.type)
                )}
              >
                {getPointsChangeTypeLabel(record.type)}
              </span>
              <span
                className={cn(
                  "font-medium",
                  record.points > 0 ? "text-success" : "text-warning"
                )}
              >
                {record.points > 0 ? "+" : ""}
                {record.points}
              </span>
            </div>
            {record.description && (
              <p className="text-sm text-text-secondary mt-1">{record.description}</p>
            )}
            <p className="text-xs text-text-muted mt-1">
              {new Date(record.createdAt).toLocaleString("zh-CN")}
            </p>
          </div>
          <div className="text-right text-xs text-text-muted">
            <p>变动前: {record.beforePoints}</p>
            <p>变动后: {record.afterPoints}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
