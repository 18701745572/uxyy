"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAccountSubjects,
  createAccountSubject,
  updateAccountSubject,
  deleteAccountSubject,
  type AccountSubjectDto,
  type CreateAccountSubjectDto,
} from "@/lib/api/account-subjects";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiErrorCallout } from "@/components/ui/api-error-callout";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, PencilSimple, Trash } from "@/components/icons";

const selectCls =
  "rounded-md border border-border-primary bg-bg-secondary text-text-primary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all";

const categoryLabels: Record<string, string> = {
  asset: "资产",
  liability: "负债",
  equity: "权益",
  income: "收入",
  expense: "费用",
};

const categoryColors: Record<string, string> = {
  asset: "text-blue-600 bg-blue-50",
  liability: "text-red-600 bg-red-50",
  equity: "text-purple-600 bg-purple-50",
  income: "text-green-600 bg-green-50",
  expense: "text-orange-600 bg-orange-50",
};

// 扩展 AccountSubjectDto 类型，添加 children 字段用于树形结构
type AccountSubjectWithChildren = AccountSubjectDto & { children?: AccountSubjectDto[] };

export function AccountSubjectsPanel() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<AccountSubjectDto | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | "all">("all");

  const queryClient = useQueryClient();

  const { data: subjects, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["finance", "account-subjects"],
    queryFn: fetchAccountSubjects,
  });

  const createMutation = useMutation({
    mutationFn: createAccountSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "account-subjects"] });
      setIsCreateOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Parameters<typeof updateAccountSubject>[1];
    }) => updateAccountSubject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "account-subjects"] });
      setEditingSubject(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAccountSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "account-subjects"] });
    },
  });

  function handleDelete(subject: AccountSubjectDto) {
    if (confirm(`确定要删除科目「${subject.code} ${subject.name}」吗？`)) {
      deleteMutation.mutate(subject.id);
    }
  }

  // 构建科目树结构
  function buildSubjectTree(subjects: AccountSubjectDto[] | undefined): AccountSubjectWithChildren[] {
    if (!subjects) return [];
    const subjectMap = new Map<number, AccountSubjectWithChildren>(subjects.map((s) => [s.id, s as AccountSubjectWithChildren]));
    const roots: AccountSubjectWithChildren[] = [];

    subjects.forEach((subject) => {
      if (subject.parentId) {
        const parent = subjectMap.get(subject.parentId);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(subject);
        }
      } else {
        roots.push(subject as AccountSubjectWithChildren);
      }
    });

    return roots.sort((a, b) => a.code.localeCompare(b.code));
  }

  // 按类别筛选
  const filteredSubjects =
    selectedCategory === "all"
      ? subjects
      : subjects?.filter((s) => s.type === selectedCategory);

  const subjectTree = buildSubjectTree(filteredSubjects);

  function renderSubjectRow(
    subject: AccountSubjectWithChildren,
    level = 0,
  ) {
    return (
      <div key={subject.id}>
        <div
          className={`flex items-center justify-between py-3 px-4 hover:bg-bg-secondary ${
            level > 0 ? "border-l-2 border-border-primary ml-4" : "border-b border-border-secondary"
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                categoryColors[subject.type]
              }`}
            >
              {categoryLabels[subject.type]}
            </span>
            <div>
              <p className="font-medium text-text-primary">
                <span className="font-mono text-text-tertiary mr-2">{subject.code}</span>
                {subject.name}
              </p>
              <p className="text-xs text-text-tertiary">
                类型: {categoryLabels[subject.type]}
                {subject.isActive ? "" : " · 已停用"}
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingSubject(subject)}
            >
              <PencilSimple className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(subject)}
              disabled={deleteMutation.isPending}
              className="text-red-600 hover:text-red-700"
            >
              <Trash className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {subject.children?.map((child: AccountSubjectWithChildren) => renderSubjectRow(child, level + 1))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text-primary">会计科目管理</h1>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          新建科目
        </Button>
      </div>

      {/* 类别筛选 */}
      <Card className="p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-text-tertiary">类别:</span>
          {[
            { key: "all", label: "全部" },
            { key: "asset", label: "资产" },
            { key: "liability", label: "负债" },
            { key: "equity", label: "权益" },
            { key: "income", label: "收入" },
            { key: "expense", label: "费用" },
          ].map((cat) => (
            <Button
              key={cat.key}
              variant={selectedCategory === cat.key ? "primary" : "secondary"}
              size="sm"
              onClick={() => setSelectedCategory(cat.key)}
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </Card>

      {isError && (
        <ApiErrorCallout
          error={error}
          title="加载会计科目失败"
          onRetry={() => refetch()}
        />
      )}

      {isLoading ? (
        <div className="py-8 text-center text-text-tertiary">加载中...</div>
      ) : (
        <Card className="overflow-hidden">
          {subjectTree.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-4xl mb-3">📚</div>
              <p className="text-text-tertiary">暂无会计科目</p>
              <p className="text-sm text-text-muted mt-1">
                系统会自动初始化默认科目，您也可以手动创建
              </p>
              <Button onClick={() => setIsCreateOpen(true)} className="mt-4">
                创建第一个科目
              </Button>
            </div>
          ) : (
            <div>{subjectTree.map((subject) => renderSubjectRow(subject as AccountSubjectDto & { children?: AccountSubjectDto[] }))}</div>
          )}
        </Card>
      )}

      {/* 创建对话框 */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新建会计科目</DialogTitle>
          </DialogHeader>
          <AccountSubjectForm
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setIsCreateOpen(false)}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* 编辑对话框 */}
      <Dialog open={!!editingSubject} onOpenChange={() => setEditingSubject(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑会计科目</DialogTitle>
          </DialogHeader>
          {editingSubject && (
            <AccountSubjectForm
              initialData={editingSubject}
              onSubmit={(data) =>
                updateMutation.mutate({ id: editingSubject.id, data })
              }
              onCancel={() => setEditingSubject(null)}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AccountSubjectForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
}: {
  initialData?: AccountSubjectDto;
  onSubmit: (data: CreateAccountSubjectDto) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<CreateAccountSubjectDto>({
    code: initialData?.code ?? "",
    name: initialData?.name ?? "",
    type: initialData?.type ?? "asset",
    parentId: initialData?.parentId,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(formData);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="科目编码"
        value={formData.code}
        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
        placeholder="例如: 1001"
        required
      />

      <Input
        label="科目名称"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="例如: 库存现金"
        required
      />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text-secondary">科目类别</label>
        <select
          className={selectCls}
          value={formData.type}
          onChange={(e) =>
            setFormData({
              ...formData,
              type: e.target.value as CreateAccountSubjectDto["type"],
            })
          }
        >
          <option value="asset">资产</option>
          <option value="liability">负债</option>
          <option value="equity">权益</option>
          <option value="income">收入</option>
          <option value="expense">费用</option>
        </select>
      </div>

      <Input
        label="上级科目ID（可选）"
        type="number"
        value={formData.parentId ?? ""}
        onChange={(e) =>
          setFormData({
            ...formData,
            parentId: e.target.value ? parseInt(e.target.value) : undefined,
          })
        }
        placeholder="留空为一级科目"
      />

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" loading={isLoading}>
          {initialData ? "保存" : "创建"}
        </Button>
      </div>
    </form>
  );
}
