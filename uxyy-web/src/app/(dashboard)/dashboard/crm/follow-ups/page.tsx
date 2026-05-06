"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchFollowUpRecords,
  createFollowUpRecord,
  updateFollowUpRecord,
  deleteFollowUpRecord,
  type FollowUpRecordResponseDto,
  type FollowUpType,
  type CreateFollowUpDto,
} from "@/lib/api/crm";
import { fetchCustomersAllPages } from "@/lib/api/customers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Edit, Trash2, MessageSquare } from "lucide-react";

const typeLabels: Record<FollowUpType, string> = {
  text: "文本",
  image: "图片",
  voice: "语音",
  file: "文件",
};

const typeColors: Record<FollowUpType, string> = {
  text: "bg-blue-100 text-blue-800",
  image: "bg-green-100 text-green-800",
  voice: "bg-purple-100 text-purple-800",
  file: "bg-orange-100 text-orange-800",
};

export default function FollowUpsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">跟进记录</h1>
      <FollowUpsPanel />
    </div>
  );
}

function FollowUpsPanel() {
  const [page, setPage] = useState(1);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [editing, setEditing] = useState<FollowUpRecordResponseDto | null>(null);
  const [creating, setCreating] = useState(false);
  const pageSize = 10;

  const qc = useQueryClient();

  const customersQ = useQuery({
    queryKey: ["crm", "customers", "all-pages"],
    queryFn: () => fetchCustomersAllPages(),
  });

  const q = useQuery({
    queryKey: ["crm", "follow-ups", selectedCustomerId, page, pageSize],
    queryFn: () =>
      selectedCustomerId
        ? fetchFollowUpRecords(selectedCustomerId, { page, pageSize })
        : Promise.resolve({ items: [], total: 0, page: 1, pageSize }),
    enabled: !!selectedCustomerId,
  });

  const createM = useMutation({
    mutationFn: (data: { customerId: number; dto: CreateFollowUpDto }) =>
      createFollowUpRecord(data.customerId, data.dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "follow-ups"] });
      setCreating(false);
    },
  });

  const updateM = useMutation({
    mutationFn: (data: {
      customerId: number;
      followUpId: number;
      dto: CreateFollowUpDto;
    }) => updateFollowUpRecord(data.customerId, data.followUpId, data.dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "follow-ups"] });
      setEditing(null);
    },
  });

  const deleteM = useMutation({
    mutationFn: (data: { customerId: number; followUpId: number }) =>
      deleteFollowUpRecord(data.customerId, data.followUpId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "follow-ups"] });
    },
  });

  const totalPages = q.data ? Math.ceil(q.data.total / pageSize) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <Label>选择客户</Label>
          <Select
            value={selectedCustomerId ? String(selectedCustomerId) : ""}
            onValueChange={(v) => {
              setSelectedCustomerId(Number(v));
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择客户查看跟进记录" />
            </SelectTrigger>
            <SelectContent>
              {customersQ.data?.items.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedCustomerId && (
          <Dialog open={creating} onOpenChange={setCreating}>
            <DialogTrigger asChild>
              <Button className="gap-2 mt-6">
                <Plus className="h-4 w-4" />
                新增跟进
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>新增跟进记录</DialogTitle>
              </DialogHeader>
              <FollowUpForm
                onSubmit={(data) =>
                  createM.mutate({ customerId: selectedCustomerId, dto: data })
                }
                isSubmitting={createM.isPending}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!selectedCustomerId ? (
        <div className="text-center py-12 text-gray-500">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>请先选择客户查看跟进记录</p>
        </div>
      ) : (
        <>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>类型</TableHead>
                  <TableHead>内容</TableHead>
                  <TableHead>下次跟进</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : q.data?.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      暂无跟进记录
                    </TableCell>
                  </TableRow>
                ) : (
                  q.data?.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge className={typeColors[item.type]}>
                          {typeLabels[item.type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {item.content}
                      </TableCell>
                      <TableCell>
                        {item.nextFollowUpAt
                          ? format(new Date(item.nextFollowUpAt), "yyyy-MM-dd", {
                              locale: zhCN,
                            })
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {format(new Date(item.createdAt), "yyyy-MM-dd HH:mm", {
                          locale: zhCN,
                        })}
                      </TableCell>
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
                              if (confirm("确定删除该跟进记录吗？")) {
                                deleteM.mutate({
                                  customerId: item.customerId,
                                  followUpId: item.id,
                                });
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
        </>
      )}

      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑跟进记录</DialogTitle>
          </DialogHeader>
          {editing && (
            <FollowUpForm
              initialData={editing}
              onSubmit={(data) =>
                updateM.mutate({
                  customerId: editing.customerId,
                  followUpId: editing.id,
                  dto: data,
                })
              }
              isSubmitting={updateM.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FollowUpForm({
  initialData,
  onSubmit,
  isSubmitting,
}: {
  initialData?: FollowUpRecordResponseDto;
  onSubmit: (data: CreateFollowUpDto) => void;
  isSubmitting: boolean;
}) {
  const [form, setForm] = useState<CreateFollowUpDto>({
    content: initialData?.content || "",
    type: initialData?.type || "text",
    attachmentUrls: initialData?.attachmentUrls || [],
    nextFollowUpAt: initialData?.nextFollowUpAt?.slice(0, 16),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>类型</Label>
        <Select
          value={form.type}
          onValueChange={(v) => setForm({ ...form, type: v as FollowUpType })}
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
        <Label>内容 *</Label>
        <Textarea
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          placeholder="输入跟进内容"
          required
          rows={4}
        />
      </div>
      <div>
        <Label>下次跟进时间</Label>
        <Input
          type="datetime-local"
          value={form.nextFollowUpAt || ""}
          onChange={(e) =>
            setForm({ ...form, nextFollowUpAt: e.target.value })
          }
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
