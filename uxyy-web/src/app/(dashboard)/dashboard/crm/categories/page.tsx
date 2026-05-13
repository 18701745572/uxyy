"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchCustomerCategories,
  createCustomerCategory,
  updateCustomerCategory,
  deleteCustomerCategory,
  type CustomerCategoryResponseDto,
  type CustomerCategoryType,
  type CreateCustomerCategoryDto,
} from "@/lib/api/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, PencilSimple, Trash } from "@phosphor-icons/react";
import { useCrmCaps } from "@/lib/permissions/crm-capabilities";

const typeLabels: Record<CustomerCategoryType, string> = {
  status: "成交状态",
  industry: "行业",
  region: "区域",
  custom: "自定义",
};

const typeColors: Record<CustomerCategoryType, string> = {
  status: "bg-blue-100 text-blue-800",
  industry: "bg-green-100 text-green-800",
  region: "bg-orange-100 text-orange-800",
  custom: "bg-gray-100 text-gray-800",
};

export default function CategoriesPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">客户分类</h1>
      <CategoriesPanel />
    </div>
  );
}

function CategoriesPanel() {
  const crm = useCrmCaps();
  const [editing, setEditing] = useState<CustomerCategoryResponseDto | null>(null);
  const [creating, setCreating] = useState(false);

  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["crm", "categories"],
    queryFn: () => fetchCustomerCategories(),
  });

  const createM = useMutation({
    mutationFn: createCustomerCategory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "categories"] });
      setCreating(false);
    },
  });

  const updateM = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateCustomerCategoryDto }) =>
      updateCustomerCategory(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "categories"] });
      setEditing(null);
    },
  });

  const deleteM = useMutation({
    mutationFn: deleteCustomerCategory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "categories"] });
    },
  });

  useEffect(() => {
    if (!crm.write) {
      setCreating(false);
      setEditing(null);
    }
  }, [crm.write]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {crm.write ? (
          <Dialog open={creating} onOpenChange={setCreating}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                新增分类
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>新增客户分类</DialogTitle>
              </DialogHeader>
              <CategoryForm
                onSubmit={(data) => createM.mutate(data)}
                isSubmitting={createM.isPending}
              />
            </DialogContent>
          </Dialog>
        ) : (
          <p className="text-xs text-text-tertiary">仅查看；需要 crm:write 管理分类</p>
        )}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>分类名称</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>描述</TableHead>
              <TableHead>颜色</TableHead>
              <TableHead>排序</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  加载中...
                </TableCell>
              </TableRow>
            ) : q.data?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  暂无分类数据
                </TableCell>
              </TableRow>
            ) : (
              q.data?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge className={typeColors[item.type]}>
                      {typeLabels[item.type]}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.description || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-gray-500">{item.color}</span>
                    </div>
                  </TableCell>
                  <TableCell>{item.sortOrder}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {crm.write ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditing(item)}
                        >
                          <PencilSimple className="h-4 w-4" />
                        </Button>
                      ) : null}
                      {crm.delete ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm("确定删除该分类吗？")) {
                              deleteM.mutate(item.id);
                            }
                          }}
                        >
                          <Trash className="h-4 w-4 text-red-500" />
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={!!editing && crm.write}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑客户分类</DialogTitle>
          </DialogHeader>
          {editing && (
            <CategoryForm
              initialData={editing}
              onSubmit={(data) =>
                updateM.mutate({ id: editing.id, data })
              }
              isSubmitting={updateM.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryForm({
  initialData,
  onSubmit,
  isSubmitting,
}: {
  initialData?: CustomerCategoryResponseDto;
  onSubmit: (data: CreateCustomerCategoryDto) => void;
  isSubmitting: boolean;
}) {
  const [form, setForm] = useState<CreateCustomerCategoryDto>({
    name: initialData?.name || "",
    type: initialData?.type || "custom",
    description: initialData?.description || "",
    color: initialData?.color || "#1890ff",
    sortOrder: initialData?.sortOrder || 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>分类名称 *</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="输入分类名称"
          required
        />
      </div>
      <div>
        <Label>类型</Label>
        <Select
          value={form.type}
          onValueChange={(v) =>
            setForm({ ...form, type: v as CustomerCategoryType })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(typeLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>描述</Label>
        <Input
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="输入描述"
        />
      </div>
      <div>
        <Label>颜色</Label>
        <div className="flex items-center gap-2">
          <Input
            type="color"
            value={form.color}
            onChange={(e) => setForm({ ...form, color: e.target.value })}
            className="w-16 h-10 p-1"
          />
          <Input
            value={form.color}
            onChange={(e) => setForm({ ...form, color: e.target.value })}
            placeholder="#1890ff"
            className="flex-1"
          />
        </div>
      </div>
      <div>
        <Label>排序</Label>
        <Input
          type="number"
          value={form.sortOrder}
          onChange={(e) =>
            setForm({ ...form, sortOrder: Number(e.target.value) })
          }
          placeholder="输入排序号"
        />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "保存中..." : "保存"}
        </Button>
      </div>
    </form>
  );
}
