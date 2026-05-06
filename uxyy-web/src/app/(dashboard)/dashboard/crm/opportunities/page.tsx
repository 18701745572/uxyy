"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchOpportunities,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  type OpportunityResponseDto,
  type OpportunityStatus,
  type CreateOpportunityDto,
} from "@/lib/api/crm";
import {
  fetchCustomersAllPages,
  type CustomerResponseDto,
} from "@/lib/api/customers";
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
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Search, Plus, Edit, Trash2 } from "lucide-react";

const statusLabels: Record<OpportunityStatus, string> = {
  potential: "潜在",
  intention: "意向",
  quotation: "报价",
  deal: "成交",
  after_sales: "售后",
  lost: "流失",
};

const statusColors: Record<OpportunityStatus, string> = {
  potential: "bg-gray-100 text-gray-800",
  intention: "bg-blue-100 text-blue-800",
  quotation: "bg-yellow-100 text-yellow-800",
  deal: "bg-green-100 text-green-800",
  after_sales: "bg-purple-100 text-purple-800",
  lost: "bg-red-100 text-red-800",
};

export default function OpportunitiesPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">商机管理</h1>
      <OpportunitiesPanel />
    </div>
  );
}

function OpportunitiesPanel() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OpportunityStatus | undefined>(undefined);
  const [editing, setEditing] = useState<OpportunityResponseDto | null>(null);
  const [creating, setCreating] = useState(false);
  const pageSize = 10;

  const qc = useQueryClient();

  const queryKey = ["crm", "opportunities", page, pageSize, search, status];

  const q = useQuery({
    queryKey,
    queryFn: () =>
      fetchOpportunities({ page, pageSize, search, status }),
    placeholderData: (prev) => prev,
  });

  const customersQ = useQuery({
    queryKey: ["crm", "customers", "all-pages"],
    queryFn: () => fetchCustomersAllPages(),
  });

  const createM = useMutation({
    mutationFn: createOpportunity,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "opportunities"] });
      setCreating(false);
    },
  });

  const updateM = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateOpportunityDto }) =>
      updateOpportunity(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "opportunities"] });
      setEditing(null);
    },
  });

  const deleteM = useMutation({
    mutationFn: deleteOpportunity,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "opportunities"] });
    },
  });

  const totalPages = q.data ? Math.ceil(q.data.total / pageSize) : 0;

  return (
    <div className="space-y-4">
      {/* 筛选和搜索 */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索商机名称..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
        <Select
          value={status ?? "all"}
          onValueChange={(v) => {
            setStatus(v === "all" ? undefined : (v as OpportunityStatus));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            {Object.entries(statusLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              新增商机
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>新增商机</DialogTitle>
            </DialogHeader>
            <OpportunityForm
              customers={customersQ.data?.items || []}
              onSubmit={(data) => createM.mutate(data)}
              isSubmitting={createM.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* 数据表格 */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>商机名称</TableHead>
              <TableHead>客户</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>预计金额</TableHead>
              <TableHead>概率</TableHead>
              <TableHead>预计成交</TableHead>
              <TableHead>负责人</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  加载中...
                </TableCell>
              </TableRow>
            ) : q.data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  暂无商机数据
                </TableCell>
              </TableRow>
            ) : (
              q.data?.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.customerName || "-"}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[item.status]}>
                      {statusLabels[item.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.estimatedAmount
                      ? `¥${item.estimatedAmount.toLocaleString()}`
                      : "-"}
                  </TableCell>
                  <TableCell>{item.probability}%</TableCell>
                  <TableCell>
                    {item.expectedCloseAt
                      ? format(new Date(item.expectedCloseAt), "yyyy-MM-dd", {
                          locale: zhCN,
                        })
                      : "-"}
                  </TableCell>
                  <TableCell>{item.assignedTo || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm("确定删除该商机吗？")) {
                            deleteM.mutate(item.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            上一页
          </Button>
          <span className="flex items-center px-4">
            第 {page} / {totalPages} 页
          </span>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            下一页
          </Button>
        </div>
      )}

      {/* 编辑对话框 */}
      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑商机</DialogTitle>
          </DialogHeader>
          {editing && (
            <OpportunityForm
              customers={customersQ.data?.items || []}
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

function OpportunityForm({
  customers,
  initialData,
  onSubmit,
  isSubmitting,
}: {
  customers: CustomerResponseDto[];
  initialData?: OpportunityResponseDto;
  onSubmit: (data: CreateOpportunityDto) => void;
  isSubmitting: boolean;
}) {
  const [form, setForm] = useState<CreateOpportunityDto>({
    customerId: initialData?.customerId || 0,
    name: initialData?.name || "",
    description: initialData?.description || "",
    status: initialData?.status || "potential",
    estimatedAmount: initialData?.estimatedAmount,
    actualAmount: initialData?.actualAmount,
    expectedCloseAt: initialData?.expectedCloseAt?.slice(0, 10),
    actualCloseAt: initialData?.actualCloseAt?.slice(0, 10),
    assignedTo: initialData?.assignedTo,
    probability: initialData?.probability || 0,
    remark: initialData?.remark || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>关联客户 *</Label>
        <Select
          value={String(form.customerId)}
          onValueChange={(v) => setForm({ ...form, customerId: Number(v) })}
        >
          <SelectTrigger>
            <SelectValue placeholder="选择客户" />
          </SelectTrigger>
          <SelectContent>
            {customers.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>商机名称 *</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="输入商机名称"
          required
        />
      </div>
      <div>
        <Label>描述</Label>
        <Input
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="输入商机描述"
        />
      </div>
      <div>
        <Label>状态</Label>
        <Select
          value={form.status}
          onValueChange={(v) =>
            setForm({ ...form, status: v as OpportunityStatus })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(statusLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>预计金额</Label>
          <Input
            type="number"
            value={form.estimatedAmount || ""}
            onChange={(e) =>
              setForm({
                ...form,
                estimatedAmount: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
            placeholder="输入预计金额"
          />
        </div>
        <div>
          <Label>实际金额</Label>
          <Input
            type="number"
            value={form.actualAmount || ""}
            onChange={(e) =>
              setForm({
                ...form,
                actualAmount: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
            placeholder="输入实际金额"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>预计成交日期</Label>
          <Input
            type="date"
            value={form.expectedCloseAt || ""}
            onChange={(e) =>
              setForm({ ...form, expectedCloseAt: e.target.value })
            }
          />
        </div>
        <div>
          <Label>实际成交日期</Label>
          <Input
            type="date"
            value={form.actualCloseAt || ""}
            onChange={(e) =>
              setForm({ ...form, actualCloseAt: e.target.value })
            }
          />
        </div>
      </div>
      <div>
        <Label>成交概率 (%)</Label>
        <Input
          type="number"
          min={0}
          max={100}
          value={form.probability}
          onChange={(e) =>
            setForm({ ...form, probability: Number(e.target.value) })
          }
        />
      </div>
      <div>
        <Label>备注</Label>
        <Input
          value={form.remark}
          onChange={(e) => setForm({ ...form, remark: e.target.value })}
          placeholder="输入备注"
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
