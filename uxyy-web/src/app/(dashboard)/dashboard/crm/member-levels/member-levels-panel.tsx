"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchMemberLevels,
  createMemberLevel,
  updateMemberLevel,
  deleteMemberLevel,
  getMemberLevelLabel,
  getMemberLevelColor,
  type MemberLevelResponseDto,
  type CreateMemberLevelDto,
  type UpdateMemberLevelDto,
  type MemberLevelCode,
} from "@/lib/api/crm";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, NumberInput } from "@/components/ui/input";
import { ApiErrorCallout } from "@/components/ui/api-error-callout";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Crown, Plus, PencilSimple, Trash } from "@phosphor-icons/react";

const levelCodes: MemberLevelCode[] = ["bronze", "silver", "gold", "platinum", "diamond"];

export function MemberLevelsPanel() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<MemberLevelResponseDto | null>(null);

  const queryClient = useQueryClient();

  const { data: levels, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["crm", "member-levels"],
    queryFn: fetchMemberLevels,
  });

  const createMutation = useMutation({
    mutationFn: createMemberLevel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "member-levels"] });
      setIsCreateOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateMemberLevelDto }) =>
      updateMemberLevel(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "member-levels"] });
      setEditingLevel(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMemberLevel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "member-levels"] });
    },
  });

  function handleDelete(level: MemberLevelResponseDto) {
    if (confirm(`确定要删除会员等级「${level.name}」吗？`)) {
      deleteMutation.mutate(level.id);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text-primary">会员等级管理</h1>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" weight="regular" />
          新建等级
        </Button>
      </div>

      {isError && (
        <ApiErrorCallout
          error={error}
          title="加载会员等级失败"
          onRetry={() => refetch()}
        />
      )}

      {isLoading ? (
        <div className="py-8 text-center text-text-secondary">加载中...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {levels?.map((level) => (
            <Card key={level.id} className="p-4 bg-bg-secondary border-border-primary">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${getMemberLevelColor(
                      level.code,
                    )}`}
                  >
                    <Crown className="w-5 h-5" weight="regular" />
                  </div>
                  <div>
                    <h3 className="font-medium text-text-primary">{level.name}</h3>
                    <p className="text-xs text-text-secondary">
                      {getMemberLevelLabel(level.code)}
                      {level.isDefault && (
                        <span className="ml-2 text-accent-blue">(默认)</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingLevel(level)}
                  >
                    <PencilSimple className="w-4 h-4" weight="regular" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(level)}
                    disabled={deleteMutation.isPending}
                    className="text-error hover:text-error/80"
                  >
                    <Trash className="w-4 h-4" weight="regular" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">积分门槛</span>
                  <span className="font-medium text-text-primary">
                    {level.minPoints}
                    {level.maxPoints ? ` - ${level.maxPoints}` : "+"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">折扣率</span>
                  <span className="font-medium text-text-primary">{level.discountRate}%</span>
                </div>
                {level.benefits && level.benefits.length > 0 && (
                  <div className="pt-2 border-t border-border-primary">
                    <p className="text-xs text-text-tertiary mb-1">会员权益</p>
                    <div className="flex flex-wrap gap-1">
                      {level.benefits.map((benefit, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-0.5 bg-bg-tertiary text-text-secondary rounded-full"
                        >
                          {benefit}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 创建对话框 */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md bg-bg-secondary border-border-primary">
          <DialogHeader>
            <DialogTitle className="text-text-primary">新建会员等级</DialogTitle>
          </DialogHeader>
          <MemberLevelForm
            onSubmit={(data) => createMutation.mutate(data as CreateMemberLevelDto)}
            onCancel={() => setIsCreateOpen(false)}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* 编辑对话框 */}
      <Dialog open={!!editingLevel} onOpenChange={() => setEditingLevel(null)}>
        <DialogContent className="sm:max-w-md bg-bg-secondary border-border-primary">
          <DialogHeader>
            <DialogTitle className="text-text-primary">编辑会员等级</DialogTitle>
          </DialogHeader>
          {editingLevel && (
            <MemberLevelForm
              initialData={editingLevel}
              onSubmit={(data) =>
                updateMutation.mutate({ id: editingLevel.id, data })
              }
              onCancel={() => setEditingLevel(null)}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MemberLevelForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
}: {
  initialData?: MemberLevelResponseDto;
  onSubmit: (data: CreateMemberLevelDto | UpdateMemberLevelDto) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<CreateMemberLevelDto>({
    name: initialData?.name ?? "",
    code: initialData?.code ?? "bronze",
    minPoints: initialData?.minPoints ?? 0,
    maxPoints: initialData?.maxPoints,
    discountRate: initialData?.discountRate ?? "100",
    description: initialData?.description ?? "",
    benefits: initialData?.benefits ?? [],
    color: initialData?.color ?? "#1890ff",
    sortOrder: initialData?.sortOrder ?? 0,
    isDefault: initialData?.isDefault ?? false,
  });

  const [benefitInput, setBenefitInput] = useState("");

  function handleAddBenefit() {
    if (benefitInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        benefits: [...(prev.benefits ?? []), benefitInput.trim()],
      }));
      setBenefitInput("");
    }
  }

  function handleRemoveBenefit(index: number) {
    setFormData((prev) => ({
      ...prev,
      benefits: prev.benefits?.filter((_, i) => i !== index) ?? [],
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(formData);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="等级名称"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />
      <div>
        <label className="text-sm font-medium text-text-secondary">等级代码</label>
        <select
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value as MemberLevelCode })}
          className="mt-1 w-full rounded-lg border border-border-primary bg-bg-tertiary text-text-primary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
        >
          {levelCodes.map((code) => (
            <option key={code} value={code}>
              {getMemberLevelLabel(code)}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <NumberInput
          label="最小积分"
          value={formData.minPoints}
          onChange={(e) => setFormData({ ...formData, minPoints: Number(e.target.value) })}
          min={0}
          step={100}
          required
        />
        <NumberInput
          label="最大积分"
          value={formData.maxPoints ?? ""}
          onChange={(e) =>
            setFormData({
              ...formData,
              maxPoints: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          placeholder="无上限"
          min={0}
          step={100}
        />
      </div>
      <NumberInput
        label="折扣率 (%)"
        value={formData.discountRate}
        onChange={(e) => setFormData({ ...formData, discountRate: e.target.value })}
        min={0}
        max={100}
        step={1}
        required
      />
      <div>
        <label className="text-sm font-medium text-text-secondary">权益标签</label>
        <div className="flex gap-2 mt-1">
          <input
            type="text"
            value={benefitInput}
            onChange={(e) => setBenefitInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddBenefit();
              }
            }}
            placeholder="输入权益按回车添加"
            className="flex-1 rounded-lg border border-border-primary bg-bg-tertiary text-text-primary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
          />
          <Button type="button" variant="secondary" onClick={handleAddBenefit}>
            添加
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {formData.benefits?.map((benefit, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-2 py-1 bg-bg-tertiary text-text-secondary rounded-full text-xs"
            >
              {benefit}
              <button
                type="button"
                onClick={() => handleRemoveBenefit(idx)}
                className="text-text-muted hover:text-text-primary"
              >
                ×
              </button>
            </span>
          ))}
        </div>
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
